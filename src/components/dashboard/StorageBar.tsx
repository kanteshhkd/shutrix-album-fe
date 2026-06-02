'use client'

import { Progress } from '@/components/ui/progress'
import { formatBytes } from '@/lib/utils'
import { HardDrive } from 'lucide-react'

interface StorageBarProps {
  usedBytes: number
  totalBytes: number
}

export function StorageBar({ usedBytes, totalBytes }: StorageBarProps) {
  const percentage = Math.min(Math.round((usedBytes / totalBytes) * 100), 100)
  const isNearLimit = percentage >= 80

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <HardDrive className="h-4 w-4" />
          <span>Storage</span>
        </div>
        <span className={isNearLimit ? 'text-yellow-400' : 'text-muted-foreground'}>
          {formatBytes(usedBytes)} / {formatBytes(totalBytes)}
        </span>
      </div>
      <Progress
        value={percentage}
        className={isNearLimit ? '[&>div]:bg-yellow-500' : ''}
      />
      <p className="text-xs text-muted-foreground">{percentage}% used</p>
    </div>
  )
}
