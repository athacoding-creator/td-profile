// Sync admin data (Pendaftar, Kehadiran, Akun, Pembayaran) to a Google Spreadsheet
// using a Google service account (GOOGLE_SERVICE_ACCOUNT_JSON).
// Actions: info | save (admin) | sync (admin) | cron (scheduled)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function serviceAccount() {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try { return JSON.parse(raw) as { client_email: string; private_key: string }; } catch { return null; }
}

const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  let s = ""; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function googleToken(sa: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${b64url(sig)}` }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google login gagal: ${JSON.stringify(body)}`);
  return body.access_token as string;
}

async function fetchAll(table: string, select: string, order: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(select).order(order, { ascending: false }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "");
const g = (v?: string | null) => (v === "L" ? "Laki-laki" : v === "P" ? "Perempuan" : v ?? "");

async function buildTabs() {
  const regs = await fetchAll("registrations",
    "created_at, guest_name, guest_phone, guest_gender, user_id, position, payment_status, amount_paid, donor_message, paid_at, events(title, programs(name)), profiles:user_id(full_name, phone, gender, city), registrant:registered_by(full_name)",
    "created_at");
  const atts = await fetchAll("attendance",
    "scanned_at, points_awarded, events(title), profiles:user_id(full_name, phone, gender, city)", "scanned_at");
  const users = await fetchAll("profiles",
    "created_at, full_name, phone, gender, birth_date, country_name, province_name, regency_name, district_name, city, address, occupation, instansi, hobi, points, is_complete", "created_at");

  const name = (r: any) => r.guest_name || r.profiles?.full_name || "";
  const phone = (r: any) => r.guest_phone || r.profiles?.phone || "";
  return {
    Pendaftar: [
      ["Tanggal Daftar", "Nama", "WhatsApp", "Gender", "Kota", "Event", "Program", "Kelas/Posisi", "Didaftarkan oleh", "Nominal", "Pesan Doa"],
      ...regs.map((r) => [dt(r.created_at), name(r), phone(r), g(r.guest_gender || r.profiles?.gender), r.profiles?.city ?? "",
        r.events?.title ?? "", r.events?.programs?.name ?? "", r.position ?? "", r.user_id ? "" : r.registrant?.full_name ?? "",
        Number(r.amount_paid ?? 0), r.donor_message ?? ""]),
    ],
    Kehadiran: [
      ["Waktu Scan", "Nama", "WhatsApp", "Gender", "Kota", "Event", "Poin"],
      ...atts.map((a) => [dt(a.scanned_at), a.profiles?.full_name ?? "", a.profiles?.phone ?? "", g(a.profiles?.gender),
        a.profiles?.city ?? "", a.events?.title ?? "", a.points_awarded ?? 0]),
    ],
    Akun: [
      ["Tanggal Daftar", "Nama", "WhatsApp", "Gender", "Tanggal Lahir", "Negara", "Provinsi", "Kota", "Kecamatan", "Alamat", "Pekerjaan", "Instansi", "Hobi", "Poin", "Profil Lengkap"],
      ...users.map((u) => [dt(u.created_at), u.full_name ?? "", u.phone ?? "", g(u.gender), u.birth_date ?? "", u.country_name ?? "",
        u.province_name ?? "", u.regency_name || u.city || "", u.district_name ?? "", u.address ?? "", u.occupation ?? "",
        u.instansi ?? "", u.hobi ?? "", u.points ?? 0, u.is_complete ? "Ya" : "Belum"]),
    ],
    Pembayaran: [
      ["Tanggal", "Nama", "WhatsApp", "Event", "Kelas/Posisi", "Nominal", "Status", "Dibayar", "Pesan Doa"],
      ...regs.filter((r) => Number(r.amount_paid ?? 0) > 0 || (r.payment_status && r.payment_status !== "none"))
        .map((r) => [dt(r.created_at), name(r), phone(r), r.events?.title ?? "", r.position ?? "", Number(r.amount_paid ?? 0),
          r.payment_status ?? "", dt(r.paid_at), r.donor_message ?? ""]),
    ],
  } as Record<string, (string | number)[][]>;
}

async function sync(spreadsheetId: string) {
  const sa = serviceAccount();
  if (!sa) throw new Error("Akun layanan Google belum diatur");
  const token = await googleToken(sa);
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const meta = await fetch(`${base}?fields=sheets.properties.title`, { headers: H });
  if (!meta.ok) {
    const t = await meta.text();
    if (meta.status === 403 || meta.status === 404)
      throw new Error(`Spreadsheet tidak bisa dibuka. Pastikan sudah dibagikan (Editor) ke ${sa.client_email}`);
    throw new Error(`Google error ${meta.status}: ${t}`);
  }
  const existing = new Set(((await meta.json()).sheets ?? []).map((s: any) => s.properties.title));
  const tabs = await buildTabs();
  const missing = Object.keys(tabs).filter((t) => !existing.has(t));
  if (missing.length) {
    const r = await fetch(`${base}:batchUpdate`, { method: "POST", headers: H,
      body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title } } })) }) });
    if (!r.ok) throw new Error(`Gagal membuat tab: ${await r.text()}`);
  }
  const clr = await fetch(`${base}/values:batchClear`, { method: "POST", headers: H,
    body: JSON.stringify({ ranges: Object.keys(tabs).map((t) => `'${t}'`) }) });
  if (!clr.ok) throw new Error(`Gagal membersihkan tab: ${await clr.text()}`);
  const up = await fetch(`${base}/values:batchUpdate`, { method: "POST", headers: H,
    body: JSON.stringify({ valueInputOption: "RAW", data: Object.entries(tabs).map(([t, values]) => ({ range: `'${t}'!A1`, values })) }) });
  if (!up.ok) throw new Error(`Gagal menulis data: ${await up.text()}`);
  return Object.fromEntries(Object.entries(tabs).map(([t, v]) => [t, v.length - 1]));
}

function parseId(input: string) {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return /^[a-zA-Z0-9-_]{20,}$/.test(input.trim()) ? input.trim() : null;
}

async function runAndRecord(id: string) {
  try {
    const counts = await sync(id);
    await admin.from("sheet_sync_config").update({ last_synced_at: new Date().toISOString(), last_error: null }).eq("id", 1);
    return { ok: true, counts };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("sheet_sync_config").update({ last_error: msg }).eq("id", 1);
    return { ok: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const { data: cfg } = await admin.from("sheet_sync_config").select("*").eq("id", 1).maybeSingle();

    if (action === "cron") {
      if (!cfg?.spreadsheet_id) return json({ ok: true, skipped: true });
      return json(await runAndRecord(cfg.spreadsheet_id));
    }

    // Unauthenticated connectivity check: verifies the service account key
    // can obtain a Google access token. Reveals only ok/error.
    if (action === "ping") {
      const sa = serviceAccount();
      if (!sa) return json({ ok: false, error: "Kunci akun layanan belum terpasang" });
      try {
        await getAccessToken(sa);
        return json({ ok: true, service_email: sa.client_email });
      } catch (e) {
        return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Admin-only actions
    const auth = req.headers.get("Authorization") ?? "";
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Harus login" }, 401);
    const { data: role } = await admin.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Khusus admin" }, 403);

    if (action === "info") {
      return json({
        service_email: serviceAccount()?.client_email ?? null,
        spreadsheet_id: cfg?.spreadsheet_id ?? null,
        last_synced_at: cfg?.last_synced_at ?? null,
        last_error: cfg?.last_error ?? null,
      });
    }
    if (action === "save") {
      const raw = String(body.url ?? "").slice(0, 500);
      const id = raw ? parseId(raw) : null;
      if (raw && !id) return json({ error: "Link spreadsheet tidak valid" }, 400);
      await admin.from("sheet_sync_config").update({ spreadsheet_id: id, updated_at: new Date().toISOString(), last_error: null }).eq("id", 1);
      if (!id) return json({ ok: true });
      return json(await runAndRecord(id));
    }
    if (action === "sync") {
      if (!cfg?.spreadsheet_id) return json({ error: "Spreadsheet belum ditautkan" }, 400);
      return json(await runAndRecord(cfg.spreadsheet_id));
    }
    return json({ error: "Aksi tidak dikenal" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
