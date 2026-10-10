import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the cookie when the page loads
  useEffect(() => {
    api
      .get('/users/session')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const signup = useCallback(async (fields) => {
    const res = await api.post('/users/signup', fields)
    setUser(res.data.user)
  }, [])

  const login = useCallback(async (fields) => {
    const res = await api.post('/users/login', fields)
    setUser(res.data.user)
  }, [])

  const logout = useCallback(async () => {
    await api.post('/users/logout')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, setUser, loading, signup, login, logout }),
    [user, loading, signup, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
