"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Brain, ClipboardCopy, FileText, MessageSquareText, Radar, Send, Sparkles } from "lucide-react";
import { agents, type AgentId, type GaiaMessage } from "@/lib/agents";

type ConversationMap = Partial<Record<AgentId, GaiaMessage[]>>;

const iconMap = {
  gaia: Sparkles,
  radar: Radar,
  voz: MessageSquareText,
  memoria: FileText,
};

const agentHighlights: Record<AgentId, string[]> = {
  gaia: ["Decisão rápida", "Próximo passo", "LGPD e método"],
  radar: ["Dossiê", "Ranking A/B/C", "Perguntas da visita"],
  voz: ["WhatsApp", "Ligação", "Retomada"],
  memoria: ["Relatório", "Pendências", "Próximos passos"],
};

const onboardingSteps = [
  {
    kicker: "Copiloto comercial para recebíveis",
    title: "DADOS com a GAIA. CAMPO com o gerente.",
    body: "A GAIA prepara dossiês, abordagens e relatórios para o gerente comercial ganhar tempo, priorizar melhor e chegar mais forte na conversa com o cedente.",
    note: "Radar, Voz, Memória e orientação do método em um só lugar.",
    image: "/images/gaia-welcome.png",
  },
  {
    kicker: "A criadora do método",
    title: "Roseli Firmino une mercado de recebíveis e IA aplicada.",
    body: "Economista, com 32 anos no mercado de recebíveis e MBA em Inteligência Artificial, Roseli criou o Método GAIA para colocar tecnologia a serviço da rotina comercial real.",
    note: "A proposta não é substituir o gerente. É devolver tempo e inteligência para ele atuar melhor em campo.",
    image: "/images/roseli-1.png",
  },
  {
    kicker: "O que o método ajuda",
    title: "Menos tela. Mais cliente.",
    body: "O método organiza a parte que consome tempo: pesquisa de prospectivos, preparação de abordagem, registro de visita, acompanhamento e cuidado com dados sensíveis.",
    note: "A GAIA cuida da preparação. O gerente cuida da confiança, negociação e relacionamento.",
    image: "/images/agents/radar.png",
  },
  {
    kicker: "Como usar no dia a dia",
    title: "Escolha o agente certo para cada momento comercial.",
    body: "Radar prepara o prospectivo, Voz cria a abordagem, Memória registra a visita e a GAIA orienta o próximo passo quando o gerente precisa decidir.",
    note: "Comece com um comando pronto ou escreva livremente como se estivesse falando com uma adjunta comercial.",
    image: "/images/agents/voz.png",
  },
];

export default function GaiaCopiloto() {
  const [hasEntered, setHasEntered] = useState(false);
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null);
  const [conversations, setConversations] = useState<ConversationMap>({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const agent = useMemo(
    () => agents.find((item) => item.id === activeAgentId) ?? agents[0],
    [activeAgentId],
  );
  const messages = conversations[agent.id] ?? [];
  const onboarding = onboardingSteps[onboardingIndex];
  const isLastOnboarding = onboardingIndex === onboardingSteps.length - 1;

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function openAgent(nextAgentId: AgentId) {
    setActiveAgentId(nextAgentId);
    setInput("");
    setError(null);
  }

  function backToAgents() {
    setActiveAgentId(null);
    setInput("");
    setError(null);
  }

  function nextOnboarding() {
    if (isLastOnboarding) {
      setHasEntered(true);
      return;
    }

    setOnboardingIndex((current) => current + 1);
  }

  async function sendMessage(optionalText?: string) {
    if (!activeAgentId) return;

    const text = (optionalText ?? input).trim();
    if (!text || loading) return;

    const nextMessages: GaiaMessage[] = [...messages, { role: "user", content: text }];

    setError(null);
    setInput("");
    setLoading(true);
    setConversations((current) => ({ ...current, [agent.id]: nextMessages }));

    try {
      const response = await fetch("/api/gaia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, messages: nextMessages }),
      });

      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        throw new Error(data.error || "Não consegui completar agora.");
      }

      setConversations((current) => ({
        ...current,
        [agent.id]: [...nextMessages, { role: "assistant", content: data.text ?? "" }],
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não consegui completar agora.");
      setConversations((current) => ({ ...current, [agent.id]: nextMessages }));
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text: string, index: number) {
    await navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    window.setTimeout(() => setCopiedIndex(null), 1500);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function returnToOpening() {
    setOnboardingIndex(0);
    setHasEntered(false);
    setActiveAgentId(null);
  }

  if (!hasEntered) {
    return (
      <main className="welcomeShell">
        <section className="welcomeHero onboardingHero">
          <div className="welcomeCopy">
            <img className="welcomeLogo" src="/images/gaia-logo-transparent.png" alt="GAIA - Gerente Adjunto de Inteligência Artificial" />
            <p className="welcomeKicker">{onboarding.kicker}</p>
            <h1>{onboarding.title}</h1>
            <p>{onboarding.body}</p>
            <div className="onboardingProgress" aria-label="Progresso do onboarding">
              {onboardingSteps.map((step, index) => (
                <button
                  aria-label={`Ir para etapa ${index + 1}: ${step.kicker}`}
                  className={index === onboardingIndex ? "active" : ""}
                  key={step.kicker}
                  onClick={() => setOnboardingIndex(index)}
                  type="button"
                />
              ))}
            </div>
            <div className="welcomeActions">
              <button onClick={nextOnboarding} type="button">
                {isLastOnboarding ? "Entrar no copiloto" : "Próximo"}
              </button>
              {onboardingIndex > 0 ? (
                <button className="secondaryAction" onClick={() => setOnboardingIndex((current) => current - 1)} type="button">
                  Voltar
                </button>
              ) : null}
              <span>{onboarding.note}</span>
            </div>
          </div>
          <div className="welcomeVisual" aria-hidden="true">
            <img src={onboarding.image} alt="" />
          </div>
        </section>
      </main>
    );
  }

  if (!activeAgentId) {
    return (
      <main className="agentHubShell">
        <header className="hubHeader">
          <img src="/images/gaia-logo-transparent.png" alt="GAIA - Gerente Adjunto de Inteligência Artificial" />
          <div>
            <button className="hubBackButton" onClick={returnToOpening} type="button">
              <ArrowLeft size={16} />
              Voltar para abertura
            </button>
            <p className="eyebrow">Escolha seu agente</p>
            <h1>Qual parte do trabalho você quer resolver agora?</h1>
            <span>Cada agente abre uma conversa própria, com comandos prontos para o gerente sair com uma entrega utilizável.</span>
          </div>
        </header>

        <section className="agentCards" aria-label="Agentes GAIA">
          {agents.map((item) => {
            const Icon = iconMap[item.id];

            return (
              <article className="agentCard" key={item.id}>
                <div className="agentCardImage">
                  <img src={item.image} alt={`Imagem do agente ${item.name}`} />
                </div>
                <div className="agentCardTitle">
                  <div className="agentCardIcon"><Icon aria-hidden="true" size={22} /></div>
                  <h2>{item.name}</h2>
                </div>
                <p>{item.opening}</p>
                <div className="agentTags">
                  {agentHighlights[item.id].map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <button onClick={() => openAgent(item.id)} type="button">
                  Conversar com {item.shortName}
                </button>
              </article>
            );
          })}
        </section>
      </main>
    );
  }

  const ActiveIcon = iconMap[agent.id];

  return (
    <main className="focusedShell">
      <aside className="agentProfile">
        <button className="backButton" onClick={backToAgents} type="button">
          <ArrowLeft size={17} />
          Agentes
        </button>

        <img className="profileLogo" src="/images/gaia-logo-transparent.png" alt="GAIA" />

        <div className="profileCard">
          <div className="profileIcon"><ActiveIcon aria-hidden="true" size={30} /></div>
          <p className="eyebrow">{agent.shortName}</p>
          <h1>{agent.name}</h1>
          <p>{agent.role}</p>
          <div className="agentTags">
            {agentHighlights[agent.id].map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>

        <div className="gaiaProfilePortrait agentVisual">
          <img src={agent.image} alt={`Imagem do agente ${agent.name}`} />
        </div>

        <div className="methodCard focused">
          <Brain size={18} aria-hidden="true" />
          <div>
            <strong>Modo Comando</strong>
            <span>Peça uma entrega objetiva: dossiê, roteiro, relatório, lista ou mensagem pronta.</span>
          </div>
        </div>
      </aside>

      <section className="conversationPanel">
        <header className="conversationHeader">
          <div>
            <p className="eyebrow">{agent.documentLabel}</p>
            <h2>{agent.name}</h2>
            <span>{agent.opening}</span>
          </div>
          <div className="statusPill">v1 local</div>
        </header>

        <div className="stream focusedStream" ref={streamRef}>
          {messages.length === 0 ? (
            <section className="emptyState focusedEmpty">
              <div className="emptyIcon"><ActiveIcon size={28} /></div>
              <h3>Comece com um comando pronto.</h3>
              <p>Você também pode escrever livremente no campo abaixo.</p>
              <div className="chips">
                {agent.examples.map((example) => (
                  <button key={example} onClick={() => void sendMessage(example)} type="button">
                    {example}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {messages.map((message, index) =>
            message.role === "user" ? (
              <div className="userMessage" key={`${message.role}-${index}`}>{message.content}</div>
            ) : (
              <article className="agentDocument" key={`${message.role}-${index}`}>
                <div className="documentHeader">
                  <span>{agent.documentLabel}</span>
                  <button onClick={() => void copyText(message.content, index)} type="button">
                    <ClipboardCopy size={15} />
                    {copiedIndex === index ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <div className="documentBody">{message.content}</div>
              </article>
            ),
          )}

          {loading ? (
            <div className="thinking" aria-label="GAIA escrevendo">
              <i />
              <i />
              <i />
            </div>
          ) : null}

          {error ? <div className="errorBox">{error}</div> : null}
        </div>

        <footer className="composer focusedComposer">
          <div className="inputWrap">
            <textarea
              aria-label={`Mensagem para ${agent.name}`}
              className="input"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={agent.placeholder}
              rows={2}
              value={input}
            />
            <button className="sendButton" disabled={loading || !input.trim()} onClick={() => void sendMessage()} type="button">
              <Send aria-hidden="true" size={18} />
              Enviar
            </button>
          </div>
          <p>Ctrl/Cmd + Enter envia. Dado sensível só em ambiente aprovado ou IA local.</p>
        </footer>
      </section>
    </main>
  );
}
