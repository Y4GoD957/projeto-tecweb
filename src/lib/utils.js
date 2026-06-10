import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

export function formatPercent(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function sanitizeText(value) {
  return String(value || '').trim()
}

export function createId() {
  return crypto.randomUUID()
}

export function getInitials(email) {
  const localPart = String(email || '').split('@')[0]
  return localPart.slice(0, 2).toUpperCase() || 'PI'
}

export function getVariationTone(value) {
  if (value > 0) return 'text-emerald-300'
  if (value < 0) return 'text-rose-300'
  return 'text-zinc-300'
}

export function formatDateTime(value) {
  if (!value) return 'Sem atualizacao'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sem atualizacao'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}
