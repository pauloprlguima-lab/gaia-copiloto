const CNPJ_PUBLIC_API = "https://publica.cnpj.ws/cnpj";

type UnknownRecord = Record<string, unknown>;

export type EmpresaPublica = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string;
  dataSituacaoCadastral: string | null;
  dataInicioAtividade: string | null;
  porte: string | null;
  naturezaJuridica: string | null;
  capitalSocial: number | null;
  atividadePrincipal: string | null;
  atividadesSecundarias: string[];
  endereco: {
    logradouro: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    cep: string | null;
  };
  canaisOficiais: {
    telefones: string[];
    email: string | null;
  };
  socios: Array<{
    nome: string;
    tipo: string | null;
    qualificacao: string | null;
  }>;
  fonte: {
    nome: string;
    url: string;
    consultadoEm: string;
    atualizadoEm: string | null;
  };
  aviso: string;
};

export class CnpjApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function description(value: unknown): string | null {
  return asText(asRecord(value).descricao);
}

function formatPhone(ddd: unknown, number: unknown): string | null {
  const digits = `${asText(ddd) ?? ""}${asText(number) ?? ""}`.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.length === 11
    ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    : `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

function formatAddress(establishment: UnknownRecord) {
  const street = [
    asText(establishment.tipo_logradouro),
    asText(establishment.logradouro),
    asText(establishment.numero),
    asText(establishment.complemento),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    logradouro: street || null,
    bairro: asText(establishment.bairro),
    cidade: asText(asRecord(establishment.cidade).nome),
    estado: asText(asRecord(establishment.estado).sigla),
    cep: asText(establishment.cep),
  };
}

export function cleanCnpj(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCnpj(value: string) {
  const digits = cleanCnpj(value);
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function isValidCnpj(value: string) {
  const digits = cleanCnpj(value);
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const calculateDigit = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculateDigit(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digits.endsWith(`${first}${second}`);
}

export function extractCnpj(text: string) {
  const candidates = text.match(/\d[\d.\/-]{12,18}\d/g) ?? [];
  return candidates.map(cleanCnpj).find(isValidCnpj) ?? null;
}

export async function consultPublicCompany(cnpj: string): Promise<EmpresaPublica> {
  const digits = cleanCnpj(cnpj);
  if (!isValidCnpj(digits)) {
    throw new CnpjApiError("Informe um CNPJ válido com 14 dígitos.", 400);
  }

  const response = await fetch(`${CNPJ_PUBLIC_API}/${digits}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (response.status === 404) {
    throw new CnpjApiError("CNPJ não encontrado na base pública.", 404);
  }
  if (response.status === 429) {
    throw new CnpjApiError("Limite temporário da consulta pública atingido. Tente novamente em um minuto.", 429);
  }
  if (!response.ok) {
    throw new CnpjApiError("A base pública de CNPJ está indisponível no momento.", 502);
  }

  const raw = asRecord(await response.json());
  const establishment = asRecord(raw.estabelecimento);
  const primaryActivity = asRecord(establishment.atividade_principal);
  const secondaryActivities = Array.isArray(establishment.atividades_secundarias)
    ? establishment.atividades_secundarias
    : [];
  const partners = Array.isArray(raw.socios) ? raw.socios : [];
  const phones = [
    formatPhone(establishment.ddd1, establishment.telefone1),
    formatPhone(establishment.ddd2, establishment.telefone2),
  ].filter((phone): phone is string => Boolean(phone));

  return {
    cnpj: formatCnpj(digits),
    razaoSocial: asText(raw.razao_social) ?? "Não informado",
    nomeFantasia: asText(establishment.nome_fantasia),
    situacaoCadastral: asText(establishment.situacao_cadastral) ?? "Não informada",
    dataSituacaoCadastral: asText(establishment.data_situacao_cadastral),
    dataInicioAtividade: asText(establishment.data_inicio_atividade),
    porte: description(raw.porte),
    naturezaJuridica: description(raw.natureza_juridica),
    capitalSocial: typeof raw.capital_social === "number" ? raw.capital_social : null,
    atividadePrincipal: asText(primaryActivity.descricao),
    atividadesSecundarias: secondaryActivities
      .map((item) => description(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, 8),
    endereco: formatAddress(establishment),
    canaisOficiais: {
      telefones: [...new Set(phones)],
      email: asText(establishment.email)?.toLowerCase() ?? null,
    },
    socios: partners
      .map((item) => {
        const partner = asRecord(item);
        return {
          nome: asText(partner.nome) ?? "Não informado",
          tipo: asText(partner.tipo),
          qualificacao: description(partner.qualificacao_socio),
        };
      })
      .slice(0, 30),
    fonte: {
      nome: "CNPJ.ws - API Pública",
      url: `${CNPJ_PUBLIC_API}/${digits}`,
      consultadoEm: new Date().toISOString(),
      atualizadoEm: asText(raw.atualizado_em) ?? asText(establishment.atualizado_em),
    },
    aviso: "Dados cadastrais públicos. Telefones e e-mail são canais declarados pela empresa; confirme antes do contato.",
  };
}

export function companyDataForPrompt(company: EmpresaPublica) {
  return `DADOS PÚBLICOS CONSULTADOS POR CNPJ
${JSON.stringify(company, null, 2)}

REGRAS PARA ESTA ANÁLISE:
- Trate os campos acima como dados cadastrais da fonte indicada.
- Não transforme capital social em faturamento nem em limite de crédito.
- Não atribua função financeira a um sócio sem fonte específica.
- Use somente os canais oficiais retornados. Não sugira telefone pessoal ou WhatsApp privado.
- Cite a fonte e separe fatos, hipóteses comerciais e itens a confirmar.`;
}
