import { timingSafeEqual } from "node:crypto";

export const FUNNEL_STAGES = ["prospectivo", "contato", "visita", "analise", "proposta", "cliente"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export type FunnelEntry = {
  id: string;
  empresa: string;
  cnpj: string;
  etapa: FunnelStage;
  proximaAcao: string;
  dataProximaAcao: string;
  observacoes: string;
  dossie: string;
  criadoEm: string;
  atualizadoEm: string;
};

const REDIS_KEY = "gaia:funil:operacoes:v1";
const MAX_ENTRIES = 500;

function credentials() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  };
}

export function isCloudFunnelConfigured() {
  const { url, token } = credentials();
  return Boolean(url && token);
}

function secureEqual(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function isFunnelAuthorized(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const pin = request.headers.get("x-gaia-pin");

  return secureEqual(bearer, process.env.GAIA_ACTION_API_KEY) || secureEqual(pin, process.env.GAIA_FUNIL_PIN);
}

async function redisCommand(command: Array<string>) {
  const { url, token } = credentials();
  if (!url || !token) throw new Error("FUNIL_NOT_CONFIGURED");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("FUNIL_STORAGE_UNAVAILABLE");
  const data = (await response.json()) as { result?: unknown; error?: string };
  if (data.error) throw new Error("FUNIL_STORAGE_UNAVAILABLE");
  return data.result;
}

export async function readFunnelEntries(): Promise<FunnelEntry[]> {
  const result = await redisCommand(["GET", REDIS_KEY]);
  if (typeof result !== "string" || !result) return [];

  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

export async function writeFunnelEntries(entries: FunnelEntry[]) {
  if (entries.length > MAX_ENTRIES) throw new Error("FUNIL_LIMIT_EXCEEDED");
  await redisCommand(["SET", REDIS_KEY, JSON.stringify(entries)]);
}

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function stage(value: unknown): FunnelStage {
  return FUNNEL_STAGES.includes(value as FunnelStage) ? (value as FunnelStage) : "prospectivo";
}

export function normalizeFunnelEntry(value: unknown, previous?: FunnelEntry): FunnelEntry {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const now = new Date().toISOString();
  const empresa = text(source.empresa, 180);
  if (!empresa) throw new Error("EMPRESA_REQUIRED");

  return {
    id: text(source.id, 100) || previous?.id || crypto.randomUUID(),
    empresa,
    cnpj: text(source.cnpj, 24),
    etapa: stage(source.etapa),
    proximaAcao: text(source.proximaAcao, 500),
    dataProximaAcao: text(source.dataProximaAcao, 10),
    observacoes: text(source.observacoes, 5000),
    dossie: text(source.dossie, 30000),
    criadoEm: previous?.criadoEm || text(source.criadoEm, 40) || now,
    atualizadoEm: now,
  };
}

export function findExistingEntry(entries: FunnelEntry[], candidate: FunnelEntry) {
  const cnpj = candidate.cnpj.replace(/\D/g, "");
  return entries.find((entry) => {
    if (entry.id === candidate.id) return true;
    if (cnpj && entry.cnpj.replace(/\D/g, "") === cnpj) return true;
    return entry.empresa.toLocaleLowerCase("pt-BR") === candidate.empresa.toLocaleLowerCase("pt-BR");
  });
}
