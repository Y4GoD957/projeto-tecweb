import { STORAGE_KEYS } from './constants'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getUsers() {
  return readJson(STORAGE_KEYS.users, {})
}

export function getUserByEmail(email) {
  const users = getUsers()
  return users[email] || null
}

export function upsertUser(user) {
  const users = getUsers()
  users[user.email] = user
  writeJson(STORAGE_KEYS.users, users)
  return user
}

export function saveUserPortfolio(email, portfolio) {
  const user = getUserByEmail(email)
  if (!user) return null

  const updatedUser = { ...user, portfolio, updatedAt: new Date().toISOString() }
  upsertUser(updatedUser)
  return updatedUser
}

export function createSession(email) {
  const session = { email, startedAt: new Date().toISOString() }
  writeJson(STORAGE_KEYS.session, session)
  return session
}

export function getSession() {
  return readJson(STORAGE_KEYS.session, null)
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session)
}
