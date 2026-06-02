'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'gold'
  delay?: number
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={cn(
        'relative overflow-hidden',
        variant === 'gold' && 'border-gold/30 bg-gradient-to-br from-gold/5 to-transparent'
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground font-medium">{title}</span>
              <span className={cn(
                'text-3xl font-bold',
                variant === 'gold' ? 'gold-text' : 'text-foreground'
              )}>
                {value}
              </span>
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
              {trend && (
                <span className={cn(
                  'text-xs font-medium',
                  trend.value >= 0 ? 'text-green-400' : 'text-destructive'
                )}>
                  {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
                </span>
              )}
            </div>
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              variant === 'gold' ? 'bg-gold/20' : 'bg-muted'
            )}>
              <Icon className={cn(
                'h-6 w-6',
                variant === 'gold' ? 'text-gold' : 'text-muted-foreground'
              )} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
