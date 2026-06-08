import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { getToken, getRefreshToken, setToken, setRefreshToken, removeToken } from './auth'
import type { ApiError, RefreshResponse } from '@/types'

const BASE_URL = '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
})

// ── Request interceptor — attach access token ─────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — silent token refresh on 401 ───────────────────────
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token as string)
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken()

      if (!refreshToken) {
        // No refresh token — hard logout
        removeToken()
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue any other requests while refresh is in progress
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post<RefreshResponse>(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
        )

        const { access_token, refresh_token: newRefresh } = res.data

        // Persist new tokens
        setToken(access_token)
        setRefreshToken(newRefresh)

        // Update Zustand store (lazy import to avoid circular deps)
        import('@/store/authStore').then(({ useAuthStore }) => {
          useAuthStore.getState().updateTokens(access_token, newRefresh)
        })

        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        removeToken()
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message
    }
    if (axiosError.response?.data?.errors) {
      const errors = axiosError.response.data.errors
      const firstKey = Object.keys(errors)[0]
      if (firstKey && errors[firstKey]?.[0]) {
        return errors[firstKey][0]
      }
    }
    return axiosError.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export default apiClient
