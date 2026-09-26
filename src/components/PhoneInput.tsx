import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Daftar kode negara umum (utamanya yang sering dipakai jamaah)
const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "62", name: "Indonesia", flag: "🇮🇩" },
  { code: "60", name: "Malaysia", flag: "🇲🇾" },
  { code: "65", name: "Singapura", flag: "🇸🇬" },
  { code: "673", name: "Brunei", flag: "🇧🇳" },
  { code: "66", name: "Thailand", flag: "🇹🇭" },
  { code: "63", name: "Filipina", flag: "🇵🇭" },
  { code: "84", name: "Vietnam", flag: "🇻🇳" },
  { code: "95", name: "Myanmar", flag: "🇲🇲" },
  { code: "855", name: "Kamboja", flag: "🇰🇭" },
  { code: "856", name: "Laos", flag: "🇱🇦" },
  { code: "81", name: "Jepang", flag: "🇯🇵" },
  { code: "82", name: "Korea Selatan", flag: "🇰🇷" },
  { code: "86", name: "Tiongkok", flag: "🇨🇳" },
  { code: "886", name: "Taiwan", flag: "🇹🇼" },
  { code: "852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "91", name: "India", flag: "🇮🇳" },
  { code: "92", name: "Pakistan", flag: "🇵🇰" },
  { code: "880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "966", name: "Arab Saudi", flag: "🇸🇦" },
  { code: "971", name: "Uni Emirat Arab", flag: "🇦🇪" },
  { code: "974", name: "Qatar", flag: "🇶🇦" },
  { code: "965", name: "Kuwait", flag: "🇰🇼" },
  { code: "90", name: "Turki", flag: "🇹🇷" },
  { code: "44", name: "Inggris", flag: "🇬🇧" },
  { code: "49", name: "Jerman", flag: "🇩🇪" },
  { code: "31", name: "Belanda", flag: "🇳🇱" },
  { code: "33", name: "Prancis", flag: "🇫🇷" },
  { code: "61", name: "Australia", flag: "🇦🇺" },
  { code: "1", name: "Amerika/Kanada", flag: "🇺🇸" },
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
        className="h-10 w-[130px] shrink-0 rounded-md border border-accent/20 bg-card/50 px-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
        aria-label="Kode negara"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.code}
          </option>
        ))}
      </select>
      <Input
        type="tel"
        inputMode="tel"
        placeholder={dialCode === "62" ? "81234567890" : "Nomor tanpa kode negara"}
        value={local}
        onChange={(e) => handleLocal(e.target.value)}
        required={required}
        maxLength={15}
        className="bg-card/50 border-accent/20 placeholder:text-muted-foreground text-foreground focus:border-accent focus:ring-accent/50"
      />
    </div>
  );
}
