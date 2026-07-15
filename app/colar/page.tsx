"use client";

import { useState } from "react";

export default function ColarPage() {
  const [empresa, setEmpresa] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);

  async function enviar() {
    if (!texto.trim()) {
      setErro(true);
      setMensagem("Cole o texto do perfil antes de enviar.");
      return;
    }
    setEnviando(true);
    setMensagem("");
    setErro(false);
    try {
      const r = await fetch("/api/colar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa, texto }),
      });
      const data = await r.json();
      if (r.ok && data.ok) {
        setMensagem("Recebido! Perfil na fila da GAIA. Resultado na planilha em alguns minutos.");
        setEmpresa("");
        setTexto("");
      } else {
        setErro(true);
        setMensagem(data.message || "A GAIA não aceitou o envio. Tente novamente.");
      }
    } catch {
      setErro(true);
      setMensagem("Não consegui falar com a GAIA. Verifique a internet e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0c1a15",
        color: "#f2ede1",
        display: "flex",
        justifyContent: "center",
        padding: "48px 16px",
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <p style={{ letterSpacing: 3, fontSize: 12, color: "#c9a75f", textTransform: "uppercase" }}>
          GAIA — Colar Perfil
        </p>
        <h1 style={{ fontSize: 32, margin: "8px 0 8px" }}>
          Cole o perfil. A GAIA cuida do resto.
        </h1>
        <p style={{ color: "#b9c4bd", marginBottom: 28 }}>
          Copie o texto do perfil no Sales Navigator, cole aqui e envie. A GAIA
          extrai os dados e alimenta a planilha sozinha.
        </p>

        <label style={{ display: "block", fontSize: 14, color: "#c9a75f", marginBottom: 6 }}>
          Empresa (opcional)
        </label>
        <input
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          placeholder="Ex.: Transnordestina Logística"
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #2c4a3e",
            background: "#122620",
            color: "#f2ede1",
            fontSize: 15,
            marginBottom: 20,
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontSize: 14, color: "#c9a75f", marginBottom: 6 }}>
          Texto do perfil
        </label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui o texto copiado do perfil..."
          rows={12}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #2c4a3e",
            background: "#122620",
            color: "#f2ede1",
            fontSize: 15,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        <button
          onClick={enviar}
          disabled={enviando}
          style={{
            marginTop: 24,
            width: "100%",
            padding: "14px 20px",
            borderRadius: 10,
            border: "none",
            background: enviando ? "#8a7443" : "#c9a75f",
            color: "#0c1a15",
            fontSize: 16,
            fontWeight: 700,
            cursor: enviando ? "wait" : "pointer",
          }}
        >
          {enviando ? "Enviando..." : "Enviar para a GAIA"}
        </button>

        {mensagem && (
          <p
            style={{
              marginTop: 18,
              padding: "12px 14px",
              borderRadius: 10,
              background: erro ? "#3a1d1d" : "#16301f",
              color: erro ? "#f0b9b9" : "#bfe3c7",
              fontSize: 15,
            }}
          >
            {mensagem}
          </p>
        )}
      </div>
    </main>
  );
}
