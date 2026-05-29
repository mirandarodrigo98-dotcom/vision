import { addDays, isHoliday, isWeekend } from '@/lib/holidays';

function cloneDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDismissalDate(value?: string | Date | null): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : cloneDate(value);
  }

  const cleanValue = String(value).trim().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) {
    const [year, month, day] = cleanValue.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(cleanValue);
  return Number.isNaN(parsed.getTime()) ? undefined : cloneDate(parsed);
}

export function formatDismissalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousBusinessDay(date: Date): Date {
  const current = cloneDate(date);

  while (isWeekend(current) || isHoliday(current)) {
    current.setDate(current.getDate() - 1);
  }

  return current;
}

export function calculateDismissalDate(noticeType: string, noticeDateValue?: string | Date | null): Date | undefined {
  const noticeDate = parseDismissalDate(noticeDateValue);
  if (!noticeDate) return undefined;

  if (noticeType === 'Trabalhado') {
    return getPreviousBusinessDay(addDays(noticeDate, 30));
  }

  return cloneDate(noticeDate);
}

export function canRectifyDismissal(dismissalDateValue?: string | Date | null, referenceDate = new Date()): boolean {
  const dismissalDate = parseDismissalDate(dismissalDateValue);
  if (!dismissalDate) return false;

  const today = cloneDate(referenceDate);
  return today.getTime() <= dismissalDate.getTime();
}
