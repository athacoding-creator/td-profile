const CODES = "AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG KP MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW".split(" ");

export function getCountries(lang: string) {
  let dn: Intl.DisplayNames | null = null;
  try { dn = new Intl.DisplayNames([lang], { type: "region" }); } catch { /* ignore */ }
  return CODES.map((code) => ({ code, name: dn?.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
}

export function countryName(code: string, lang = "en") {
  try { return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code; } catch { return code; }
}

// Calling code -> ISO (longest prefix wins)
const DIAL: Record<string, string> = {
  "62": "ID", "60": "MY", "65": "SG", "673": "BN", "66": "TH", "63": "PH", "84": "VN", "81": "JP",
  "82": "KR", "86": "CN", "852": "HK", "886": "TW", "91": "IN", "92": "PK", "880": "BD", "966": "SA",
  "971": "AE", "974": "QA", "965": "KW", "968": "OM", "973": "BH", "20": "EG", "90": "TR", "44": "GB",
  "49": "DE", "33": "FR", "31": "NL", "39": "IT", "34": "ES", "61": "AU", "64": "NZ", "1": "US",
  "7": "RU", "27": "ZA", "670": "TL", "95": "MM", "855": "KH", "856": "LA", "962": "JO", "212": "MA",
};

export function guessCountryFromPhone(phone?: string | null): string {
  const p = (phone ?? "").replace(/\D/g, "");
  for (const len of [3, 2, 1]) {
    const c = DIAL[p.slice(0, len)];
    if (c) return c;
  }
  return "ID";
}
