// Admin-triggered password reset.
// Requires an authenticated admin. Generates a new random password for the
// target phone, stores the message in `password_resets`, optionally sends it
// via the WhatsApp gateway, and returns the new password so the admin can
// copy it / forward it manually via WhatsApp.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(raw: string): string {
  const d = (raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return "62" + d.slice(1);
  if (d.startsWith("8")) return "62" + d;
  return d;
}

function randomPassword(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

async function sendWhatsApp(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const token = Deno.env.get("FONNTE_TOKEN");
  if (!token) return { ok: false, error: "WhatsApp gateway not configured" };
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ target: phone, message }),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { response: text }; }
  if (res.ok && data?.status !== false) return { ok: true };
  return { ok: false, error: JSON.stringify(data) };
}

async function findAuthUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Harus login" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: callerErr } = await caller.auth.getUser();
    if (callerErr || !callerUser) {
      return new Response(JSON.stringify({ error: "Sesi tidak valid" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Hanya admin yang bisa mereset password" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body?.phone ?? "");
    if (!/^628\d{7,12}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Nomor tidak valid" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find target user by phone
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("phone", phone)
      .maybeSingle();

    let targetUserId = profile?.id ?? null;
    let targetName = profile?.full_name ?? null;
    if (!targetUserId) {
      let authUser = await findAuthUserByEmail(admin, `${phone}@wa.tdprofile.app`);
      if (!authUser) authUser = await findAuthUserByEmail(admin, `${phone}@wa.tdprofile.local`);
      if (authUser) {
        targetUserId = authUser.id;
        targetName = (authUser.user_metadata?.full_name as string | undefined) ?? null;
      }
    }
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Akun dengan nomor ini tidak ditemukan" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newPassword = randomPassword(10);
    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (updErr) throw updErr;

    const message =
      `Halo ${targetName || "Sahabat"},\n\n` +
      `Password baru akun Teras Dakwah Anda: *${newPassword}*\n\n` +
      `Silakan login dengan nomor WhatsApp dan password baru ini. Jika ada kendala, hubungi admin.`;

    const delivery = await sendWhatsApp(phone, message);

    await admin.from("password_resets").insert({
      user_id: targetUserId,
      phone,
      message,
      delivered: delivery.ok,
      delivery_error: delivery.ok ? null : delivery.error ?? null,
    });

    return new Response(JSON.stringify({
      ok: true,
      phone,
      name: targetName,
      password: newPassword,
      delivered: delivery.ok,
      delivery_error: delivery.ok ? null : delivery.error ?? null,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("admin-reset-password error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
