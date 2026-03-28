export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const isValidEmail = (email: string) => {
  // Intentionally simple (avoid rejecting valid-but-uncommon emails)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const normalizeName = (name: string) =>
  name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s.'-]/gu, "")
    .slice(0, 80);

export const normalizeOtp = (otp: string) => otp.replace(/\D/g, "").slice(0, 8);

export const isValidE164 = (phone: string) => /^\+[1-9]\d{7,14}$/.test(phone);

export const normalizePhoneE164 = (
  rawPhone: string,
  defaultCountryCode = "+91"
) => {
  const trimmed = rawPhone.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }

  const cc = defaultCountryCode.trim().startsWith("+")
    ? defaultCountryCode.trim()
    : `+${defaultCountryCode.trim()}`;
  const ccDigits = cc.replace(/\D/g, "");
  return `+${ccDigits}${digits}`;
};
