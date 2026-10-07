export const PHONE_PATTERN = /^\d{10}$/;

export function normalizePhone(value: string): string {
  if (PHONE_PATTERN.test(value)) return value;
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}
