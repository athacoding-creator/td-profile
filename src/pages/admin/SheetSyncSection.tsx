import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, Copy, ExternalLink } from "lucide-react";
import { Section } from "./components";

type Info = { service_email: string | null; spreadsheet_id: string | null; last_synced_at: string | null; last_error: string | null };

async function call(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("sync-sheets", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context.json()).error ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return data;
}

export function SheetSyncSection() {
  const [info, setInfo] = useState<Info | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const d = await call({ action: "info" });
      setInfo(d);
      if (d.spreadsheet_id) setUrl(`https://docs.google.com/spreadsheets/d/${d.spreadsheet_id}/edit`);
    } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const d = await call(body);
      if (d.ok === false) toast.error(d.error);
      else if (d.counts) toast.success(`Tersinkron: ${Object.entries(d.counts).map(([k, v]) => `${k} ${v}`).join(", ")}`);
      else toast.success("Tersimpan");
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
    load();
  };

  return (
    <Section title="Google Spreadsheet">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Data Pendaftar, Kehadiran, Akun, dan Pembayaran otomatis dikirim ke spreadsheet setiap 1 jam.
          Tekan "Sinkron sekarang" bila butuh data terbaru segera.
        </p>

        {info && !info.service_email && (
          <p className="rounded-lg bg-muted p-3 text-sm">Fitur ini belum aktif — akun layanan Google belum dipasang oleh tim pengembang.</p>
        )}

        {info?.service_email && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p className="font-medium">Langkah 1: Bagikan spreadsheet (akses <b>Editor</b>) ke email ini:</p>
            <div className="flex items-center gap-2">
              <code className="break-all text-xs">{info.service_email}</code>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(info.service_email!); toast.success("Email disalin"); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Langkah 2: Tempel link spreadsheet</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !info?.service_email} onClick={() => run({ action: "save", url })}>Simpan & sinkron</Button>
          <Button variant="outline" disabled={busy || !info?.spreadsheet_id} onClick={() => run({ action: "sync" })}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Sinkron sekarang
          </Button>
          {info?.spreadsheet_id && (
            <Button variant="ghost" asChild>
              <a href={`https://docs.google.com/spreadsheets/d/${info.spreadsheet_id}/edit`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" /> Buka spreadsheet
              </a>
            </Button>
          )}
        </div>

        {info?.last_synced_at && (
          <p className="text-xs text-muted-foreground">Sinkron terakhir: {new Date(info.last_synced_at).toLocaleString("id-ID")}</p>
        )}
        {info?.last_error && <p className="text-xs text-destructive">Error terakhir: {info.last_error}</p>}
      </div>
    </Section>
  );
}
