import React, { useMemo, useRef, useState } from "react";
import {
  FolderOpen,
  FileText,
  Link as LinkIcon,
  Search,
  Download,
  ExternalLink,
  Loader2,
  Bot,
  Upload,
  Paperclip,
  X,
  Filter,
  ChevronRight,
  ChevronDown,
  CheckCircle,
} from "lucide-react";

// ---------- Types ----------
type Doc = {
  id: string;
  title: string;
  docketNo?: string;
  date: string; // ISO
  type: "Petition" | "First-Day Declaration" | "SOFA" | "SOAL" | "DIP Motion" | "DIP Order" | "MOR" | "Other";
  pages?: number;
  sizeMB?: number;
  url?: string; // source link (PACER/RECAP/Reorg/etc.)
  localPath?: string; // if you have a local file server route
  tags?: string[];
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: { docId: string; page?: number; label?: string; url?: string }[];
};

// ---------- Mock Data (replace with your loader/API) ----------
const MOCK_DOCS: Doc[] = [
  {
    id: "d-0001",
    title: "Voluntary Petition (Chapter 11)",
    docketNo: "1",
    date: "2025-10-11",
    type: "Petition",
    pages: 47,
    sizeMB: 3.2,
    url: "https://www.courtlistener.com/docket/0001",
    tags: ["Case Open"],
  },
  {
    id: "d-0002",
    title: "First-Day Declaration of John Smith, CFO",
    docketNo: "12",
    date: "2025-10-12",
    type: "First-Day Declaration",
    pages: 86,
    sizeMB: 5.8,
    url: "https://www.courtlistener.com/docket/0012",
    tags: ["Day 1"],
  },
  {
    id: "d-0003",
    title: "Schedules of Assets & Liabilities (SOAL)",
    docketNo: "48",
    date: "2025-10-18",
    type: "SOAL",
    pages: 129,
    sizeMB: 10.4,
    url: "https://www.courtlistener.com/docket/0048",
    tags: ["Schedules"],
  },
  {
    id: "d-0004",
    title: "Statement of Financial Affairs (SOFA)",
    docketNo: "49",
    date: "2025-10-18",
    type: "SOFA",
    pages: 77,
    sizeMB: 6.2,
    url: "https://www.courtlistener.com/docket/0049",
    tags: ["Disclosure"],
  },
  {
    id: "d-0005",
    title: "DIP Financing Motion",
    docketNo: "55",
    date: "2025-10-19",
    type: "DIP Motion",
    pages: 64,
    sizeMB: 4.1,
    url: "https://www.courtlistener.com/docket/0055",
    tags: ["DIP"],
  },
  {
    id: "d-0006",
    title: "Interim DIP Order",
    docketNo: "72",
    date: "2025-10-21",
    type: "DIP Order",
    pages: 42,
    sizeMB: 2.7,
    url: "https://www.courtlistener.com/docket/0072",
    tags: ["DIP", "Order"],
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m-0001",
    role: "assistant",
    content:
      "Ready. Ask me about capital structure, lien stack, DIP terms, milestones, advisors, or key dates. You can also click a document on the left to anchor questions.",
  },
];

// ---------- Helpers ----------
function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch (e) {
    return iso;
  }
}

function classNames(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// ---------- Main Component ----------
export default function LilithDashboard() {
  const [docs, setDocs] = useState<Doc[]>(MOCK_DOCS);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<string, Doc[]> = {};
    docs
      .filter((d) =>
        [d.title, d.type, d.docketNo].join(" ").toLowerCase().includes(query.toLowerCase())
      )
      .forEach((d) => {
        const key = d.type;
        groups[key] = groups[key] || [];
        groups[key].push(d);
      });
    return groups;
  }, [docs, query]);

  const orderedTypes: Doc["type"][] = [
    "Petition",
    "First-Day Declaration",
    "SOAL",
    "SOFA",
    "DIP Motion",
    "DIP Order",
    "MOR",
    "Other",
  ];

  const onToggleSelected = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onSend = async () => {
    const content = input.trim();
    if (!content) return;
    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);

    // ---- Replace this block with your backend call ----
    // Simulate an assistant reply that cites a selected doc
    const citedDoc = selectedDocIds.length ? docs.find((d) => d.id === selectedDocIds[0]) : undefined;
    const fakeAnswer =
      citedDoc && content.toLowerCase().includes("dip")
        ? `The Interim DIP Order (Dkt. ${citedDoc.docketNo}) authorizes a \n$150mm superpriority priming facility with a 2.50% OID and SOFR+675bps (1.00% floor). Key milestones: sale procedures in 21 days; sale hearing by D+45. Adequate protection includes replacement liens and §507(b) superpriority claims.`
        : `Here’s what I found based on current filings. Ask me to export CSV or show source snippets for any field.`;

    const assistantMsg: ChatMessage = {
      id: `m-${Date.now() + 1}`,
      role: "assistant",
      content: fakeAnswer,
      citations: citedDoc
        ? [
            {
              docId: citedDoc.id,
              page: 7,
              label: `${citedDoc.type} (Dkt. ${citedDoc.docketNo}) p.7`,
              url: citedDoc.url,
            },
          ]
        : undefined,
    };
    await new Promise((r) => setTimeout(r, 700));
    setMessages((m) => [...m, assistantMsg]);
    // ---- /simulate ----

    setSending(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // In your app: upload, parse, then push into state.
    const newDoc: Doc = {
      id: `d-${Date.now()}`,
      title: f.name,
      date: new Date().toISOString().slice(0, 10),
      type: "Other",
      sizeMB: Math.max(0.1, f.size / (1024 * 1024)),
      tags: ["Uploaded"],
    };
    setDocs((d) => [newDoc, ...d]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full h-screen bg-neutral-50 flex overflow-hidden">
      {/* Left: Documents Pane */}
      <aside className="w-[36%] max-w-[640px] min-w-[420px] border-r border-neutral-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          <h2 className="font-semibold text-neutral-800">Case Files</h2>
          <div className="ml-auto flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-sm"
              onClick={() => fileInputRef.current?.click()}
              title="Upload PDF/DOCX"
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={onUpload}
            />
          </div>
        </div>

        <div className="px-3 py-2 border-b border-neutral-200 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 bg-neutral-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docket, title, type…"
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <button className="px-2.5 py-2 rounded-xl border border-neutral-200 hover:bg-neutral-50" title="Filters (stub)">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {orderedTypes.map((t) => {
            const arr = grouped[t] || [];
            if (!arr.length) return null;
            const open = expanded[t] ?? true;
            return (
              <div key={t} className="">
                <button
                  onClick={() => setExpanded((e) => ({ ...e, [t]: !open }))}
                  className="w-full flex items-center justify-between px-4 py-2 text-left text-neutral-700 hover:bg-neutral-50 border-b"
                >
                  <div className="flex items-center gap-2 font-medium">
                    {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {t}
                  </div>
                  <span className="text-xs text-neutral-500">{arr.length}</span>
                </button>
                {open && (
                  <ul className="divide-y">
                    {arr.map((d) => (
                      <li key={d.id} className="px-4 py-3 hover:bg-neutral-50">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => onToggleSelected(d.id)}
                            className={classNames(
                              "mt-0.5 w-5 h-5 rounded border flex items-center justify-center",
                              selectedDocIds.includes(d.id)
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-neutral-300 bg-white"
                            )}
                            title={selectedDocIds.includes(d.id) ? "Unselect from chat context" : "Select for chat context"}
                          >
                            {selectedDocIds.includes(d.id) && (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm font-medium text-neutral-800 truncate">
                              <FileText className="w-4 h-4 text-neutral-500" />
                              <span className="truncate">{d.title}</span>
                            </div>
                            <div className="mt-1 text-xs text-neutral-500 flex items-center gap-3">
                              {d.docketNo && <span>Dkt. {d.docketNo}</span>}
                              <span>{formatDate(d.date)}</span>
                              {d.pages ? <span>{d.pages}p</span> : null}
                              {d.sizeMB ? <span>{d.sizeMB.toFixed(1)} MB</span> : null}
                            </div>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {d.tags?.map((tag) => (
                                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {d.url && (
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-neutral-900"
                                title="Open source link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            {d.localPath && (
                              <a
                                href={d.localPath}
                                className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-neutral-900"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right: Chat Pane */}
      <section className="flex-1 flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200 bg-white flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <h2 className="font-semibold text-neutral-800">Lilith — Distressed Chat</h2>
          <div className="ml-auto flex items-center gap-2">
            {selectedDocIds.length > 0 ? (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedDocIds.map((id) => {
                  const d = docs.find((x) => x.id === id);
                  if (!d) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {d.type} {d.docketNo ? `(Dkt. ${d.docketNo})` : ""}
                      <button
                        className="ml-1 text-emerald-700/80 hover:text-emerald-900"
                        onClick={() => onToggleSelected(id)}
                        title="Remove from context"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-xs text-neutral-500">Tip: select 1–3 docs on the left to ground responses</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={classNames("max-w-3xl", m.role === "user" ? "ml-auto" : "") }>
              <div
                className={classNames(
                  "rounded-2xl px-4 py-3 shadow-sm",
                  m.role === "user" ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200"
                )}
              >
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.content}</div>
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {m.citations.map((c, i) => {
                      const d = docs.find((x) => x.id === c.docId);
                      return (
                        <a
                          key={i}
                          href={c.url || d?.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                          title={d ? d.title : c.label}
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          {c.label || d?.title || "Source"}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-200 bg-white p-3">
          <div className="max-w-3xl mx-auto">
            <div className="bg-neutral-100 rounded-2xl px-3 py-2 flex items-end gap-2">
              <button className="p-2 rounded-xl hover:bg-neutral-200" title="Attach a document (grounding)">
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                rows={1}
                placeholder="Ask about lien stack, DIP economics, milestones, advisors…"
                className="flex-1 bg-transparent outline-none resize-none text-sm max-h-40"
              />
              <button
                onClick={onSend}
                disabled={sending}
                className={classNames(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm",
                  sending ? "bg-neutral-300 text-neutral-600" : "bg-neutral-900 text-white hover:bg-black"
                )}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                {sending ? "Thinking…" : "Ask"}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-neutral-500">
              Shift+Enter for newline • Selected docs ground the answer and drive citations.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
