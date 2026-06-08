'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAlbum, useAlbumPages } from '@/hooks/useAlbums'
import { useEditorStore } from '@/store/editorStore'
import { useAuthStore } from '@/store/authStore'
import { LoadingScreen } from '@/components/shared/LoadingScreen'
import { ALBUM_SIZE_DIMENSIONS } from '@/lib/utils'
import type { CanvasElement, ShapeElement, TemplateJsonData } from '@/types'

// Dynamically import EditorLayout — Konva requires client-only rendering
const EditorLayout = dynamic(
  () => import('@/components/editor/EditorLayout').then((m) => m.EditorLayout),
  {
    ssr: false,
    loading: () => <LoadingScreen />,
  }
)

// ─── Element normalizer ───────────────────────────────────────────────────────
// Raw template elements from the backend may use camelCase field names,
// type aliases ('rect', 'ellipse'), or be missing required fields.
// This normalizer maps them all into proper CanvasElement shapes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeElement(raw: any, scale: number = 1): CanvasElement | null {
  if (!raw || typeof raw !== 'object') return null

  let opacity = raw.opacity ?? 1
  // Fix for older templates where opacity (0-1) was erroneously divided by 255
  if (opacity > 0 && opacity <= 0.004) {
    opacity = Math.min(1, opacity * 255)
  }

  const base = {
    id: raw.id || `el_${Math.random().toString(36).substring(2, 9)}`,
    x: (raw.x ?? raw.left ?? 0) * scale,
    y: (raw.y ?? raw.top ?? 0) * scale,
    width: (raw.width ?? 200) * scale,
    height: (raw.height ?? 200) * scale,
    rotation: raw.rotation ?? 0,
    opacity: opacity,
    locked: raw.locked ?? false,
    visible: raw.visible ?? true,
  }

  const rawType: string = raw.type ?? ''

  // ── Image ──────────────────────────────────────────────────────────────────
  if (rawType === 'image') {
    return {
      ...base,
      type: 'image',
      src: raw.src ?? raw.url ?? '',
      fit_mode: raw.fit_mode ?? raw.fitMode ?? 'fill',
      border_radius: raw.border_radius ?? raw.borderRadius ?? raw.cornerRadius ?? 0,
      mask_shape: raw.mask_shape ?? raw.maskShape ?? undefined,
    }
  }

  // ── Text ───────────────────────────────────────────────────────────────────
  if (rawType === 'text') {
    return {
      ...base,
      type: 'text',
      text: raw.text ?? '',
      font_family: raw.font_family ?? raw.fontFamily ?? 'Inter, sans-serif',
      font_size: (raw.font_size ?? raw.fontSize ?? 24) * scale,
      font_weight: raw.font_weight ?? raw.fontWeight ?? '400',
      font_style: (raw.font_style ?? raw.fontStyle ?? 'normal') as 'normal' | 'italic',
      text_decoration: (raw.text_decoration ?? raw.textDecoration ?? 'none') as 'none' | 'underline',
      text_align: (raw.text_align ?? raw.textAlign ?? 'left') as 'left' | 'center' | 'right',
      color: raw.color ?? raw.fill ?? '#ffffff',
      letter_spacing: raw.letter_spacing ?? raw.letterSpacing ?? 0,
      line_height: raw.line_height ?? raw.lineHeight ?? 1.2,
    }
  }

  // ── Shape (also handles 'rect', 'ellipse', etc.) ──────────────────────────
  const shapeTypeAliases: Record<string, string> = {
    rect: 'rect',
    rectangle: 'rect',
    ellipse: 'ellipse',
    circle: 'ellipse',
    triangle: 'triangle',
    diamond: 'diamond',
    pentagon: 'pentagon',
    hexagon: 'hexagon',
    octagon: 'octagon',
    star: 'star',
    cross: 'cross',
    arch: 'arch',
    heart: 'heart',
    line: 'line',
  }

  if (rawType === 'shape' || rawType in shapeTypeAliases) {
    const shapeType = raw.shape_type ?? raw.shapeType ?? shapeTypeAliases[rawType] ?? 'rect'
    return {
      ...base,
      type: 'shape',
      shape_type: shapeType as ShapeElement['shape_type'],
      fill: raw.fill ?? '#444444',
      stroke: raw.stroke ?? 'transparent',
      stroke_width: raw.stroke_width ?? raw.strokeWidth ?? 0,
      corner_radius: raw.corner_radius ?? raw.cornerRadius ?? 0,
      num_points: raw.num_points ?? raw.numPoints ?? undefined,
      inner_radius_ratio: raw.inner_radius_ratio ?? raw.innerRadiusRatio ?? undefined,
    } as CanvasElement
  }

  // ── Frame ──────────────────────────────────────────────────────────────────
  if (rawType === 'frame') {
    return {
      ...base,
      type: 'frame',
      frame_asset_url: raw.frame_asset_url ?? raw.frameAssetUrl ?? '',
      frame_asset_id: raw.frame_asset_id ?? raw.frameAssetId ?? undefined,
    }
  }

  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeElements(raw: any[], scale: number = 1): CanvasElement[] {
  if (!Array.isArray(raw)) return []
  return raw.map(el => normalizeElement(el, scale)).filter((el): el is CanvasElement => el !== null)
}

// Extract elements from a page's json_data regardless of how the backend stored it.
// Case A (standard)  : { background_color, elements: [...] }
// Case B (template)  : { background, elements: [...] }
// Case C (full tpl)  : { version, width, height, pages: [{ background, elements }] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPageElements(jsonData: any, scale: number = 1): CanvasElement[] {
  if (!jsonData) return []

  // If backend stored it as a string, parse it first
  if (typeof jsonData === 'string') {
    try {
      jsonData = JSON.parse(jsonData)
    } catch (e) {
      console.error('Failed to parse page json_data string:', e)
      return []
    }
  }

  // Case A / B — elements at top level
  if (Array.isArray(jsonData.elements)) {
    return normalizeElements(jsonData.elements, scale)
  }

  // Case C — entire template json_data stored as page json_data
  if (Array.isArray(jsonData.pages)) {
    const firstPage = jsonData.pages[0]
    if (firstPage && Array.isArray(firstPage.elements)) {
      return normalizeElements(firstPage.elements, scale)
    }
  }

  return []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBackgroundColor(jsonData: any, pageLevelBackground?: string): string {
  if (!jsonData) return pageLevelBackground ?? '#1a1a1a'

  // If backend stored it as a string, parse it first
  if (typeof jsonData === 'string') {
    try {
      jsonData = JSON.parse(jsonData)
    } catch (e) {
      return pageLevelBackground ?? '#1a1a1a'
    }
  }

  if (jsonData.background_color) return jsonData.background_color
  if (jsonData.background) return jsonData.background
  if (Array.isArray(jsonData.pages) && jsonData.pages[0]?.background) {
    return jsonData.pages[0].background
  }
  return pageLevelBackground ?? '#1a1a1a'
}

// ─── Editor page ──────────────────────────────────────────────────────────────

export default function EditorPage() {
  const params = useParams()
  const router = useRouter()
  const albumId = params.albumId as string

  const { isAuthenticated } = useAuthStore()
  const { setPages, setAlbumId, reset } = useEditorStore()
  const [hydrated, setHydrated] = useState(false)

  const { data: album, isLoading: albumLoading } = useAlbum(albumId)
  const { data: pages, isLoading: pagesLoading } = useAlbumPages(albumId)

  // Wait for Zustand persist to rehydrate from localStorage before
  // checking auth — otherwise a hard refresh always redirects to /login.
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])

  // Redirect if not authenticated (only after hydration)
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login')
    }
  }, [hydrated, isAuthenticated, router])

  // Initialize editor store
  useEffect(() => {
  if (album && pages) {
    setAlbumId(albumId)

    const stashedRaw = sessionStorage.getItem(`tpl_json_${albumId}`)
    const tplJson: TemplateJsonData | null = stashedRaw ? JSON.parse(stashedRaw) as TemplateJsonData : null
    if (stashedRaw) sessionStorage.removeItem(`tpl_json_${albumId}`)

    // Read stashed source dimensions (set in handleUseTemplate / handleBuyTemplate)
    const dimsRaw = sessionStorage.getItem(`tpl_dims_${albumId}`)
    const tplDims: { width: number; height: number } | null = dimsRaw ? JSON.parse(dimsRaw) : null
    if (dimsRaw) sessionStorage.removeItem(`tpl_dims_${albumId}`)
    const dimensions = tplDims ?? ALBUM_SIZE_DIMENSIONS[album.size] ?? { width: 3600, height: 1200 }


if (pages.length > 0 && !tplJson) {
  // backend pages, no fresh upload — use as-is
  const normalized = pages.map((page) => {
    const srcWidth = (page.json_data as any)?.width ?? dimensions.width
    const scale = dimensions.width / srcWidth
    return {
      ...page,
      json_data: {
        width: dimensions.width,
        height: dimensions.height,
        background_color: extractBackgroundColor(page.json_data as unknown, page.background),
        elements: extractPageElements(page.json_data as unknown, scale),
      },
    }
  })
  setPages(normalized)
} else if (tplJson?.pages?.length) {
  // fresh PSD upload — tplJson takes priority, but use real page IDs for saving
  const srcWidth = tplDims?.width || tplJson.width || 3600
  const scale = dimensions.width / srcWidth
  setPages(
    tplJson.pages.map((tplPage, idx) => ({
      id: pages[idx]?.id || `temp_${Math.random().toString(36).substring(2, 11)}`,
      album_id: albumId,
      page_number: idx + 1,
      json_data: {
        width: dimensions.width,
        height: dimensions.height,
        background_color: tplPage.background ?? '#1a1a1a',
        elements: normalizeElements(tplPage.elements ?? [], scale),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))
  )
} else {
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
    }
  }

  return () => { reset() }
}, [album, pages, albumId])
  // Show loader until the auth store has rehydrated from localStorage
  if (!hydrated) return <LoadingScreen />
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
