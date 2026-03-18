function pad(value: number): string {
  return `${value}`.padStart(2, '0')
}

export function normalizeTimeZone(timeZone?: string | null): string | undefined {
  if (!timeZone) return undefined

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return timeZone
  } catch {
    return undefined
  }
}

export function getDateKey(date: Date, timeZone?: string): string {
  const normalized = normalizeTimeZone(timeZone)
  if (normalized) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: normalized,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)

    const year = parts.find(part => part.type === 'year')?.value
    const month = parts.find(part => part.type === 'month')?.value
    const day = parts.find(part => part.type === 'day')?.value
    if (year && month && day) return `${year}-${month}-${day}`
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function dateKeyToLocalDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey)
  date.setUTCDate(date.getUTCDate() + days)
  return getDateKey(date, 'UTC')
}

export function diffDays(fromDateKey: string, toDateKey: string): number {
  return Math.round((parseDateKey(toDateKey).getTime() - parseDateKey(fromDateKey).getTime()) / 86400000)
}
