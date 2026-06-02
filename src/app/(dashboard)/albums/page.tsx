'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PlusCircle, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlbumCard } from '@/components/dashboard/AlbumCard'
import { CreateAlbumModal } from '@/components/dashboard/CreateAlbumModal'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAlbums, useDeleteAlbum, useDuplicateAlbum } from '@/hooks/useAlbums'
import { ALBUM_CATEGORIES } from '@/lib/utils'
import type { AlbumCategory } from '@/types'
import { BookImage } from 'lucide-react'

export default function AlbumsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AlbumCategory | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAlbums({
    page,
    per_page: 12,
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
  })

  const deleteAlbum = useDeleteAlbum()
  const duplicateAlbum = useDuplicateAlbum()

  const albums = data?.data || []
  const meta = data?.meta

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Albums</h1>
          <p className="text-muted-foreground mt-1">
            {meta ? `${meta.total} album${meta.total !== 1 ? 's' : ''}` : 'Manage your wedding albums'}
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Album
        </Button>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search albums..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select
            value={category}
            onValueChange={(v) => { setCategory(v as AlbumCategory | 'all'); setPage(1) }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {ALBUM_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
          title={search || category !== 'all' ? 'No albums found' : 'No albums yet'}
          description={
            search || category !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first wedding album to get started'
          }
          action={
            !search && category === 'all'
              ? { label: 'Create Album', onClick: () => setShowCreateModal(true) }
              : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {albums.map((album, i) => (
              <AlbumCard
                key={album.id}
                album={album}
                onDuplicate={(id) => duplicateAlbum.mutate(id)}
                onDelete={(id) => deleteAlbum.mutate(id)}
                delay={i * 0.03}
              />
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {meta.last_page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <CreateAlbumModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
