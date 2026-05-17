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
  // --- FONNTE (uncomment & set FONNTE_TOKEN secret to enable) ---
  // const token = Deno.env.get("FONNTE_TOKEN");
  // if (token) {
  //   const res = await fetch("https://api.fonnte.com/send", {
  //     method: "POST",
  //     headers: { Authorization: token, "Content-Type": "application/x-www-form-urlencoded" },
  //     body: new URLSearchParams({ target: phone, message }),
  //   });
  //   const data = await res.json().catch(() => ({}));
  //   if (res.ok && data?.status !== false) return { ok: true };
  //   return { ok: false, error: JSON.stringify(data) };
  // }

  return { ok: false, error: "WhatsApp gateway not configured" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body?.phone ?? "");
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

    // Anti-enumeration: always return success even if not found
    if (!profile) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newPassword = randomPassword(10);
    const { error: updErr } = await admin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
    });
    if (updErr) throw updErr;

    const message =
      `Halo ${profile.full_name || "Sahabat"},\n\n` +
      `Password baru akun Teras Dakwah Anda: *${newPassword}*\n\n` +
      `Silakan masuk lalu segera ubah password dari menu Profil > Ubah password.`;

    const delivery = await sendWhatsApp(phone, message);

    await admin.from("password_resets").insert({
      user_id: profile.id,
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
