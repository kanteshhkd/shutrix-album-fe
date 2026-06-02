'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Crown, Zap, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCreateSubscription, useOpenRazorpay, useVerifyPayment } from '@/hooks/usePayment'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { cn, formatCurrency } from '@/lib/utils'
import type { PlanId } from '@/types'

const PLANS = [
  {
    id: 'free' as PlanId,
    name: 'Free',
    price: 0,
    icon: Star,
    description: 'Perfect to get started',
    features: [
      '3 albums',
      '5 GB storage',
      'Basic templates',
      'Watermarked exports',
      'JPG export only',
    ],
    limitations: ['Watermark on exports', 'No premium templates', 'Limited storage'],
  },
  {
    id: 'starter' as PlanId,
    name: 'Starter',
    price: 799,
    icon: Zap,
    description: 'For growing photographers',
    popular: true,
    features: [
      'Unlimited albums',
      '20 GB storage',
      'All free templates',
      'HD exports (no watermark)',
      'JPG + PDF export',
      'Priority support',
    ],
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    price: 1999,
    icon: Crown,
    description: 'For professionals',
    features: [
      'Everything in Starter',
      '100 GB storage',
      'Premium templates',
      'Priority exports',
      'Custom branding',
      'Dedicated support',
      'API access',
    ],
  },
]

export function SubscriptionPlans() {
  const [loading, setLoading] = useState<PlanId | null>(null)
  const { user } = useAuthStore()
  const createSubscription = useCreateSubscription()
  const openRazorpay = useOpenRazorpay()
  const verifyPayment = useVerifyPayment()
  const queryClient = useQueryClient()

  const currentPlanId = user?.subscription?.plan_id || 'free'

  const handleUpgrade = async (planId: PlanId) => {
    if (planId === 'free' || planId === currentPlanId) return

    setLoading(planId)
    try {
      const sub = await createSubscription.mutateAsync(planId)
      if (!sub?.subscription_id) return

      await openRazorpay({
        subscription_id: sub.subscription_id,
        handler: async (response) => {
          await verifyPayment.mutateAsync({
            razorpay_order_id: '',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            purpose: 'subscription',
            plan_id: planId,
          })
          queryClient.invalidateQueries({ queryKey: ['currentUser'] })
        },
        modal: {
          ondismiss: () => setLoading(null),
        },
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PLANS.map((plan, i) => {
        const Icon = plan.icon
        const isCurrent = plan.id === currentPlanId
        const isPopular = plan.popular

        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className={cn(
              'relative flex flex-col h-full',
              isCurrent && 'border-primary/50 bg-primary/5',
              isPopular && !isCurrent && 'border-gold/50',
            )}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="gold" className="px-3 py-1">Most Popular</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1 bg-primary text-primary-foreground">Current Plan</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3',
                  isCurrent ? 'bg-primary/20' : isPopular ? 'bg-gold/20' : 'bg-muted'
                )}>
                  <Icon className={cn(
                    'h-6 w-6',
                    isCurrent ? 'text-primary' : isPopular ? 'text-gold' : 'text-muted-foreground'
                  )} />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-3">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold text-foreground">Free</span>
                  ) : (
                    <div>
                      <span className="text-4xl font-bold text-foreground">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-foreground">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : isPopular ? 'gold' : 'default'}
                  disabled={isCurrent || plan.id === 'free' || loading !== null}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {loading === plan.id
                    ? 'Processing...'
                    : isCurrent
                      ? 'Current Plan'
                      : plan.id === 'free'
                        ? 'Free Forever'
                        : `Upgrade to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
