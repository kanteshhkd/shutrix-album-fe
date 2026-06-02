import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showTagline?: boolean
}

export function Logo({ size = 'md', className, showTagline = false }: LogoProps) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <span className={cn('font-display font-bold tracking-wide', sizes[size])}>
        <span className="text-gold-light">S</span>
        <span className="text-foreground">hutrix</span>
        <span className="text-gold ml-2 font-light">Album</span>
      </span>
      {showTagline && (
        <span className="text-xs text-muted-foreground tracking-widest uppercase mt-0.5">
          Studio
        </span>
      )}
    </div>
  )
}
