const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const HOSPITAL_OPTIONS = [
  "SWACS Hospital",
  "MetroCare Hospital",
  "City General Hospital",
  "Lifeline Multispecialty Hospital",
  "Sunrise Medical Center",
] as const;

const HOSPITAL_LOOKUP = new Map<string, string>(
  HOSPITAL_OPTIONS.map((hospital) => [hospital.toLowerCase(), hospital])
);

export const APPOINTMENT_AMOUNT_RUPEES = 200;
export const APPOINTMENT_AMOUNT_PAISE = APPOINTMENT_AMOUNT_RUPEES * 100;

export const normalizeHospital = (value: unknown) => {
  const normalized = asString(value).toLowerCase();
  return normalized ? HOSPITAL_LOOKUP.get(normalized) ?? null : null;
};

export const normalizeHospitals = (value: unknown) => {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const unique = new Set<string>();
  for (const item of items) {
    const hospital = normalizeHospital(item);
    if (hospital) unique.add(hospital);
  }

  return unique.size ? Array.from(unique) : ["SWACS Hospital"];
};

export const normalizeFields = (value: unknown, fallback = "") => {
  const base = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const unique = new Set<string>();
  for (const item of base) {
    const field = asString(item).slice(0, 80);
    if (field) unique.add(field);
  }

  const fallbackField = asString(fallback).slice(0, 80);
  if (!unique.size && fallbackField) unique.add(fallbackField);

  return Array.from(unique);
};

export const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

