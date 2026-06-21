export const IMPORT_STAGES = ["prospectivo", "contato", "visita", "analise", "proposta", "cliente"] as const;
export type ImportStage = (typeof IMPORT_STAGES)[number];

export type ImportedCompany = {
  empresa: string;
  cnpj: string;
  etapa: ImportStage;
  proximaAcao: string;
  dataProximaAcao: string;
  observacoes: string;
  dossie: string;
};

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formattedCnpj(value: string) {
  const raw = digits(value);
  if (raw.length !== 14) return value.trim();
  return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function normalizedDate(value: string) {
  const trimmed = value.trim();
  const brDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brDate) return `${brDate[3]}-${brDate[2]}-${brDate[1]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function stage(value: string): ImportStage {
  const candidate = normalized(value)
    .replace(/^em\s+/, "")
    .replace("analise", "analise")
    .replace("prospecto", "prospectivo")
    .replace("contato realizado", "contato");
  return IMPORT_STAGES.includes(candidate as ImportStage) ? (candidate as ImportStage) : "prospectivo";
}

function findColumn(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));
}

function cell(row: string[], index: number) {
  return index >= 0 ? (row[index] || "").trim() : "";
}

export function companiesFromRows(rows: string[][]): ImportedCompany[] {
  const cleaned = rows
    .map((row) => row.map((value) => String(value ?? "").trim()))
    .filter((row) => row.some(Boolean));
  if (!cleaned.length) return [];

  const headers = cleaned[0].map(normalized);
  const indexes = {
    empresa: findColumn(headers, ["empresa", "razao social", "nome empresarial", "nome fantasia"]),
    cnpj: findColumn(headers, ["cnpj"]),
    etapa: findColumn(headers, ["etapa", "status", "fase"]),
    proximaAcao: findColumn(headers, ["proxima acao", "acao", "atividade"]),
    dataProximaAcao: findColumn(headers, ["data da proxima", "data proxima", "prazo", "data"]),
    observacoes: findColumn(headers, ["observacao", "anotacao", "contexto"]),
  };
  const hasHeaders = indexes.cnpj >= 0 || indexes.empresa >= 0;
  const dataRows = hasHeaders ? cleaned.slice(1) : cleaned;

  const companies = dataRows.flatMap((row) => {
    let cnpj = cell(row, indexes.cnpj);
    let empresa = cell(row, indexes.empresa);

    if (!hasHeaders) {
      const cnpjIndex = row.findIndex((value) => digits(value).length === 14);
      cnpj = cell(row, cnpjIndex);
      empresa = row.find((value, index) => index !== cnpjIndex && value.trim())?.trim() || "";
    } else if (digits(cnpj).length !== 14) {
      const fallbackCnpjIndex = row.findIndex((value) => digits(value).length === 14);
      if (fallbackCnpjIndex >= 0) {
        cnpj = cell(row, fallbackCnpjIndex);
        if (digits(empresa).length === 14) empresa = "";
      }
    }

    const rawCnpj = digits(cnpj);
    if (!empresa && rawCnpj.length === 14) empresa = `CNPJ ${formattedCnpj(rawCnpj)}`;
    if (!empresa && !cnpj) return [];

    return [{
      empresa: empresa || "Empresa a qualificar",
      cnpj: formattedCnpj(cnpj),
      etapa: stage(cell(row, indexes.etapa)),
      proximaAcao: cell(row, indexes.proximaAcao) || "Qualificar empresa",
      dataProximaAcao: normalizedDate(cell(row, indexes.dataProximaAcao)),
      observacoes: cell(row, indexes.observacoes),
      dossie: "",
    } satisfies ImportedCompany];
  });

  const unique = new Map<string, ImportedCompany>();
  for (const company of companies) {
    const key = digits(company.cnpj) || normalized(company.empresa);
    if (key) unique.set(key, company);
  }
  return [...unique.values()];
}

export function rowsFromPastedList(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.split(/[;\t]/).map((cellValue) => cellValue.trim()))
    .filter((row) => row.some(Boolean));
}
