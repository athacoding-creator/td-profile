import { ReactNode } from "react";

export const Section = ({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) => (
  <section className="rounded-2xl bg-card p-4 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
    <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="font-semibold text-sm sm:text-base">{title}</h2>
      {action}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

export const StatCard = ({ label, value, accent }: { label: string; value: number; accent?: boolean }) => (
  <div className={`rounded-2xl p-3 sm:p-4 ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`} style={!accent ? { boxShadow: "var(--shadow-card)" } : undefined}>
    <p className={`text-[10px] sm:text-xs ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</p>
    <p className="mt-1 text-xl sm:text-2xl font-bold">{value}</p>
  </div>
);

export const MiniList = ({ title, items }: { title: string; items: { primary: string; secondary: string }[] }) => (
  <div className="rounded-xl border border-border/60 p-3 sm:p-4">
    <h3 className="text-xs sm:text-sm font-semibold">{title}</h3>
    <ul className="mt-2 space-y-2">
      {items.length === 0 && <li className="text-xs text-muted-foreground">Belum ada data</li>}
      {items.map((it, i) => (
        <li key={i} className="text-sm">
          <p className="truncate text-sm sm:text-base">{it.primary}</p>
          <p className="text-xs text-muted-foreground">{it.secondary}</p>
        </li>
      ))}
    </ul>
  </div>
);
