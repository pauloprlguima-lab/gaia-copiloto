import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getAgent, type GaiaMessage } from "@/lib/agents";
import { hasSensitiveDataSignal, sensitiveDataWarning } from "@/lib/gaiaKnowledge";

function messageHasContent(message: GaiaMessage) {
  return Boolean(message.content?.trim() || message.attachments?.length);
}

function toOpenAIInput(message: GaiaMessage) {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content,
    };
  }

  const content: Array<Record<string, string>> = [];

  if (message.content?.trim()) {
    content.push({ type: "input_text", text: message.content });
  }

  for (const attachment of message.attachments ?? []) {
    if (attachment.kind === "image" && attachment.dataUrl) {
      content.push({ type: "input_image", image_url: attachment.dataUrl });
      continue;
    }

    if (attachment.kind === "text" && attachment.text) {
      content.push({
        type: "input_text",
        text: `\n\n[Anexo: ${attachment.name} | ${attachment.type || "texto"}]\n${attachment.text}`,
      });
      continue;
    }

    if (attachment.dataUrl) {
      content.push({
        type: "input_file",
        filename: attachment.name,
        file_data: attachment.dataUrl,
      });
    }
  }

  if (content.length === 0) {
    content.push({ type: "input_text", text: "Analise o anexo enviado." });
  }

  return {
    role: "user",
    content,
  };
}

function messageSensitiveText(message: GaiaMessage) {
  const attachmentText = (message.attachments ?? [])
    .map((attachment) => `${attachment.name} ${attachment.type} ${attachment.text ?? ""}`)
    .join("\n");

  return `${message.content ?? ""}\n${attachmentText}`;
}

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

    if (messages.length === 0 || messages.some((message) => !messageHasContent(message))) {
      return NextResponse.json({ error: "Envie pelo menos uma mensagem válida." }, { status: 400 });
    }

    const hasSensitiveData = messages
      .filter((message) => message.role === "user")
      .some((message) => hasSensitiveDataSignal(messageSensitiveText(message)));

    if (hasSensitiveData) {
      return NextResponse.json({ text: sensitiveDataWarning, blocked: true });
    }

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: agent.system,
      input: messages.map(toOpenAIInput) as never,
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
