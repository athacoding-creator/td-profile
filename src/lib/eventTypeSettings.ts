export type RegistrationType = "free" | "infaq" | "paid";

export type EventTypeRecord = {
  value: string;
  label: string;
  default_registration_type: RegistrationType;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export const REGISTRATION_TYPE_OPTIONS: { value: RegistrationType; label: string }[] = [
  { value: "free", label: "Gratis" },
  { value: "infaq", label: "Berinfaq" },
  { value: "paid", label: "Wajib Bayar" },
];

export const registrationTypeLabel = (value?: string | null) =>
  REGISTRATION_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Gratis";

export const getDefaultRegistrationType = (
  eventType: string | null | undefined,
  eventTypes: Pick<EventTypeRecord, "value" | "default_registration_type">[],
): RegistrationType => {
  const configured = eventTypes.find((type) => type.value === eventType)?.default_registration_type;
  return configured ?? "free";
};

export const isRegistrationType = (value: string): value is RegistrationType =>
  REGISTRATION_TYPE_OPTIONS.some((option) => option.value === value);

export const paymentFieldsForEvent = ({
  registrationType, price, minInfaq, maxInfaq, usesPositionPricing = false,
}: {
  registrationType?: string | null;
  price?: number | string | null;
  minInfaq?: number | string | null;
  maxInfaq?: number | string | null;
  usesPositionPricing?: boolean;
}) => {
  const type: RegistrationType = isRegistrationType(registrationType ?? "") ? registrationType as RegistrationType : "free";
  return {
    registration_type: type,
    price: type === "paid" && !usesPositionPricing ? Number(price ?? 0) : 0,
    min_infaq: type === "infaq" ? Number(minInfaq ?? 0) : 0,
    max_infaq: type === "infaq" ? Number(maxInfaq ?? 0) : 0,
  };
};
