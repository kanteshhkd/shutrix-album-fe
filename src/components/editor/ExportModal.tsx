'use client'

import { useState } from 'react'
import { Download, FileImage, FileText, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RazorpayModal } from '@/components/payments/RazorpayModal'
import { useCreateExport } from '@/hooks/useExports'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'
import type { ExportType, AlbumSize } from '@/types'

interface ExportModalProps {
  open: boolean
  onClose: () => void
  albumId: string
}

const EXPORT_TYPES: { value: ExportType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'jpg', label: 'JPG', icon: FileImage, description: 'High quality images, smaller file size' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Print-ready PDF with all pages' },
]

const SIZES: { value: AlbumSize; label: string }[] = [
  { value: '12x36', label: '12 × 36 inches' },
  { value: '12x30', label: '12 × 30 inches' },
  { value: '10x24', label: '10 × 24 inches' },
]

export function ExportModal({ open, onClose, albumId }: ExportModalProps) {
  const [exportType, setExportType] = useState<ExportType>('jpg')
  const [size, setSize] = useState<AlbumSize>('12x36')
  const [showPayment, setShowPayment] = useState(false)
  const [exported, setExported] = useState(false)

  const { user } = useAuthStore()
  const createExport = useCreateExport()

  const isPaidPlan = user?.subscription?.plan_id !== 'free'
  const exportPrice = 99 // ₹99 per export for free users

  const handleExport = async (paymentId?: string) => {
    await createExport.mutateAsync({
      album_id: albumId,
      export_type: exportType,
      size,
      dpi: 300,
      payment_id: paymentId,
    })
    setExported(true)
  }

  const handleExportClick = () => {
    if (!isPaidPlan) {
      setShowPayment(true)
    } else {
      handleExport()
    }
  }

  if (exported) {
    return (
      <Dialog open={open} onOpenChange={() => { onClose(); setExported(false) }}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-foreground">Export Queued!</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Your album is being exported at 300 DPI. You&apos;ll be notified when it&apos;s ready for download.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { onClose(); setExported(false) }}>
                Continue Editing
              </Button>
              <Button variant="gold" className="flex-1" onClick={() => window.open('/exports', '_blank')}>
                View Exports
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open && !showPayment} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Download className="h-5 w-5 text-gold" />
              Export Album
            </DialogTitle>
            <DialogDescription>
              Export your album at print-ready 300 DPI quality
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Export type */}
            <div className="space-y-2">
              <Label>Export Format</Label>
              <div className="grid grid-cols-2 gap-3">
                {EXPORT_TYPES.map(({ value, label, icon: Icon, description }) => (
                  <button
                    key={value}
                    onClick={() => setExportType(value)}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      exportType === value
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50'
                    )}
                  >
                    <Icon className={cn('h-6 w-6 mb-2', exportType === value ? 'text-primary' : 'text-muted-foreground')} />
                    <p className={cn('font-semibold text-sm', exportType === value ? 'text-primary' : 'text-foreground')}>
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <Label>Album Size</Label>
              <div className="space-y-2">
                {SIZES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSize(value)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left text-sm flex items-center justify-between transition-all',
                      size === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    <span>{label}</span>
                    <span className="text-xs opacity-70">300 DPI</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing notice for free users */}
            {!isPaidPlan && (
              <div className="p-3 bg-gold/5 border border-gold/20 rounded-lg text-sm">
                <p className="text-gold font-medium">₹{exportPrice} per export</p>
                <p className="text-muted-foreground mt-0.5">
                  Upgrade to Starter for unlimited exports
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="gold"
                className="flex-1"
                disabled={createExport.isPending}
                onClick={handleExportClick}
              >
                {createExport.isPending ? 'Queuing...' : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    {!isPaidPlan ? `Pay ₹${exportPrice} & Export` : 'Export Album'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RazorpayModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        purpose="export"
        amount={exportPrice}
        description={`Export album as ${exportType.toUpperCase()} at ${size}"`}
        albumId={albumId}
        exportType={exportType}
        onSuccess={(paymentId) => {
          setShowPayment(false)
          handleExport(paymentId)
        }}
      />
    </>
  )
}
