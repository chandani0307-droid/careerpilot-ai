import { Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { cx } from "../lib/utils";
import { useApp } from "./context";

interface Msg { role: "user" | "assistant"; content: string }

export default function ChatWidget() {
  const { profile } = useApp();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([{ role: "assistant", content: profile ? `Hi ${profile.data.name.split(" ")[0] || "there"}, I've read your resume. Ask me to summarise it, explain a match score, or plan your next step.` : "Hi! Upload your resume on the Resume page and I'll help you find and prepare for the right jobs." }]);
      setChips(profile ? ["Summarize my resume", "Find jobs for me", "How do I improve my ATS score?"] : ["How does this work?"]);
    }
  }, [open, profile, msgs.length]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function send(content: string) {
    if (!content.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const r = await api.post<{ reply: string; suggestions: string[] }>("/assistant/chat", { messages: next });
      setMsgs([...next, { role: "assistant", content: r.reply }]); setChips(r.suggestions);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: (e as Error).message }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 lg:left-[16.5rem]">
      {open && (
        <div className="card mb-3 flex h-[28rem] max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden" role="dialog" aria-label="AI Career Assistant">
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-clear" /> Career Assistant</div>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-paper p-3">
            {msgs.map((m, i) => (
              <div key={i} className={cx("max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm", m.role === "user" ? "ml-auto rounded-br-sm bg-signal text-white" : "rounded-bl-sm bg-white text-ink shadow-card")}>{m.content}</div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-ink-400"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
            <div ref={end} />
          </div>
          {chips.length > 0 && !busy && (
            <div className="flex flex-wrap gap-1.5 border-t border-line bg-white px-3 pt-2">
              {chips.map((c) => <button key={c} onClick={() => send(c)} className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-paper">{c}</button>)}
            </div>
          )}
          <form className="flex gap-2 bg-white p-3" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your career…" aria-label="Message" />
            <button className="btn btn-primary px-3" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
          </form>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="btn btn-dark h-12 rounded-full px-4 shadow-lg" aria-label="Toggle AI Career Assistant">
        <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Ask CareerPilot</span>
      </button>
    </div>
  );
}
