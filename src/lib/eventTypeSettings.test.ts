import { describe, expect, it } from "vitest";
import {
  getDefaultRegistrationType,
  isRegistrationType,
  paymentFieldsForEvent,
  registrationTypeLabel,
  REGISTRATION_TYPE_OPTIONS,
} from "./eventTypeSettings";

describe("event type payment defaults", () => {
  const types = [
    { value: "kajian", default_registration_type: "free" as const },
    { value: "donasi", default_registration_type: "infaq" as const },
    { value: "kelas-kajian", default_registration_type: "paid" as const },
  ];

  it.each([
    ["kajian", "free"],
    ["donasi", "infaq"],
    ["kelas-kajian", "paid"],
  ])("uses the configured %s default", (value, expected) => {
    expect(getDefaultRegistrationType(value, types)).toBe(expected);
  });

  it("falls back to free for an unknown or legacy-unconfigured type", () => {
    expect(getDefaultRegistrationType("legacy", types)).toBe("free");
  });

  it("keeps all event-level payment choices available for overrides", () => {
    expect(REGISTRATION_TYPE_OPTIONS.map((option) => option.value)).toEqual(["free", "infaq", "paid"]);
    expect(isRegistrationType("free")).toBe(true);
    expect(isRegistrationType("infaq")).toBe(true);
    expect(isRegistrationType("paid")).toBe(true);
    expect(isRegistrationType("unknown")).toBe(false);
    expect(registrationTypeLabel("paid")).toBe("Wajib Bayar");
  });

  it.each([
    ["free", { registration_type: "free", price: 0, min_infaq: 0, max_infaq: 0 }],
    ["infaq", { registration_type: "infaq", price: 0, min_infaq: 5000, max_infaq: 50000 }],
    ["paid", { registration_type: "paid", price: 125000, min_infaq: 0, max_infaq: 0 }],
  ])("serializes the event-level %s override without changing the type default", (registrationType, expected) => {
    expect(paymentFieldsForEvent({ registrationType, price: 125000, minInfaq: 5000, maxInfaq: 50000 })).toEqual(expected);
  });
});
