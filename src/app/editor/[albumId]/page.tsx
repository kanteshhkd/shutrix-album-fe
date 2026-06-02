'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAlbum, useAlbumPages } from '@/hooks/useAlbums'
import { useEditorStore } from '@/store/editorStore'
import { useAuthStore } from '@/store/authStore'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { ALBUM_SIZE_DIMENSIONS } from '@/lib/utils'

// Dynamically import EditorLayout — Konva requires client-only rendering
const EditorLayout = dynamic(
  () => import('@/components/editor/EditorLayout').then((m) => m.EditorLayout),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
)

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const albumId = params.albumId as string

  const { isAuthenticated } = useAuthStore()
  const { setPages, setAlbumId, reset } = useEditorStore()

  const { data: album, isLoading: albumLoading } = useAlbum(albumId)
  const { data: pages, isLoading: pagesLoading } = useAlbumPages(albumId)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  // Initialize editor store
  useEffect(() => {
    if (album && pages) {
      setAlbumId(albumId)

      const dimensions = ALBUM_SIZE_DIMENSIONS[album.size] || { width: 3600, height: 1200 }

      if (pages.length === 0) {
        setPages([{
          id: `temp_${Math.random().toString(36).substring(2, 11)}`,
          album_id: albumId,
          page_number: 1,
          json_data: {
            width: dimensions.width,
            height: dimensions.height,
            background_color: '#1a1a1a',
            elements: [],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])
      } else {
        // Normalize pages from API: inject canvas dimensions and resolve background field name.
        // Pages stored from templates have json_data.background (raw template format) instead of
        // json_data.background_color, and no width/height — derive those from the album's size.
        const normalized = pages.map((page) => ({
          ...page,
          json_data: {
            width: dimensions.width,
            height: dimensions.height,
            background_color:
              page.json_data?.background_color ||
              (page.json_data as unknown as { background?: string })?.background ||
              page.background ||
              '#1a1a1a',
            elements: page.json_data?.elements ?? [],
          },
        }))
        setPages(normalized)
      }
    }

    return () => {
      // Reset editor state on unmount
      reset()
    }
  }, [album, pages, albumId])

  if (!isAuthenticated) return null
  if (albumLoading || pagesLoading) return <LoadingScreen />

  if (!album) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-display text-foreground mb-2">Album not found</h2>
          <button
            onClick={() => router.push('/albums')}
            className="text-gold hover:text-gold-light transition-colors text-sm"
          >
            Back to albums
          </button>
        </div>
      </div>
    )
  }

  return <EditorLayout albumId={albumId} />
}
