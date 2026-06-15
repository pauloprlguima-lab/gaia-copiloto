import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAgent, type GaiaMessage } from "@/lib/agents";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Configure OPENAI_API_KEY no arquivo .env.local." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      agentId?: string;
      messages?: GaiaMessage[];
    };

    const agent = getAgent(body.agentId);
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!agent) {
      return NextResponse.json({ error: "Agente GAIA não encontrado." }, { status: 400 });
    }

    if (messages.length === 0 || messages.some((message) => !message.content?.trim())) {
      return NextResponse.json({ error: "Envie pelo menos uma mensagem válida." }, { status: 400 });
    }

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: agent.system,
      input: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      max_output_tokens: 1200,
    });

    const text = response.output_text?.trim();

    if (!text) {
      return NextResponse.json({ error: "A OpenAI não retornou texto." }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não consegui completar agora. Verifique a chave, o modelo e tente de novo." },
      { status: 500 },
    );
  }
}