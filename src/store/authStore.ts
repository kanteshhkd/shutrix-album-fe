import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { getToken, setToken, removeToken, setCurrentUser } from '@/lib/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: User, token: string) => void
  setUser: (user: User) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: typeof window !== 'undefined' ? getToken() : null,
      isAuthenticated: typeof window !== 'undefined' ? !!getToken() : false,
      isLoading: false,

      setAuth: (user, token) => {
        setToken(token)
        setCurrentUser(user)
        set({ user, token, isAuthenticated: true })
      },

      setUser: (user) => {
        setCurrentUser(user)
        set({ user })
      },

      logout: () => {
        removeToken()
        set({ user: null, token: null, isAuthenticated: false })
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'shutrix-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
