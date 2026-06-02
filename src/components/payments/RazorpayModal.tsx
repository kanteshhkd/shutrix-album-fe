'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Shield, Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useCreateOrder, useVerifyPayment, useOpenRazorpay } from '@/hooks/usePayment'
import { useUIStore } from '@/store/uiStore'
import { formatCurrency } from '@/lib/utils'
import type { ExportType, AlbumSize, PlanId } from '@/types'

interface RazorpayModalProps {
  open: boolean
  onClose: () => void
  purpose: 'export' | 'subscription'
  amount: number
  description: string
  albumId?: string
  exportType?: ExportType
  planId?: PlanId
  onSuccess: (paymentId: string) => void
}

export function RazorpayModal({
  open,
  onClose,
  purpose,
  amount,
  description,
  albumId,
  exportType,
  planId,
  onSuccess,
}: RazorpayModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const createOrder = useCreateOrder()
  const verifyPayment = useVerifyPayment()
  const openRazorpay = useOpenRazorpay()
  const { addToast } = useUIStore()

  const handlePay = async () => {
    setIsProcessing(true)
    try {
      const order = await createOrder.mutateAsync({
        amount,
        currency: 'INR',
        purpose,
        album_id: albumId,
        export_type: exportType,
        plan_id: planId,
      })

      await openRazorpay({
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        handler: async (response) => {
          const verification = await verifyPayment.mutateAsync({
            razorpay_order_id: response.razorpay_order_id || order.id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            purpose,
            album_id: albumId,
            export_type: exportType,
            plan_id: planId,
          })

          if (verification?.verified) {
            addToast({
              title: 'Payment successful',
              description: 'Your payment has been verified',
              variant: 'success',
            })
            onSuccess(response.razorpay_payment_id)
            onClose()
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
          },
        },
      })
    } catch {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gold" />
            Complete Payment
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Amount display */}
          <div className="bg-surface-overlay rounded-xl p-4 text-center">
            <p className="text-muted-foreground text-sm mb-1">Total Amount</p>
            <p className="text-3xl font-bold gold-text">{formatCurrency(amount)}</p>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-400" />
              Secured by Razorpay
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-green-400" />
              256-bit SSL
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="gold" className="flex-1" onClick={handlePay} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By proceeding, you accept our Terms of Service
          </p>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
