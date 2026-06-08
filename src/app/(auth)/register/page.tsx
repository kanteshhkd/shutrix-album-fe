'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRegister } from '@/hooks/useAuth'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const register = useRegister()

  const {
    register: rhfRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = (data: RegisterForm) => {
    const { confirm_password, ...rest } = data
    register.mutate({ ...rest, password_confirmation: confirm_password })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Create your account</h1>
        <p className="text-muted-foreground">Join thousands of Indian wedding photographers</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Rahul Sharma"
              className="pl-10"
              autoComplete="name"
              {...rhfRegister('name')}
            />
          </div>
          {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
        </div>

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
              {...rhfRegister('email')}
            />
          </div>
          {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              className="pl-10 pr-10"
              autoComplete="new-password"
              {...rhfRegister('password')}
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

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirm_password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat password"
              className="pl-10"
              autoComplete="new-password"
              {...rhfRegister('confirm_password')}
            />
          </div>
          {errors.confirm_password && (
            <p className="text-destructive text-sm">{errors.confirm_password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="gold"
          className="w-full"
          disabled={register.isPending}
        >
          {register.isPending ? 'Creating account...' : 'Create Free Account'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          By registering, you agree to our{' '}
          <Link href="/terms" className="text-gold hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-gold hover:underline">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-gold hover:text-gold-light font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
