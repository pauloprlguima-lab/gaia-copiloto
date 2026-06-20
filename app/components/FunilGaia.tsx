"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  Kanban,
  LayoutList,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_KEY = "gaia-funil-operacoes-v1";

export const funnelStages = [
  { id: "prospectivo", label: "Prospectivo", color: "#307c75" },
  { id: "contato", label: "Em contato", color: "#2f68a0" },
  { id: "visita", label: "Visita", color: "#a56f1c" },
  { id: "analise", label: "Em análise", color: "#75549b" },
  { id: "proposta", label: "Proposta", color: "#b55537" },
  { id: "cliente", label: "Cliente", color: "#347c48" },
] as const;

export type FunnelStage = (typeof funnelStages)[number]["id"];

export type FunnelDraft = {
  empresa?: string;
  cnpj?: string;
  dossie?: string;
};

type FunnelEntry = {
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

type EntryForm = Omit<FunnelEntry, "id" | "criadoEm" | "atualizadoEm">;

const emptyForm: EntryForm = {
  empresa: "",
  cnpj: "",
  etapa: "prospectivo",
  proximaAcao: "",
  dataProximaAcao: "",
  observacoes: "",
  dossie: "",
};

function readEntries() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? (parsed as FunnelEntry[]) : [];
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  if (!value) return "Sem data definida";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function stageById(id: FunnelStage) {
  return funnelStages.find((stage) => stage.id === id) ?? funnelStages[0];
}

export function FunilGaia({ draft, onBack }: { draft?: FunnelDraft | null; onBack: () => void }) {
  const [entries, setEntries] = useState<FunnelEntry[]>([]);
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"board" | "list">("board");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntries(readEntries());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, loaded]);

  useEffect(() => {
    if (!draft) return;
    setForm({
      ...emptyForm,
      empresa: draft.empresa ?? "",
      cnpj: draft.cnpj ?? "",
      dossie: draft.dossie ?? "",
      proximaAcao: "Fazer primeiro contato",
    });
    setEditingId(null);
    setFormOpen(true);
  }, [draft]);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return entries;
    return entries.filter((entry) =>
      [entry.empresa, entry.cnpj, entry.proximaAcao, entry.observacoes]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalized),
    );
  }, [entries, query]);

  const dueCount = entries.filter((entry) => {
    if (!entry.dataProximaAcao || entry.etapa === "cliente") return false;
    return entry.dataProximaAcao <= new Date().toISOString().slice(0, 10);
  }).length;

  function openNewEntry() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function editEntry(entry: FunnelEntry) {
    const { id, criadoEm, atualizadoEm, ...editable } = entry;
    void id;
    void criadoEm;
    void atualizadoEm;
    setEditingId(entry.id);
    setForm(editable);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const now = new Date().toISOString();

    if (editingId) {
      setEntries((current) =>
        current.map((entry) =>
          entry.id === editingId
            ? { ...entry, ...form, empresa: form.empresa.trim(), atualizadoEm: now }
            : entry,
        ),
      );
    } else {
      setEntries((current) => [
        ...current,
        {
          ...form,
          id: crypto.randomUUID(),
          empresa: form.empresa.trim(),
          criadoEm: now,
          atualizadoEm: now,
        },
      ]);
    }

    closeForm();
  }

  function moveEntry(id: string, etapa: FunnelStage) {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, etapa, atualizadoEm: new Date().toISOString() } : entry,
      ),
    );
  }

  function deleteEntry(entry: FunnelEntry) {
    if (!window.confirm(`Excluir ${entry.empresa} do funil?`)) return;
    setEntries((current) => current.filter((item) => item.id !== entry.id));
  }

  function renderEntry(entry: FunnelEntry) {
    const currentStage = stageById(entry.etapa);
    return (
      <article className="funnelEntry" key={entry.id}>
        <div className="funnelEntryTop">
          <div>
            <span className="funnelEntryStage" style={{ color: currentStage.color }}>
              {currentStage.label}
            </span>
            <h3>{entry.empresa}</h3>
            {entry.cnpj ? <small>{entry.cnpj}</small> : null}
          </div>
          <div className="funnelEntryActions">
            <button aria-label={`Editar ${entry.empresa}`} onClick={() => editEntry(entry)} title="Editar" type="button">
              <Pencil size={15} />
            </button>
            <button aria-label={`Excluir ${entry.empresa}`} onClick={() => deleteEntry(entry)} title="Excluir" type="button">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="funnelNextAction">
          <CalendarDays size={16} />
          <div>
            <strong>{entry.proximaAcao || "Definir próxima ação"}</strong>
            <span>{formatDate(entry.dataProximaAcao)}</span>
          </div>
        </div>

        {entry.observacoes ? <p>{entry.observacoes}</p> : null}

        <label className="funnelMoveLabel">
          Mover para
          <select value={entry.etapa} onChange={(event) => moveEntry(entry.id, event.target.value as FunnelStage)}>
            {funnelStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </select>
        </label>
      </article>
    );
  }

  return (
    <main className="funnelShell">
      <header className="funnelHeader">
        <div className="funnelBrand">
          <button className="funnelBack" onClick={onBack} type="button">
            <ArrowLeft size={17} />
            Voltar
          </button>
          <img src="/images/gaia-logo-transparent.png" alt="GAIA" />
          <div>
            <p className="eyebrow">Operação comercial</p>
            <h1>Funil GAIA</h1>
            <span>Empresas, próximas ações e andamento em um só lugar.</span>
          </div>
        </div>
        <button className="funnelPrimary" onClick={openNewEntry} type="button">
          <Plus size={18} />
          Nova empresa
        </button>
      </header>

      <section className="funnelSummary" aria-label="Resumo do funil">
        <div><Building2 size={20} /><span><strong>{entries.length}</strong> empresas</span></div>
        <div><Kanban size={20} /><span><strong>{entries.filter((entry) => entry.etapa !== "cliente").length}</strong> em andamento</span></div>
        <div className={dueCount ? "isDue" : ""}><CalendarDays size={20} /><span><strong>{dueCount}</strong> ações para hoje</span></div>
        <div><ChevronRight size={20} /><span><strong>{entries.filter((entry) => entry.etapa === "cliente").length}</strong> clientes</span></div>
      </section>

      <section className="funnelToolbar">
        <label className="funnelSearch">
          <Search size={17} />
          <input aria-label="Buscar no funil" onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, CNPJ ou ação" value={query} />
        </label>
        <div className="funnelViewToggle" aria-label="Modo de visualizacao">
          <button aria-pressed={view === "board"} className={view === "board" ? "active" : ""} onClick={() => setView("board")} title="Quadro" type="button"><Kanban size={17} /></button>
          <button aria-pressed={view === "list"} className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Lista" type="button"><LayoutList size={17} /></button>
        </div>
      </section>

      {filteredEntries.length === 0 ? (
        <section className="funnelEmpty">
          <Building2 size={30} />
          <h2>{entries.length ? "Nenhuma empresa encontrada" : "Seu funil está pronto"}</h2>
          <p>{entries.length ? "Tente outro termo de busca." : "Cadastre uma empresa ou salve um dossiê produzido pelo GAIA Radar."}</p>
          {!entries.length ? <button onClick={openNewEntry} type="button"><Plus size={17} /> Cadastrar primeira empresa</button> : null}
        </section>
      ) : view === "board" ? (
        <section className="funnelBoard" aria-label="Etapas do funil">
          {funnelStages.map((stage) => {
            const stageEntries = filteredEntries.filter((entry) => entry.etapa === stage.id);
            return (
              <section className="funnelColumn" key={stage.id}>
                <header style={{ borderColor: stage.color }}>
                  <h2>{stage.label}</h2>
                  <span>{stageEntries.length}</span>
                </header>
                <div className="funnelColumnEntries">
                  {stageEntries.length ? stageEntries.map(renderEntry) : <p className="funnelColumnEmpty">Nenhuma empresa nesta etapa.</p>}
                </div>
              </section>
            );
          })}
        </section>
      ) : (
        <section className="funnelList" aria-label="Lista de empresas">
          {filteredEntries
            .slice()
            .sort((a, b) => (a.dataProximaAcao || "9999").localeCompare(b.dataProximaAcao || "9999"))
            .map(renderEntry)}
        </section>
      )}

      {formOpen ? (
        <div className="funnelModalBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeForm()}>
          <section aria-labelledby="funnel-form-title" aria-modal="true" className="funnelModal" role="dialog">
            <header>
              <div>
                <p className="eyebrow">Registro comercial</p>
                <h2 id="funnel-form-title">{editingId ? "Editar empresa" : "Adicionar ao funil"}</h2>
              </div>
              <button aria-label="Fechar formulario" onClick={closeForm} title="Fechar" type="button"><X size={19} /></button>
            </header>
            <form onSubmit={saveEntry}>
              <div className="funnelFormGrid">
                <label className="funnelWide">Empresa <input autoFocus onChange={(event) => setForm({ ...form, empresa: event.target.value })} required value={form.empresa} /></label>
                <label>CNPJ <input inputMode="numeric" onChange={(event) => setForm({ ...form, cnpj: event.target.value })} placeholder="00.000.000/0000-00" value={form.cnpj} /></label>
                <label>Etapa <select onChange={(event) => setForm({ ...form, etapa: event.target.value as FunnelStage })} value={form.etapa}>{funnelStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
                <label className="funnelWide">Próxima ação <input onChange={(event) => setForm({ ...form, proximaAcao: event.target.value })} placeholder="Ex.: Ligar para o financeiro" value={form.proximaAcao} /></label>
                <label>Data da próxima ação <input onChange={(event) => setForm({ ...form, dataProximaAcao: event.target.value })} type="date" value={form.dataProximaAcao} /></label>
                <label className="funnelWide">Observações <textarea onChange={(event) => setForm({ ...form, observacoes: event.target.value })} placeholder="Contexto importante para o próximo contato" rows={3} value={form.observacoes} /></label>
                {form.dossie ? <label className="funnelWide">Dossiê salvo <textarea onChange={(event) => setForm({ ...form, dossie: event.target.value })} rows={5} value={form.dossie} /></label> : null}
              </div>
              <footer>
                <button className="funnelCancel" onClick={closeForm} type="button">Cancelar</button>
                <button className="funnelPrimary" type="submit">{editingId ? "Salvar alterações" : "Adicionar ao funil"}</button>
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
