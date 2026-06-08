import { Logo } from '@/components/shared/Logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-elevated flex-col items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-background to-surface-overlay" />
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #c9a84c 1px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-md">
          <Logo size="lg" showTagline />
          <blockquote className="text-muted-foreground text-lg font-display italic leading-relaxed">
            &quot;Every wedding deserves an album as timeless as the love it captures.&quot;
          </blockquote>
          <div className="flex gap-4">
            {['12×36"', '300 DPI', 'Premium Templates', 'Instant Export'].map((feat) => (
              <div key={feat} className="text-xs text-gold border border-gold/30 rounded-full px-3 py-1">
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="lg:hidden mb-8">
          <Logo size="md" showTagline />
        </div>
        {children}
      </div>
    </div>
  )
}
