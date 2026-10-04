import { AlertCircle, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";
import { cx, scoreTone } from "../lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-sm text-ink-400" role="status">
      <Loader2 className="h-4 w-4 animate-spin" /> {label ?? "Loading…"}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-alert/30 bg-alert-50 px-3 py-2 text-sm text-alert" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{message}</span>
    </div>
  );
}

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-ink-300">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-md text-sm text-ink-400">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  neutral: "bg-paper text-ink-700 border-line", blue: "bg-signal-50 text-signal-600 border-signal/20",
  green: "bg-go-50 text-go border-go/20", amber: "bg-clear-50 text-clear-700 border-clear/30", red: "bg-alert-50 text-alert border-alert/20",
};
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", badgeTones[tone])}>{children}</span>;
}

/** Match score drawn as a gauge arc: the product's one signature element. */
export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const t = scoreTone(score);
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={t.label} aria-label={`${score} percent match`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E1E4EA" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.stroke} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className={cx("absolute inset-0 flex items-center justify-center text-sm font-bold", t.text)}>{score}</span>
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-b-none sm:rounded-b-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button className="rounded p-1 text-ink-400 hover:bg-paper" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-paper px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-[10px] border border-line bg-white p-0.5" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx("rounded-lg px-3 py-1.5 text-sm font-medium transition", value === o.value ? "bg-ink text-white" : "text-ink-700 hover:bg-paper")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
