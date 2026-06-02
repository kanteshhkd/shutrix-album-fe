import { useMutation } from '@tanstack/react-query'
import apiClient, { getApiError } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import type {
  RazorpayOrder,
  CreateOrderRequest,
  VerifyPaymentRequest,
  RazorpayOptions,
  ApiResponse,
  PlanId,
} from '@/types'

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (data: CreateOrderRequest) => {
      const res = await apiClient.post<ApiResponse<RazorpayOrder>>('/payments/order', data)
      return res.data.data
    },
  })
}

export function useVerifyPayment() {
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (data: VerifyPaymentRequest) => {
      const res = await apiClient.post<ApiResponse<{ verified: boolean; payment_id: string }>>(
        '/payments/verify',
        data
      )
      return res.data.data
    },
    onError: (error) => {
      addToast({ title: 'Payment verification failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useCreateSubscription() {
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (planId: PlanId) => {
      const res = await apiClient.post<ApiResponse<{ subscription_id: string }>>(
        '/payments/subscription',
        { plan_id: planId }
      )
      return res.data.data
    },
    onError: (error) => {
      addToast({ title: 'Subscription failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useCancelSubscription() {
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<{ message: string }>>('/payments/subscription/cancel')
      return res.data
    },
    onSuccess: () => {
      addToast({ title: 'Subscription cancelled', description: 'Your plan will remain active until the end of the billing period', variant: 'success' })
    },
    onError: (error) => {
      addToast({ title: 'Cancellation failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useOpenRazorpay() {
  const { user } = useAuthStore()
  const { addToast } = useUIStore()

  const loadScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  return async (options: Omit<RazorpayOptions, 'key' | 'name' | 'prefill'>) => {
    const loaded = await loadScript()
    if (!loaded) {
      addToast({ title: 'Payment unavailable', description: 'Could not load payment gateway', variant: 'destructive' })
      return
    }

    const rzpOptions: RazorpayOptions = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
      name: 'Shutrix Album Studio',
      description: 'Premium Wedding Album Design',
      prefill: {
        name: user?.name,
        email: user?.email,
      },
      theme: { color: '#c9a84c' },
      ...options,
    }

    const rzp = new window.Razorpay(rzpOptions)
    rzp.open()
  }
}
