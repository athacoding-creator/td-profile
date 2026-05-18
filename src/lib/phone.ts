// Normalize Indonesian WhatsApp phone numbers to international 628xxx format.
// Accepts inputs like: 08xxx, +628xxx, 628xxx, 8xxx (with spaces/dashes).
export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function isValidPhone(phone: string): boolean {
  // 628xxx, total 10-15 digits
  return /^628\d{7,12}$/.test(phone);
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
  // 62 812 3456 7890
  return "+" + p.replace(/^(62)(\d{3})(\d{4})(\d+)/, "$1 $2 $3 $4");
}
