import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  clearSession,
  createSession,
  getSession,
  getUserByEmail,
  upsertUser,
} from '../lib/storage'
import { sanitizeText } from '../lib/utils'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    const storedUser = session?.email ? getUserByEmail(session.email) : null
    setUser(storedUser)
    setLoading(false)
  }, [])

  function login({ email, password }) {
    const normalizedEmail = sanitizeText(email).toLowerCase()
    const normalizedPassword = sanitizeText(password)

    if (!normalizedEmail.includes('@')) {
      return { ok: false, message: 'Informe um e-mail valido.' }
    }

    if (normalizedPassword.length < 6) {
      return { ok: false, message: 'A senha deve ter pelo menos 6 caracteres.' }
    }

    const existingUser = getUserByEmail(normalizedEmail)
    if (existingUser && existingUser.password !== normalizedPassword) {
      return { ok: false, message: 'Senha incorreta para esta conta local.' }
    }

    const nextUser =
      existingUser ||
      upsertUser({
        email: normalizedEmail,
        password: normalizedPassword,
        portfolio: [],
        createdAt: new Date().toISOString(),
      })

    createSession(nextUser.email)
    setUser(nextUser)
    return { ok: true, user: nextUser }
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  function refreshUser() {
    if (!user?.email) return null
    const updatedUser = getUserByEmail(user.email)
    setUser(updatedUser)
    return updatedUser
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser, setUser }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
