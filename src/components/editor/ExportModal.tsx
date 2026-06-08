'use client'

import { useState, useEffect } from 'react'
import { Download, FileImage, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAlbum } from '@/hooks/useAlbums'
import { useCreateExport, useExportStatus, useExportDownload } from '@/hooks/useExports'
import { useOpenRazorpay, useVerifyPayment } from '@/hooks/usePayment'
import type { ExportType, AlbumSize } from '@/types'

interface ExportModalProps {
  open: boolean
  onClose: () => void
  albumId: string
}

type ExportFormat = 'jpg' | 'pdf'

interface PaymentRequiredData {
  payment_required: true
  amount: number
  order: {
    id: string
    amount: number
    currency: string
    key: string
  }
}

const FORMATS: { value: ExportFormat; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'jpg', label: 'JPG', icon: FileImage, description: 'Best for sharing, smaller size' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'All spreads in one print-ready file' },
]

export function ExportModal({ open, onClose, albumId }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('jpg')
  const [exportId, setExportId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  const { data: album } = useAlbum(albumId)
  const createExport = useCreateExport()
  const { data: exportJob } = useExportStatus(exportId)
  const downloadExport = useExportDownload()
  const openRazorpay = useOpenRazorpay()
  const verifyPayment = useVerifyPayment()

  // When export completes, fetch download URL and trigger download
  useEffect(() => {
    if (exportJob?.status !== 'completed' || !exportId) return

    downloadExport.mutate(exportId, {
      onSuccess: (res) => {
        const url = res.download_url
        if (!url) return
        const link = document.createElement('a')
        link.href = url
        link.download = `album-export.${format}`
        link.click()
      },
      onError: () => {
        setErrorMsg('Could not retrieve download URL. Please try again.')
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportJob?.status, exportId])

  const submitExport = (paymentId?: string) => {
    if (!album) return
    createExport.mutate(
      {
        album_id: albumId,
        export_type: format as ExportType,
        size_preset: album.size as AlbumSize,
        dpi: 300,
        ...(paymentId ? { payment_id: paymentId } : {}),
      },
      {
        onSuccess: (exp) => setExportId(exp.id),
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 402) {
            const data = err.response.data as PaymentRequiredData
            if (data?.payment_required && data?.order) {
              handlePaymentRequired(data.order, album.size as AlbumSize)
              return
            }
          }
          setErrorMsg(err instanceof Error ? err.message : 'Export failed')
        },
      }
    )
  }

  const handlePaymentRequired = (
    order: PaymentRequiredData['order'],
    albumSize: AlbumSize,
  ) => {
    setPaying(true)
    void openRazorpay({
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      description: `Export album (${albumSize})`,
      modal: {
        ondismiss: () => setPaying(false),
      },
      handler: (response) => {
        ;(async () => {
          try {
            const verification = await verifyPayment.mutateAsync({
              razorpay_order_id: response.razorpay_order_id!,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              purpose: 'export',
            })
            setPaying(false)
            submitExport(verification.payment_id)
          } catch {
            setPaying(false)
            setErrorMsg('Payment verification failed. Please try again.')
          }
        })()
      },
    })
  }

  const handleExport = () => {
    setErrorMsg(null)
    setExportId(null)
    submitExport()
  }

  const handleClose = () => {
    setExportId(null)
    setErrorMsg(null)
    setPaying(false)
    onClose()
  }

  const isProcessing =
    paying ||
    createExport.isPending ||
    verifyPayment.isPending ||
    exportJob?.status === 'pending' ||
    exportJob?.status === 'processing' ||
    (exportJob?.status === 'completed' && downloadExport.isPending)

  const isDone = exportJob?.status === 'completed' && !downloadExport.isPending && !downloadExport.isIdle

  const statusLabel = () => {
    if (paying) return 'Waiting for payment…'
    if (createExport.isPending) return 'Queuing export…'
    if (verifyPayment.isPending) return 'Verifying payment…'
    if (exportJob?.status === 'pending') return 'Waiting in queue…'
    if (exportJob?.status === 'processing') return 'Generating export…'
    if (exportJob?.status === 'completed' && downloadExport.isPending) return 'Preparing download…'
    return null
  }

  if (isDone) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">Downloaded!</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Your album has been saved to your Downloads folder.
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Continue Editing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export Album
          </DialogTitle>
          <DialogDescription>
            Export is processed server-side at full resolution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Format */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map(({ value, label, icon: Icon, description }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  disabled={isProcessing}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    format === value
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:border-primary/40',
                    isProcessing && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className={cn('h-5 w-5 mb-1.5', format === value ? 'text-primary' : 'text-muted-foreground')} />
                  <p className={cn('font-semibold text-sm', format === value ? 'text-primary' : 'text-foreground')}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground leading-relaxed">
            {album
              ? `Exporting ${album.size}" album at 300 DPI. Processing happens server-side — download will start automatically when ready.`
              : 'Loading album info…'}
          </div>

          {/* Status / Error */}
          {isProcessing && statusLabel() && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {statusLabel()}
            </div>
          )}
          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="flex-1 gap-2"
              disabled={isProcessing || !album}
              onClick={handleExport}
            >
              {isProcessing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                : <><Download className="h-4 w-4" /> Export {format.toUpperCase()}</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
