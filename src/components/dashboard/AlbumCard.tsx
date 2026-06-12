'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  MoreHorizontal,
  Edit3,
  Copy,
  Trash2,
  BookImage,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Album } from '@/types'
import { ALBUM_CATEGORIES } from '@/lib/utils'

interface AlbumCardProps {
  album: Album
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  delay?: number
}

export function AlbumCard({ album, onDuplicate, onDelete, delay = 0 }: AlbumCardProps) {
  const router = useRouter()

  const categoryLabel = ALBUM_CATEGORIES.find((c) => c.value === album.category)?.label || album.category

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover="hovered"
      variants={{ hovered: { y: -4, transition: { duration: 0.2, ease: 'easeOut' } } }}
      className="relative bg-card border border-border rounded-xl overflow-hidden hover:border-gold/50 transition-colors duration-300 hover:shadow-xl hover:shadow-gold/15"
    >
      {/* Thumbnail */}
      <div
        className="relative aspect-[3/1] bg-surface-overlay cursor-pointer overflow-hidden"
        onClick={() => router.push(`/editor/${album.id}`)}
      >
        {album.cover_image_url ? (
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1 }}
            animate={{ scale: 1 }}
            variants={{ hovered: { scale: 1.05, transition: { duration: 0.5 } } }}
          >
            <Image
              src={album.cover_image_url}
              alt={album.title}
              fill
              className="object-cover"
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-overlay">
            <BookImage className="h-10 w-10 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground/40">No cover</span>
          </div>
        )}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          variants={{ hovered: { opacity: 1, transition: { duration: 0.2 } } }}
        />
        <motion.div
          className="absolute bottom-3 left-3 right-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          variants={{ hovered: { opacity: 1, transition: { duration: 0.2 } } }}
        >
          <Button
            size="sm"
            variant="gold"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation()
              router.push(`/editor/${album.id}`)
            }}
          >
            <Edit3 className="h-3 w-3 mr-1" />
            Open Editor
          </Button>
        </motion.div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{album.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs py-0 h-5">
                {categoryLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">{album.size}&quot;</span>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            variants={{ hovered: { opacity: 1, transition: { duration: 0.15 } } }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/editor/${album.id}`)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Open Editor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(album.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(album.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {album.page_count} page{album.page_count !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(album.updated_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
