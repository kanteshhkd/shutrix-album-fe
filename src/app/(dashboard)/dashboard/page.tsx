'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BookImage,
  Download,
  HardDrive,
  Crown,
  PlusCircle,
  LayoutTemplate,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { AlbumCard } from '@/components/dashboard/AlbumCard'
import { CreateAlbumModal } from '@/components/dashboard/CreateAlbumModal'
import { StorageBar } from '@/components/dashboard/StorageBar'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAlbums, useDeleteAlbum, useDuplicateAlbum } from '@/hooks/useAlbums'
import { useAuthStore } from '@/store/authStore'

export default function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()
  const { user } = useAuthStore()
  const { data: albumsData, isLoading } = useAlbums({ per_page: 6 })
  const deleteAlbum = useDeleteAlbum()
  const duplicateAlbum = useDuplicateAlbum()

  const albums = albumsData?.data || []
  const totalAlbums = albumsData?.meta.total || 0

  const planName = user?.subscription?.plan?.name || 'Free'
  const storageUsed = 2.4 * 1024 * 1024 * 1024 // placeholder 2.4GB
  const storageTotal = (user?.subscription?.plan?.limits.storage_gb || 5) * 1024 * 1024 * 1024

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Album
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Albums"
          value={totalAlbums}
          icon={BookImage}
          delay={0.1}
        />
        <StatsCard
          title="Exports This Month"
          value={8}
          icon={Download}
          trend={{ value: 12, label: 'vs last month' }}
          delay={0.15}
        />
        <StatsCard
          title="Current Plan"
          value={planName}
          subtitle={user?.subscription?.plan_id === 'free' ? 'Upgrade for unlimited' : 'Active'}
          icon={Crown}
          variant={user?.subscription?.plan_id !== 'free' ? 'gold' : 'default'}
          delay={0.2}
        />
        <StatsCard
          title="Storage Used"
          value="2.4 GB"
          subtitle={`of ${user?.subscription?.plan?.limits.storage_gb || 5} GB`}
          icon={HardDrive}
          delay={0.25}
        />
      </div>

      {/* Storage bar */}
      <Card>
        <CardContent className="p-6">
          <StorageBar usedBytes={storageUsed} totalBytes={storageTotal} />
        </CardContent>
      </Card>

      {/* Recent Albums */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-semibold text-foreground">Recent Albums</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push('/albums')}>
            View all
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[3/1] bg-surface-overlay" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-surface-overlay rounded w-3/4" />
                  <div className="h-3 bg-surface-overlay rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <EmptyState
            icon={BookImage}
            title="No albums yet"
            description="Create your first wedding album to get started"
            action={{ label: 'Create Album', onClick: () => setShowCreateModal(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map((album, i) => (
              <AlbumCard
                key={album.id}
                album={album}
                onDuplicate={(id) => duplicateAlbum.mutate(id)}
                onDelete={(id) => deleteAlbum.mutate(id)}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-display font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:border-gold/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/10 transition-all group"
            onClick={() => setShowCreateModal(true)}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center group-hover:bg-gold/30 transition-colors">
                <PlusCircle className="h-6 w-6 text-gold" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Create New Album</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Start blank or from a template</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-gold/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/10 transition-all group"
            onClick={() => router.push('/templates')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <LayoutTemplate className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Browse Templates</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Premium designs for every occasion
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateAlbumModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
