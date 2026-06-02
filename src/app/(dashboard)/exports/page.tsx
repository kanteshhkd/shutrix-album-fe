'use client'

import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Download, RefreshCw, AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { useExports } from '@/hooks/useExports'
import type { ExportStatus } from '@/types'

const statusConfig: Record<ExportStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive'; icon: React.ElementType }> = {
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  processing: { label: 'Processing', variant: 'default', icon: Loader2 },
  completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  failed: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
}

export default function ExportsPage() {
  const { data, isLoading, refetch } = useExports({ per_page: 20 })
  const exports = data?.data || []

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Export History</h1>
          <p className="text-muted-foreground mt-1">Track all your album exports</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : exports.length === 0 ? (
        <EmptyState
          icon={Download}
          title="No exports yet"
          description="Export your first album from the editor to see it here"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {exports.map((exp, i) => {
                const status = statusConfig[exp.status]
                const StatusIcon = status.icon
                return (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Download className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {exp.album?.title || `Album Export`}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground uppercase font-medium">
                            {exp.export_type}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{exp.size}&quot;</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{exp.dpi} DPI</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {formatDistanceToNow(new Date(exp.created_at), { addSuffix: true })}
                      </span>

                      <Badge variant={status.variant as 'default' | 'success' | 'destructive'} className="gap-1">
                        <StatusIcon className={`h-3 w-3 ${exp.status === 'processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>

                      {exp.status === 'completed' && exp.download_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={exp.download_url} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </a>
                        </Button>
                      )}

                      {exp.status === 'failed' && (
                        <span className="text-xs text-destructive max-w-[200px] truncate hidden lg:block">
                          {exp.error_message || 'Export failed'}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
