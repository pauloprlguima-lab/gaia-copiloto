import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { empresa, texto } = await request.json();

    if (!texto || !String(texto).trim()) {
      return NextResponse.json(
        { ok: false, message: "Cole o texto do perfil antes de enviar." },
        { status: 400 }
      );
    }

    const resposta = await fetch(
      "https://prlguima.app.n8n.cloud/webhook/gaia-colar",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gaia-token": process.env.GAIA_WEBHOOK_TOKEN ?? "",
        },
        body: JSON.stringify({
          empresa: String(empresa ?? "").trim(),
          texto: String(texto),
        }),
      }
    );

    if (!resposta.ok) {
      return NextResponse.json(
        { ok: false, message: "A GAIA não aceitou o envio. Tente novamente." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Recebido! Perfil enviado para a fila da GAIA.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Erro ao enviar. Tente novamente." },
      { status: 500 }
    );
  }
}
