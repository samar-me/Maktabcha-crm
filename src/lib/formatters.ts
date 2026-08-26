import { format, parseISO } from "date-fns";
import { uz } from "date-fns/locale";

/**
 * Formats a numeric amount to Uzbek Som format: e.g. "150 000 so‘m"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "0 so‘m";
  }
  const formatted = new Intl.NumberFormat("ru-RU").format(Math.round(amount));
  return `${formatted.replace(/,/g, " ")} so‘m`;
}

/**
 * Formats a date string or Date object into Uzbek format: e.g. "26-fevral, 2025" or "26.02.2025"
 */
export function formatDate(date: string | Date | null | undefined, pattern: string = "dd.MM.yyyy"): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, pattern, { locale: uz });
  } catch {
    return "—";
  }
}

/**
 * Formats a phone number for display: e.g. +998 90 123 45 67
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 12 && cleaned.startsWith("998")) {
    return `+998 (${cleaned.slice(3, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8, 10)}-${cleaned.slice(10, 12)}`;
  }
  if (cleaned.length === 9) {
    return `+998 (${cleaned.slice(0, 2)}) ${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}-${cleaned.slice(7, 9)}`;
  }
  return phone;
}
