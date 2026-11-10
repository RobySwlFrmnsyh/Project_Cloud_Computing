const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const timeFormatter = new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' })

export function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0)
}

export function formatDate(value) {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : '-'
}

export function formatDateTime(value) {
  const date = toDate(value)
  return date ? dateTimeFormatter.format(date) : '-'
}

export function formatTime(value) {
  const date = toDate(value)
  return date ? timeFormatter.format(date) : '-'
}

export function isSameDay(first, second) {
  const a = toDate(first)
  const b = toDate(second)
  if (!a || !b) return false
  return a.toDateString() === b.toDateString()
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}
