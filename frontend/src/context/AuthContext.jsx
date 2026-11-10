import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bootError, setBootError] = useState('')

  useEffect(() => {
    let active = true

    async function startFreshSession() {
      try {
        await api.post('/auth/logout')
      } catch (error) {
        if (active) setBootError(error.message)
      } finally {
        if (active) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    startFreshSession()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (payload) => {
    const data = await api.post('/auth/register', payload)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const data = await api.get('/users/me')
    setUser(data.user)
    return data.user
  }, [])

  const updateProfile = useCallback(async (patch) => {
    const data = await api.patch('/users/me', patch)
    setUser(data.user)
    return data.user
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const data = await api.patch('/users/me/password', {
      currentPassword,
      newPassword,
    })
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      bootError,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [
      user,
      loading,
      bootError,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider')
  }
  return context
}
