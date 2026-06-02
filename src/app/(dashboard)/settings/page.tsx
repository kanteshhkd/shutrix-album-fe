'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { User, CreditCard, HardDrive, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StorageBar } from '@/components/dashboard/StorageBar'
import { SubscriptionPlans } from '@/components/payments/SubscriptionPlans'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import apiClient from '@/lib/api'
import type { User as UserType } from '@/types'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const { user, setUser: setStoreUser } = useAuthStore()
  const { addToast } = useUIStore()
  const [isUpdating, setIsUpdating] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  })

  const onProfileSubmit = async (data: ProfileForm) => {
    setIsUpdating(true)
    try {
      const res = await apiClient.put<{ data: UserType }>('/auth/profile', data)
      setStoreUser(res.data.data)
      addToast({ title: 'Profile updated', variant: 'success' })
    } catch {
      addToast({ title: 'Failed to update profile', variant: 'destructive' })
    } finally {
      setIsUpdating(false)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const storageUsed = 2.4 * 1024 * 1024 * 1024
  const storageTotal = (user?.subscription?.plan?.limits.storage_gb || 5) * 1024 * 1024 * 1024

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and subscription</p>
      </motion.div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xl">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" type="button">
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF. Max 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...register('name')} />
                    {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" {...register('email')} />
                    {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
                  </div>
                </div>

                <Button type="submit" variant="gold" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current plan banner */}
          <Card className="border-gold/30 bg-gold/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-lg font-bold text-foreground">
                    {user?.subscription?.plan?.name || 'Free'}
                  </p>
                  <Badge variant={user?.subscription?.status === 'active' ? 'success' : 'warning'}>
                    {user?.subscription?.status || 'active'}
                  </Badge>
                </div>
              </div>
              {user?.subscription?.current_period_end && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Renews on</p>
                  <p className="text-sm text-foreground">
                    {new Date(user.subscription.current_period_end).toLocaleDateString('en-IN')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <SubscriptionPlans />
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
              <CardDescription>Manage your uploaded photos and files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <StorageBar usedBytes={storageUsed} totalBytes={storageTotal} />

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">142</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Photos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">23</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Albums</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">8</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Exports</p>
                </div>
              </div>

              {user?.subscription?.plan_id === 'free' && (
                <div className="p-4 bg-gold/5 border border-gold/20 rounded-xl text-sm">
                  <p className="text-gold font-medium">Need more storage?</p>
                  <p className="text-muted-foreground mt-1">
                    Upgrade to Starter for 20 GB or Pro for 100 GB of storage.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
