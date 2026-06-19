import { NextResponse } from "next/server";
import { CnpjApiError, consultPublicCompany } from "@/lib/cnpj";

function authorize(request: Request) {
  const configuredKey = process.env.GAIA_ACTION_API_KEY;

  if (!configuredKey) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "A autenticação da Ação GAIA não foi configurada." }, { status: 503 })
      : null;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${configuredKey}`
    ? null
    : NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
}

export async function POST(request: Request) {
  const authorizationError = authorize(request);
  if (authorizationError) return authorizationError;

  try {
    const body = (await request.json()) as { cnpj?: string };
    const company = await consultPublicCompany(body.cnpj ?? "");
    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof CnpjApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Não foi possível consultar o CNPJ agora." },
      { status: 500 },
    );
  }
}
