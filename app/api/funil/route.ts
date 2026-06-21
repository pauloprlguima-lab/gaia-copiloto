import { NextResponse } from "next/server";
import {
  findExistingEntry,
  isCloudFunnelConfigured,
  isFunnelAuthorized,
  normalizeFunnelEntry,
  readFunnelEntries,
  writeFunnelEntries,
  type FunnelEntry,
  type FunnelStage,
} from "@/lib/funil";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "Acesso não autorizado ao Funil GAIA." }, { status: 401 });
}

function notConfigured() {
  return NextResponse.json(
    { error: "O armazenamento em nuvem do Funil GAIA ainda não foi configurado." },
    { status: 503 },
  );
}

function storageError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "Não foi possível acessar o Funil GAIA agora." }, { status: 502 });
}

export async function GET(request: Request) {
  if (!isFunnelAuthorized(request)) return unauthorized();
  if (!isCloudFunnelConfigured()) return notConfigured();

  try {
    const url = new URL(request.url);
    const busca = (url.searchParams.get("busca") || "").trim().toLocaleLowerCase("pt-BR");
    const etapa = (url.searchParams.get("etapa") || "") as FunnelStage | "";
    const entries = await readFunnelEntries();
    const filtered = entries.filter((entry) => {
      const matchesStage = !etapa || entry.etapa === etapa;
      const matchesSearch = !busca || [entry.empresa, entry.cnpj, entry.proximaAcao, entry.observacoes]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(busca);
      return matchesStage && matchesSearch;
    });

    return NextResponse.json({ entries: filtered, total: filtered.length, cloud: true });
  } catch (error) {
    return storageError(error);
  }
}

export async function POST(request: Request) {
  if (!isFunnelAuthorized(request)) return unauthorized();
  if (!isCloudFunnelConfigured()) return notConfigured();

  try {
    const body = await request.json();
    const entries = await readFunnelEntries();
    const preliminary = normalizeFunnelEntry(body);
    const existing = findExistingEntry(entries, preliminary);
    const entry = normalizeFunnelEntry(body, existing);
    const next = existing
      ? entries.map((item) => item.id === existing.id ? entry : item)
      : [...entries, entry];
    await writeFunnelEntries(next);
    return NextResponse.json({ entry, created: !existing });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPRESA_REQUIRED") {
      return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
    }
    return storageError(error);
  }
}

export async function PUT(request: Request) {
  if (!isFunnelAuthorized(request)) return unauthorized();
  if (!isCloudFunnelConfigured()) return notConfigured();

  try {
    const body = (await request.json()) as { entries?: unknown[] };
    if (!Array.isArray(body.entries)) {
      return NextResponse.json({ error: "Envie a lista de empresas do funil." }, { status: 400 });
    }
    const entries = body.entries.map((entry) => normalizeFunnelEntry(entry)) as FunnelEntry[];
    await writeFunnelEntries(entries);
    return NextResponse.json({ entries, total: entries.length, cloud: true });
  } catch (error) {
    return storageError(error);
  }
}

export async function DELETE(request: Request) {
  if (!isFunnelAuthorized(request)) return unauthorized();
  if (!isCloudFunnelConfigured()) return notConfigured();

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Informe o identificador da empresa." }, { status: 400 });
    const entries = await readFunnelEntries();
    const next = entries.filter((entry) => entry.id !== id);
    if (next.length === entries.length) {
      return NextResponse.json({ error: "Empresa não encontrada no funil." }, { status: 404 });
    }
    await writeFunnelEntries(next);
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    return storageError(error);
  }
}
