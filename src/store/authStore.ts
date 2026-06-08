import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { getToken, setToken, removeToken, setCurrentUser, setRefreshToken, getRefreshToken } from '@/lib/auth'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  updateTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        setToken(accessToken)
        setRefreshToken(refreshToken)
        setCurrentUser(user)
        set({ user, token: accessToken, refreshToken, isAuthenticated: true })
      },

      setUser: (user) => {
        setCurrentUser(user)
        set({ user })
      },

      updateTokens: (accessToken, refreshToken) => {
        setToken(accessToken)
        setRefreshToken(refreshToken)
        set({ token: accessToken, refreshToken })
      },

      logout: () => {
        removeToken()
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
      },

      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'shutrix-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Re-sync localStorage keys when the store rehydrates
      onRehydrateStorage: () => (state) => {
        if (state?.token) setToken(state.token)
        if (state?.refreshToken) setRefreshToken(state.refreshToken)
        if (state?.user) setCurrentUser(state.user)
      },
    }
  )
)
