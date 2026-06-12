'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ExternalLink, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin } from '@/hooks/useAuth'
import { getApiError } from '@/lib/api'

const SHUTRIX_REGISTER_URL = 'https://shutrix.com/create-account'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

type LoginErrorKind = 'no_account' | 'data_unavailable' | 'generic' | null

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [errorKind, setErrorKind] = useState<LoginErrorKind>(null)
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    if (login.isError && login.error) {
      const err = login.error as any
      const status = err?.response?.status as number | undefined
      const msg = getApiError(login.error).toLowerCase()

      const noAccount =
        status === 404 ||
        msg.includes('not found') ||
        msg.includes('no account') ||
        msg.includes('user not found') ||
        msg.includes('does not exist')

      const dataUnavailable =
        msg.includes('data not available') ||
        msg.includes('no data') ||
        msg.includes('unavailable') ||
        msg.includes('service unavailable') ||
        status === 503 ||
        status === 500

      if (noAccount) setErrorKind('no_account')
      else if (dataUnavailable) setErrorKind('data_unavailable')
      else setErrorKind('generic')
    } else {
      setErrorKind(null)
    }
  }, [login.isError, login.error])

  const onSubmit = (data: LoginForm) => {
    setErrorKind(null)
    login.mutate(data)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground">Sign in to your Shutrix account</p>
      </div>

      {/* Portal access notice — always visible */}
      <div className="mb-6 rounded-lg border border-blue-500/25 bg-blue-500/8 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-300/90 leading-relaxed">
          Register as a photographer on{' '}
          <span className="font-medium text-blue-200">Shutrix</span>{' '}
          and come back to access this portal.{' '}
          <a
            href={SHUTRIX_REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-blue-200 underline underline-offset-2 hover:text-white transition-colors"
          >
            Create now
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              autoComplete="email"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="pl-10 pr-10"
              autoComplete="current-password"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
        </div>

        {/* No account found */}
        {errorKind === 'no_account' && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
            No account found with this email.{' '}
            <a
              href={SHUTRIX_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-amber-200 underline underline-offset-2 hover:text-amber-100"
            >
              Register on Shutrix
              <ExternalLink className="h-3 w-3" />
            </a>{' '}
            to get started.
          </div>
        )}

        {/* Data unavailable — direct to Shutrix login first */}
        {errorKind === 'data_unavailable' && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            Account data is not available right now. Please{' '}
            <a
              href="https://shutrix.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-red-200 underline underline-offset-2 hover:text-red-100"
            >
              log in on Shutrix first
              <ExternalLink className="h-3 w-3" />
            </a>
            , then try again.
          </div>
        )}

        {/* Generic login error */}
        {errorKind === 'generic' && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
            {getApiError(login.error)}
          </div>
        )}

        <Button
          type="submit"
          variant="gold"
          className="w-full"
          disabled={login.isPending}
        >
          {login.isPending ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <a
          href={SHUTRIX_REGISTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold hover:text-gold-light font-medium transition-colors"
        >
          Create one free
        </a>
      </p>
    </motion.div>
  )
}
