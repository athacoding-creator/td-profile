import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdmin } from "./AdminLayout";
import { Section } from "./components";
import { MessageCircle } from "lucide-react";

export default function RegistrationsPage() {
  const { events, registrations } = useAdmin();
  const [eventFilter, setEventFilter] = useState<string>("");
  const filtered = eventFilter ? registrations.filter((r) => r.event_id === eventFilter) : registrations;
  const counts: Record<string, number> = {};
  registrations.forEach((r) => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });

  return (
    <>
      <div>
        <h1 className="font-display text-3xl font-bold">Pendaftar</h1>
        <p className="text-sm text-muted-foreground">Tracking jamaah per event</p>
      </div>
      <Section title="Jamaah per Event">
        <div className="grid gap-2 md:grid-cols-2">
          {events.filter((e) => e.status === "active").map((e) => (
            <button key={e.id} onClick={() => setEventFilter(e.id)}
              className={`rounded-xl border p-3 text-left transition ${eventFilter === e.id ? "border-primary bg-primary/5" : "border-border/60"}`}>
              <p className="font-medium text-sm">{e.title}</p>
              <p className="text-xs text-muted-foreground">{e.programs?.name || "—"} · {counts[e.id] || 0} pendaftar</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title={eventFilter ? "Pendaftar event terpilih" : "Semua pendaftar terbaru"}>
        {eventFilter && (
          <Button size="sm" variant="outline" className="mb-3" onClick={() => setEventFilter("")}>Tampilkan semua</Button>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Tanggal</th><th>Nama</th><th>WhatsApp</th><th>Gender</th><th>Kota</th><th>Event</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const phone = r.profiles?.phone || "";
                return (
                  <tr key={r.id} className="border-t border-border/60">
                    <td className="py-2">{new Date(r.created_at).toLocaleString("id-ID")}</td>
                    <td>{r.profiles?.full_name || "—"}</td>
                    <td>
                      {phone ? (
                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {phone}
                        </a>
                      ) : "—"}
                    </td>
                    <td>{r.profiles?.gender || "—"}</td>
                    <td>{r.profiles?.city || "—"}</td>
                    <td className="text-xs">{r.events?.title}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
