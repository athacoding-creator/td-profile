import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Daftar kode negara umum (utamanya yang sering dipakai jamaah)
const COUNTRIES: { code: string; flag: string }[] = [
  { code: "62", flag: "🇮🇩" },
  { code: "60", flag: "🇲🇾" },
  { code: "65", flag: "🇸🇬" },
  { code: "673", flag: "🇧🇳" },
  { code: "66", flag: "🇵🇭" },
  { code: "84", flag: "🇻🇳" },
  { code: "95", flag: "🇲🇲" },
  { code: "855", flag: "🇰🇭" },
  { code: "856", flag: "🇱🇦" },
  { code: "81", flag: "🇯🇵" },
  { code: "82", flag: "🇰🇷" },
  { code: "86", flag: "🇨🇳" },
  { code: "886", flag: "🇹🇼" },
  { code: "852", flag: "🇭🇰" },
  { code: "91", flag: "🇮🇳" },
  { code: "92", flag: "🇵🇰" },
  { code: "880", flag: "🇧🇩" },
  { code: "966", flag: "🇸🇦" },
  { code: "971", flag: "🇦🇪" },
  { code: "974", flag: "🇶🇦" },
  { code: "965", flag: "🇰🇼" },
  { code: "90", flag: "🇹🇷" },
  { code: "44", flag: "🇬🇧" },
  { code: "49",flag: "🇩🇪" },
  { code: "31", flag: "🇳🇱" },
  { code: "33", flag: "🇫🇷" },
  { code: "61", flag: "🇦🇺" },
  { code: "1", flag: "🇺🇸" },
];

interface PhoneInputProps {
  /** Nomor lengkap dalam format internasional tanpa "+" (mis. "62812...") */
  value: string;
  onChange: (fullNumber: string) => void;
  required?: boolean;
  className?: string;
}

/**
 * Input nomor WhatsApp dengan pemilih kode negara.
 * Pengguna cukup memilih negara lalu mengetik nomor lokalnya
 * (angka 0 di depan otomatis dibuang).
 */
export function PhoneInput({ value, onChange, required, className }: PhoneInputProps) {
  const [dialCode, setDialCode] = useState("62");
  const [local, setLocal] = useState("");

  const emit = (code: string, localNum: string) => {
    const digits = localNum.replace(/\D/g, "").replace(/^0+/, "");
    onChange(digits ? code + digits : "");
  };

  const handleCode = (code: string) => {
    setDialCode(code);
    emit(code, local);
  };

  const handleLocal = (num: string) => {
    setLocal(num);
    emit(dialCode, num);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <select
        value={dialCode}
        onChange={(e) => handleCode(e.target.value)}
        className="h-10 w-[100px] shrink-0 rounded-md border border-accent/20 bg-card/50 px-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        aria-label="Kode negara"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} (+{c.code})
          </option>
        ))}
      </select>
      <Input
        type="tel"
        inputMode="tel"
        placeholder={dialCode === "62" ? "81234567890" : "1234567890"}
        value={local}
        onChange={(e) => handleLocal(e.target.value)}
        required={required}
        maxLength={15}
        className="bg-card/50 border-accent/20 placeholder:text-muted-foreground text-foreground focus:border-accent focus:ring-accent/50"
      />
    </div>
  );
}
