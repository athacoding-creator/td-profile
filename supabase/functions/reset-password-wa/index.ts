// Reset password via WhatsApp.
// Generates a random password, updates the user, and either dispatches via
// a configured WhatsApp gateway or stores it in `password_resets` as a
// fallback "outbox" that admins can read while a gateway isn't configured.
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

function isValidPhone(p: string): boolean {
  return /^628\d{7,12}$/.test(p);
}

function randomPassword(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

// Adapter: send WhatsApp message via gateway.
// Returns { ok, error? }. While no gateway is configured, returns ok: false
// so caller stores the message in `password_resets` for manual delivery.
async function sendWhatsApp(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const token = Deno.env.get("FONNTE_TOKEN");
  if (!token) {
    return { ok: false, error: "WhatsApp gateway not configured" };
  }

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ target: phone, message }),
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { response: text };
  }

  if (res.ok && data?.status !== false) return { ok: true };
  return { ok: false, error: JSON.stringify(data) };
}

async function findAuthUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("reset-password-wa list users error", error);
      return null;
    }

    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body?.phone ?? "");
    console.log("reset-password-wa request", { phone });
    if (!isValidPhone(phone)) {
      return new Response(JSON.stringify({ error: "Nomor tidak valid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find user by phone
    const { data: profile } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("phone", phone)
      .maybeSingle();

    let targetUserId = profile?.id ?? null;
    let targetName = profile?.full_name ?? null;
    if (!targetUserId) {
      const authUser = await findAuthUserByEmail(admin, `${phone}@wa.tdprofile.app`);
      if (authUser) {
        targetUserId = authUser.id;
        targetName =
          (authUser.user_metadata?.full_name as string | undefined) ??
          (authUser.user_metadata?.name as string | undefined) ??
          null;
      }
    }

    // Anti-enumeration: always return success even if not found
    if (!targetUserId) {
      console.log("reset-password-wa profile not found", { phone });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("reset-password-wa user found", { phone, user_id: targetUserId });

    const newPassword = randomPassword(10);
    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });
    if (updErr) throw updErr;

    const message =
      `Halo ${targetName || "Sahabat"},\n\n` +
      `Password baru akun Teras Dakwah Anda: *${newPassword}*\n\n` +
      `fitur reset password ini masih dalam tahap percobaan, jika Anda mengalami kendala silakan hubungi admin.`;

    const delivery = await sendWhatsApp(phone, message);
    console.log("reset-password-wa delivery", {
      phone,
      delivered: delivery.ok,
      error: delivery.error ?? null,
    });

    await admin.from("password_resets").insert({
      user_id: targetUserId,
      phone,
      message,
      delivered: delivery.ok,
      delivery_error: delivery.ok ? null : delivery.error ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("reset-password-wa error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
