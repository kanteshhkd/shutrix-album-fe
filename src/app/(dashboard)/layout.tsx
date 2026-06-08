'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookImage, LayoutTemplate, Download, Settings, LogOut, Bell, Crown } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { Logo } from '@/components/shared/Logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/albums', label: 'Albums', icon: BookImage },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/exports', label: 'Exports', icon: Download },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const logout = useLogout()
  const [hydrated, setHydrated] = useState(false)
  const redirected = useRef(false)

  // Wait for Zustand's persist middleware to rehydrate from localStorage
  // before making any auth decisions. Without this, on a hard refresh or
  // after a router.push('/dashboard'), the store is momentarily empty
  // and the layout wrongly redirects back to /login.
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    // If already hydrated (e.g., store was created earlier in the session)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated && !redirected.current) {
      redirected.current = true
      router.replace('/login')
    }
  }, [hydrated, isAuthenticated, router])

  if (!hydrated) return <LoadingScreen />
  if (!isAuthenticated) return <LoadingScreen />

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 h-16 border-b border-border bg-surface-elevated/80 glass">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Logo size="sm" />
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Upgrade badge */}
            {user?.subscription?.plan_id === 'free' && (
              <Link href="/settings">
                <Button variant="outline" size="sm" className="border-gold/50 text-gold hover:bg-gold/10 hidden sm:flex">
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade
                </Button>
              </Link>
            )}

            <button className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Bell className="h-4 w-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar_url ?? undefined} alt={user?.name} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">{user?.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
