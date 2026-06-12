import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import apiClient, { getApiError } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import type { User, LoginRequest, RegisterRequest, ApiResponse, LoginResponse } from '@/types'

export function useCurrentUser() {
  const { isAuthenticated, setUser } = useAuthStore()

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User>>('/auth/me')
      const user = res.data.data
      setUser(user)
      return user
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
    retry: false,
  })
}

export function useLogin() {
  const { setAuth } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const res = await apiClient.post<LoginResponse>('/auth/shutrix', data)
      return res.data
    },
    onSuccess: ({ user, access_token, refresh_token }) => {
      // Use the correct field names from the API response
      setAuth(user, access_token, refresh_token)
      queryClient.setQueryData(['currentUser'], user)
      addToast({ title: 'Welcome back!', description: `Logged in as ${user.email}`, variant: 'success' })
      router.push('/dashboard')
    },
    onError: (error) => {
      addToast({ title: 'Login failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useRegister() {
  const { setAuth } = useAuthStore()
  const { addToast } = useUIStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await apiClient.post<LoginResponse>('/auth/register', data)
      return res.data
    },
    onSuccess: ({ user, access_token, refresh_token }) => {
      setAuth(user, access_token, refresh_token)
      queryClient.setQueryData(['currentUser'], user)
      addToast({ title: 'Account created!', description: 'Welcome to Shutrix Album Studio', variant: 'success' })
      router.push('/dashboard')
    },
    onError: (error) => {
      addToast({ title: 'Registration failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useForgotPassword() {
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email })
      return res.data
    },
    onSuccess: () => {
      addToast({ title: 'Email sent', description: 'Check your inbox for reset instructions', variant: 'success' })
    },
    onError: (error) => {
      addToast({ title: 'Error', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return () => {
    apiClient.post('/auth/logout').catch(() => { })
    logout()
    queryClient.clear()
    router.push('/login')
  }
}
