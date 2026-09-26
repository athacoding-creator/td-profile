// Normalize phone numbers to international format (digits only, no "+").
// Accepts Indonesian local inputs (08xxx, 8xxx) and international numbers
// with any country code (+60 Malaysia, +81 Japan, +62 Indonesia, dll).
export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  // Local Indonesian formats without country code
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8") && digits.length >= 9 && digits.length <= 13) return "62" + digits;
  return digits;
}

export function isValidPhone(phone: string): boolean {
  // International format: starts with non-zero country code, 8-15 digits total
  return /^[1-9]\d{7,14}$/.test(phone);
}

export function phoneToEmail(phone: string): string {
  return `${phone}@wa.tdprofile.app`;
}

export function emailToPhone(email: string | null | undefined): string {
  if (!email) return "";
  const m = email.match(/^(\d+)@wa\.tdprofile\.(app|local)$/);
  return m ? m[1] : "";
}

export function formatPhoneDisplay(phone: string): string {
  const p = normalizePhone(phone);
  if (!p) return "";
  if (p.startsWith("62")) {
    // 62 812 3456 7890
    return "+" + p.replace(/^(62)(\d{3})(\d{4})(\d+)/, "$1 $2 $3 $4");
  }
  // Generic international: +CC XXXX XXXX ...
  return "+" + p.replace(/^(\d{1,3})(\d{3})(\d{3})(\d+)$/, "$1 $2 $3 $4");
}
