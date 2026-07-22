import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = process.env.GAIA_WEBHOOK_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, erro: "GAIA_WEBHOOK_TOKEN não configurado no Vercel" },
      { status: 500 },
    );
  }

  let empresa: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.empresa === "string" && body.empresa.trim()) {
      empresa = body.empresa.trim();
    }
  } catch {
    empresa = undefined;
  }

  try {
    const resposta = await fetch("https://prlguima.app.n8n.cloud/webhook/gaia-processar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gaia-token": token,
      },
      body: JSON.stringify({ origem: "copiloto", quando: new Date().toISOString(), empresa }),
      cache: "no-store",
    });

    if (!resposta.ok) {
      return NextResponse.json(
        { ok: false, erro: `GAIA respondeu com status ${resposta.status}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, erro: "Não foi possível falar com a GAIA" },
      { status: 502 },
    );
  }
}
