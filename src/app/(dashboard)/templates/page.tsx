'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Crown, X, Eye, Sparkles, Plus, Trash2, Upload, ImageIcon, FileUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTemplates, useAdminCreateTemplate, useAdminDeleteTemplate, usePurchaseTemplate } from '@/hooks/useTemplates'
import { useOpenRazorpay } from '@/hooks/usePayment'
import { useCreateAlbumFromTemplate } from '@/hooks/useAlbums'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { usePresignUpload } from '@/hooks/useAssets'
import { TemplateLayoutPreview } from '@/components/templates/TemplateLayoutPreview'
import apiClient, { getApiError } from '@/lib/api'
import type { Template, AlbumCategory, AlbumSize, TemplateJsonData, TemplateRawElement } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORIES: { value: AlbumCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'pre_wedding', label: 'Pre Wedding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'haldi', label: 'Haldi' },
  { value: 'mehndi', label: 'Mehndi' },
  { value: 'reception', label: 'Reception' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'minimal', label: 'Minimal' },
]

const SIZES: AlbumSize[] = ['12x36', '12x30', '10x24']

const EMPTY_JSON = JSON.stringify(
  {
    version: '1.0',
    width: 3600,
    height: 1200,
    pages: [
      {
        background: '#1a1a1a',
        elements: [
          {
            id: 'img_placeholder_1',
            type: 'image',
            src: '',
            x: 0,
            y: 0,
            width: 3600,
            height: 1200,
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            fit_mode: 'fill',
            border_radius: 0,
          },
        ],
      },
    ],
  },
  null,
  2
)

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<AlbumCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<Template | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const createFromTemplate = useCreateAlbumFromTemplate()
  const adminCreate = useAdminCreateTemplate()
  const adminDelete = useAdminDeleteTemplate()
  const purchaseTemplate = usePurchaseTemplate()
  const openRazorpay = useOpenRazorpay()
  const { addToast } = useUIStore()
  const [purchasing, setPurchasing] = useState(false)

  const { data, isLoading } = useTemplates({
    category: activeCategory !== 'all' ? activeCategory : undefined,
    search: search || undefined,
    per_page: 24,
  })

  const templates = data?.data || []

  const resolveTemplateJson = async (template: Template): Promise<TemplateJsonData | null> => {
    if (template.json_data) return template.json_data
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await apiClient.get<any>(`/templates/${template.id}`)
      const tpl = res.data?.template || res.data?.data || res.data
      let jsonData = tpl?.json_data
      if (typeof jsonData === 'string') {
        try { jsonData = JSON.parse(jsonData) } catch (e) { console.error('Failed to parse template json_data', e) }
      }
      return jsonData ?? null
    } catch {
      return null
    }
  }

  const handleUseTemplate = async (template: Template) => {
    if (!isAdmin && template.is_premium && user?.subscription?.plan_id === 'free') return
    const [album, jsonData] = await Promise.all([
      createFromTemplate.mutateAsync({
        title: `Album from ${template.name}`,
        category: template.category,
        size: template.size,
        template_id: template.id,
      }),
      resolveTemplateJson(template),
    ])
    if (album) {
      setPreview(null)
      if (jsonData) {
        sessionStorage.setItem(`tpl_json_${album.id}`, JSON.stringify(jsonData))
        sessionStorage.setItem(`tpl_dims_${album.id}`, JSON.stringify({ width: jsonData.width, height: jsonData.height }))
      }
      router.push(`/editor/${album.id}`)
    }
  }

  const handleBuyTemplate = async (template: Template) => {
    if (purchasing) return
    setPurchasing(true)
    try {
      const res = await purchaseTemplate.mutateAsync(template.id)
      await openRazorpay({
        amount: res.order.amount,
        currency: res.order.currency,
        order_id: res.order.id,
        description: `Purchase ${template.name}`,
        handler: (response) => {
          void response
          ;(async () => {
            addToast({ title: 'Payment successful!', description: `${template.name} unlocked`, variant: 'success' })
            const [album, jsonData] = await Promise.all([
              createFromTemplate.mutateAsync({
                title: `Album from ${template.name}`,
                category: template.category,
                size: template.size,
                template_id: template.id,
              }),
              resolveTemplateJson(template),
            ])
            if (album) {
              if (jsonData) {
                sessionStorage.setItem(`tpl_json_${album.id}`, JSON.stringify(jsonData))
                sessionStorage.setItem(`tpl_dims_${album.id}`, JSON.stringify({ width: jsonData.width, height: jsonData.height }))
              }
              setPreview(null)
              router.push(`/editor/${album.id}`)
            }
          })()
        },
      })
    } catch (error) {
      addToast({ title: 'Purchase failed', description: getApiError(error), variant: 'destructive' })
    } finally {
      setPurchasing(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this template?')) return
    await adminDelete.mutateAsync(id)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Professionally designed album templates for every occasion
          </p>
        </div>
        {isAdmin && (
          <Button variant="gold" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        )}
      </motion.div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              activeCategory === cat.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-[3/2] bg-surface-overlay" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-surface-overlay rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {templates.map((template, i) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="group bg-card border border-border rounded-xl overflow-hidden hover:border-gold/30 transition-all cursor-pointer"
                onClick={() => setPreview(template)}
              >
                <div className="relative aspect-[3/2] bg-surface-overlay overflow-hidden">
                  {template.thumbnail_url ? (
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : template.json_data ? (
                    <div className="absolute inset-0">
                      <TemplateLayoutPreview jsonData={template.json_data} />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  {template.is_premium && !isAdmin && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="gold" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Premium
                      </Badge>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="ghost" className="text-foreground gap-1">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive gap-1"
                        onClick={(e) => handleDelete(e, template.id)}
                        disabled={adminDelete.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm text-foreground">{template.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{template.page_count} pages</span>
                    {isAdmin ? (
                      <span className="text-xs text-primary">Admin</span>
                    ) : template.is_premium && template.price ? (
                      <span className="text-xs text-gold font-medium">₹{template.price}</span>
                    ) : (
                      <span className="text-xs text-green-400">Free</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              {preview?.name}
              {preview?.is_premium && !isAdmin && (
                <Badge variant="gold"><Crown className="h-3 w-3 mr-1" />Premium</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {preview && (() => {
            const validPreviews = (preview.preview_images ?? []).filter(Boolean)
            return (
              <div className="space-y-4">
                <div className="space-y-2">
                  {preview.thumbnail_url ? (
                    <img src={preview.thumbnail_url} alt={preview.name} className="w-full rounded-lg" />
                  ) : preview.json_data ? (
                    <div className="aspect-[3/1] bg-surface-overlay rounded-lg overflow-hidden">
                      <TemplateLayoutPreview jsonData={preview.json_data} />
                    </div>
                  ) : (
                    <div className="aspect-[3/2] bg-surface-overlay rounded-lg flex items-center justify-center">
                      <Sparkles className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                {validPreviews.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Preview Images</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                      {validPreviews.map((src, i) => (
                        <img key={i} src={src} alt={`Preview ${i + 1}`} className="h-24 w-auto rounded-md border border-border flex-shrink-0 object-cover" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{preview.page_count} pages • {preview.size}&quot;</span>
                  {isAdmin ? (
                    <span className="text-primary text-xs">Admin — all templates free</span>
                  ) : preview.is_premium && preview.price ? (
                    <span className="text-gold font-medium">₹{preview.price} one-time</span>
                  ) : (
                    <span className="text-green-400">Free template</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setPreview(null)}>
                    <X className="h-4 w-4 mr-2" />Close
                  </Button>
                  {!isAdmin && preview.is_premium && user?.subscription?.plan_id === 'free' ? (
                    <>
                      <Button variant="outline" className="flex-1 border-primary/40 text-primary hover:bg-primary/10" onClick={() => router.push('/settings#subscription')}>
                        <Crown className="h-4 w-4 mr-2" />Upgrade Plan
                      </Button>
                      <Button variant="gold" className="flex-1" disabled={purchasing || createFromTemplate.isPending} onClick={() => handleBuyTemplate(preview)}>
                        {purchasing ? 'Processing...' : `Buy ₹${preview.price ? (preview.price / 100).toFixed(0) : '—'}`}
                      </Button>
                    </>
                  ) : (
                    <Button variant="gold" className="flex-1" disabled={createFromTemplate.isPending} onClick={() => handleUseTemplate(preview)}>
                      {createFromTemplate.isPending ? 'Creating...' : 'Use Template'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <AddTemplateModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreate={adminCreate}
        />
      )}
    </div>
  )
}

// ─── Photoshop blend mode → CSS/Konva globalCompositeOperation map ────────────
const PS_BLEND_MODE_MAP: Record<string, string> = {
  'normal':        'source-over',
  'pass through':  'source-over',
  'dissolve':      'source-over',
  'darken':        'darken',
  'multiply':      'multiply',
  'color burn':    'color-burn',
  'linear burn':   'color-burn',
  'darker color':  'darken',
  'lighten':       'lighten',
  'screen':        'screen',
  'color dodge':   'color-dodge',
  'linear dodge':  'color-dodge',
  'lighter color': 'lighten',
  'overlay':       'overlay',
  'soft light':    'soft-light',
  'hard light':    'hard-light',
  'vivid light':   'hard-light',
  'linear light':  'hard-light',
  'pin light':     'hard-light',
  'hard mix':      'hard-light',
  'difference':    'difference',
  'exclusion':     'exclusion',
  'subtract':      'exclusion',
  'divide':        'color-dodge',
  'hue':           'hue',
  'saturation':    'saturation',
  'color':         'color',
  'luminosity':    'luminosity',
}

function psBlendToComposite(psMode: string | undefined): string {
  if (!psMode) return 'source-over'
  return PS_BLEND_MODE_MAP[psMode] ?? 'source-over'
}

// ─── Canvas utilities ─────────────────────────────────────────────────────────

// ── STEP 6 — feature flag (set to false to revert to PSD metadata bounds) ────
const USE_PIXEL_GEOMETRY = true

/**
 * STEP 1 — Scan the alpha channel of a canvas and return the tight bounding box
 * of all pixels whose alpha > 8 (ignores nearly-transparent antialiasing fringe).
 *
 * All coordinates are in canvas-local space (origin = top-left of the canvas).
 * Returns null when the entire canvas is transparent.
 */
function getVisiblePixelBounds(canvas: HTMLCanvasElement): {
  left: number; top: number; right: number; bottom: number
  width: number; height: number
} | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  const { width: cw, height: ch } = canvas
  if (cw === 0 || ch === 0) return null

  const { data } = ctx.getImageData(0, 0, cw, ch)

  // Alpha byte for pixel (x, y) is at data[(y*cw + x)*4 + 3]
  const alpha = (x: number, y: number): number => data[(y * cw + x) * 4 + 3]

  // ── top: first row that contains any alpha > 8 ───────────────────────────
  let top = -1
  outer_top: for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      if (alpha(x, y) > 8) { top = y; break outer_top }
    }
  }
  if (top === -1) return null  // fully transparent

  // ── bottom: last row that contains any alpha > 8 ─────────────────────────
  let bottom = -1
  outer_bottom: for (let y = ch - 1; y >= top; y--) {
    for (let x = 0; x < cw; x++) {
      if (alpha(x, y) > 8) { bottom = y; break outer_bottom }
    }
  }

  // ── left: first column with any alpha > 8 within [top, bottom] ───────────
  let left = -1
  outer_left: for (let x = 0; x < cw; x++) {
    for (let y = top; y <= bottom; y++) {
      if (alpha(x, y) > 8) { left = x; break outer_left }
    }
  }

  // ── right: last column with any alpha > 8 within [top, bottom] ───────────
  let right = -1
  outer_right: for (let x = cw - 1; x >= left; x--) {
    for (let y = top; y <= bottom; y++) {
      if (alpha(x, y) > 8) { right = x; break outer_right }
    }
  }

  if (left === -1 || right === -1) return null

  return {
    left,
    top,
    right,
    bottom,
    width:  right - left + 1,
    height: bottom - top  + 1,
  }
}

function resolveColor(c: Record<string, number> | undefined): { r: number; g: number; b: number } | null {
  if (!c) return null
  if (c.r !== undefined) return { r: c.r, g: c.g, b: c.b }
  if (c.fr !== undefined) return { r: Math.round(c.fr * 255), g: Math.round(c.fg * 255), b: Math.round(c.fb * 255) }
  return null
}

function applyLayerEffects(
  src: HTMLCanvasElement,
  effects: Record<string, unknown>,
  layerX: number,
  layerY: number,
): { canvas: HTMLCanvasElement; dx: number; dy: number } {
  type ShadowParams = { color: string; alpha: number; angle: number; distance: number; size: number; spread: number; enabled: boolean }
  const readShadow = (raw: Record<string, unknown> | undefined): ShadowParams | null => {
    if (!raw || raw.enabled === false) return null
    const c = resolveColor(raw.color as Record<string, number> | undefined)
    const alpha = (raw.opacity as number ?? 75) / 100
    const angle = (raw.angle as number ?? 120) * Math.PI / 180
    const distance = (raw.distance as number ?? 5)
    const size = (raw.size as number ?? 5)
    const spread = (raw.spread as number ?? 0)
    return { color: c ? rgbToHex(c.r, c.g, c.b) : '#000000', alpha, angle, distance, size, spread, enabled: true }
  }

  const dropShadows = (effects.dropShadow as Array<Record<string, unknown>> | undefined) ?? []
  const innerShadows = (effects.innerShadow as Array<Record<string, unknown>> | undefined) ?? []
  const outerGlows = (effects.outerGlow as Array<Record<string, unknown>> | undefined) ?? []
  const innerGlows = (effects.innerGlow as Array<Record<string, unknown>> | undefined) ?? []

  const activeDrop = dropShadows.map(readShadow).filter(Boolean) as ShadowParams[]
  const activeInnerShadow = innerShadows.map(readShadow).filter(Boolean) as ShadowParams[]

  type StrokeParams = { color: string; alpha: number; size: number; position: string }
  const strokeArr = effects.stroke as Array<Record<string, unknown>> | undefined
  const strokeRaw = strokeArr?.find(s => s.enabled !== false)
  const stroke: StrokeParams | null = strokeRaw ? (() => {
    const c = resolveColor(strokeRaw.color as Record<string, number> | undefined)
    return {
      color: c ? rgbToHex(c.r, c.g, c.b) : '#000000',
      alpha: (strokeRaw.opacity as number ?? 100) / 100,
      size: strokeRaw.size as number ?? 3,
      position: strokeRaw.position as string ?? 'outside',
    }
  })() : null

  type GradientParams = { stops: Array<{ color: string; pos: number }>; angle: number; alpha: number; type: string }
  const gradArr = effects.gradientOverlay as Array<Record<string, unknown>> | undefined
  const gradRaw = gradArr?.find(g => g.enabled !== false)
  const gradientOverlay: GradientParams | null = gradRaw ? (() => {
    const gradient = gradRaw.gradient as Record<string, unknown> | undefined
    const colorStops = (gradient?.colorStops as Array<Record<string, unknown>> | undefined) ?? []
    const stops = colorStops.map(s => {
      const c = resolveColor(s.color as Record<string, number> | undefined)
      return { color: c ? rgbToHex(c.r, c.g, c.b) : '#000000', pos: (s.location as number ?? 0) / 4096 }
    })
    return {
      stops,
      angle: (gradRaw.angle as number ?? 90),
      alpha: (gradRaw.opacity as number ?? 100) / 100,
      type: (gradRaw.type as string ?? 'linear'),
    }
  })() : null

  type ColorOverlayParams = { color: string; alpha: number; blendMode: string }
  const colorArr = effects.solidFill as Array<Record<string, unknown>> | undefined
  const colorOverlayRaw = colorArr?.find(c => c.enabled !== false)
  const colorOverlay: ColorOverlayParams | null = colorOverlayRaw ? (() => {
    const c = resolveColor(colorOverlayRaw.color as Record<string, number> | undefined)
    return {
      color: c ? rgbToHex(c.r, c.g, c.b) : '#ffffff',
      alpha: (colorOverlayRaw.opacity as number ?? 100) / 100,
      blendMode: psBlendToComposite(colorOverlayRaw.blendMode as string | undefined),
    }
  })() : null

  let padL = 0, padR = 0, padT = 0, padB = 0
  for (const ds of activeDrop) {
    const extra = ds.size * 2 + ds.spread + ds.distance + 4
    const ox = Math.cos(ds.angle) * ds.distance
    const oy = -Math.sin(ds.angle) * ds.distance
    padL = Math.max(padL, extra - ox)
    padR = Math.max(padR, extra + ox)
    padT = Math.max(padT, extra - oy)
    padB = Math.max(padB, extra + oy)
  }
  if (stroke && (stroke.position === 'outside' || stroke.position === 'center')) {
    const half = stroke.position === 'center' ? stroke.size / 2 : stroke.size
    padL = Math.max(padL, half); padR = Math.max(padR, half)
    padT = Math.max(padT, half); padB = Math.max(padB, half)
  }
  padL = Math.ceil(padL); padR = Math.ceil(padR)
  padT = Math.ceil(padT); padB = Math.ceil(padB)

  const outW = src.width + padL + padR
  const outH = src.height + padT + padB
  const out = document.createElement('canvas')
  out.width = outW
  out.height = outH
  const ctx = out.getContext('2d')!

  for (const ds of activeDrop) {
    const ox = Math.cos(ds.angle) * ds.distance
    const oy = -Math.sin(ds.angle) * ds.distance
    ctx.save()
    ctx.globalAlpha = ds.alpha
    ctx.shadowColor = ds.color
    ctx.shadowBlur = ds.size * 2
    ctx.shadowOffsetX = ox + 9999 + padL
    ctx.shadowOffsetY = oy + 9999 + padT
    ctx.drawImage(src, padL - 9999, padT - 9999)
    ctx.restore()
  }

  ctx.drawImage(src, padL, padT)

  if (stroke) {
    const strokeCanvas = document.createElement('canvas')
    strokeCanvas.width = outW
    strokeCanvas.height = outH
    const sCtx = strokeCanvas.getContext('2d')!
    const expand = stroke.position === 'outside' ? stroke.size : stroke.position === 'center' ? stroke.size / 2 : 0

    sCtx.save()
    sCtx.shadowColor = stroke.color
    sCtx.shadowBlur = 0
    sCtx.shadowOffsetX = 9999
    sCtx.shadowOffsetY = 9999
    const sw = src.width + expand * 2
    const sh = src.height + expand * 2
    sCtx.drawImage(src, padL - expand - 9999, padT - expand - 9999, sw, sh)
    sCtx.restore()

    sCtx.globalCompositeOperation = 'source-in'
    sCtx.fillStyle = stroke.color
    sCtx.globalAlpha = stroke.alpha
    sCtx.fillRect(0, 0, outW, outH)

    if (stroke.position === 'inside') {
      sCtx.globalCompositeOperation = 'destination-out'
      sCtx.drawImage(src, padL, padT)
    }

    ctx.save()
    if (stroke.position === 'outside') {
      ctx.globalCompositeOperation = 'destination-over'
    }
    ctx.drawImage(strokeCanvas, 0, 0)
    ctx.restore()
  }

  if (colorOverlay) {
    ctx.save()
    ctx.globalCompositeOperation = 'source-atop'
    ctx.fillStyle = colorOverlay.color
    ctx.globalAlpha = colorOverlay.alpha
    ctx.fillRect(padL, padT, src.width, src.height)
    ctx.restore()
  }

  if (gradientOverlay && gradientOverlay.stops.length >= 2) {
    ctx.save()
    const rad = gradientOverlay.angle * Math.PI / 180
    const cx2 = padL + src.width / 2
    const cy2 = padT + src.height / 2
    const len = Math.sqrt(src.width ** 2 + src.height ** 2) / 2
    const grad = ctx.createLinearGradient(
      cx2 - Math.cos(rad) * len, cy2 + Math.sin(rad) * len,
      cx2 + Math.cos(rad) * len, cy2 - Math.sin(rad) * len,
    )
    for (const stop of gradientOverlay.stops) {
      grad.addColorStop(Math.max(0, Math.min(1, stop.pos)), stop.color)
    }
    ctx.globalCompositeOperation = 'source-atop'
    ctx.globalAlpha = gradientOverlay.alpha
    ctx.fillStyle = grad
    ctx.fillRect(padL, padT, src.width, src.height)
    ctx.restore()
  }

  for (const is of activeInnerShadow) {
    const ox = Math.cos(is.angle) * is.distance
    const oy = -Math.sin(is.angle) * is.distance
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = outW; shadowCanvas.height = outH
    const shCtx = shadowCanvas.getContext('2d')!
    shCtx.fillRect(0, 0, outW, outH)
    shCtx.globalCompositeOperation = 'destination-out'
    shCtx.drawImage(src, padL, padT)
    shCtx.globalCompositeOperation = 'source-over'
    const innerCanvas = document.createElement('canvas')
    innerCanvas.width = outW; innerCanvas.height = outH
    const inCtx = innerCanvas.getContext('2d')!
    inCtx.save()
    inCtx.shadowColor = is.color
    inCtx.shadowBlur = is.size * 2
    inCtx.shadowOffsetX = ox
    inCtx.shadowOffsetY = oy
    inCtx.drawImage(shadowCanvas, 0, 0)
    inCtx.restore()
    inCtx.globalCompositeOperation = 'destination-in'
    inCtx.drawImage(src, padL, padT)
    ctx.save()
    ctx.globalAlpha = is.alpha
    ctx.globalCompositeOperation = 'source-atop'
    ctx.drawImage(innerCanvas, 0, 0)
    ctx.restore()
  }

  return { canvas: out, dx: -padL, dy: -padT }
}

async function renderGroupOffscreen(
  children: Record<string, unknown>[],
  groupX: number,
  groupY: number,
  groupW: number,
  groupH: number,
  parentOpacity: number,
  uploadFn: ((files: File[]) => Promise<{ url: string }[]>) | undefined,
  onProgress: ((msg: string) => void) | undefined,
): Promise<HTMLCanvasElement | null> {
  if (!children.length) return null

  const offscreen = document.createElement('canvas')
  offscreen.width = groupW
  offscreen.height = groupH
  const ctx = offscreen.getContext('2d')!

  const ordered = [...children].reverse()

  for (const child of ordered) {
    if (child.hidden) continue

    const childChildren = child.children as Record<string, unknown>[] | undefined
    if (childChildren !== undefined) {
      const cx = (child.left as number) ?? 0
      const cy = (child.top as number) ?? 0
      const cw = ((child.right as number) ?? groupX + groupW) - cx
      const ch = ((child.bottom as number) ?? groupY + groupH) - cy
      if (cw <= 0 || ch <= 0) continue
      let cOp = 1
      if ((child as any).opacity !== undefined) {
        const op = (child as any).opacity as number
        cOp = op > 1 ? op / 255 : op
      }
      const childBlend = (child as any).blendMode as string | undefined
      const isChildPass = !childBlend || childBlend === 'pass' || childBlend === 'norm'
      const nestedCanvas = await renderGroupOffscreen(childChildren, cx, cy, cw, ch, 1, uploadFn, onProgress)
      if (nestedCanvas) {
        ctx.save()
        ctx.globalAlpha = cOp
        ctx.globalCompositeOperation = isChildPass ? 'source-over' : psBlendToComposite(childBlend) as GlobalCompositeOperation
        ctx.drawImage(nestedCanvas, cx - groupX, cy - groupY)
        ctx.restore()
      }
      continue
    }

    const layerCanvas = child.canvas as HTMLCanvasElement | undefined
    if (!layerCanvas || isCanvasBlank(layerCanvas)) continue

    const lx = (child.left as number) ?? 0
    const ly = (child.top as number) ?? 0
    const lw = ((child.right as number) ?? groupX + groupW) - lx
    const lh = ((child.bottom as number) ?? groupY + groupH) - ly
    if (lw <= 0 || lh <= 0) continue

    let lOp = 1
    if (child.opacity !== undefined) {
      const op = child.opacity as number
      lOp = op > 1 ? op / 255 : op
    }
    const lBlend = psBlendToComposite((child as any).blendMode)

    let canvas = applyPixelMaskFromLayer(layerCanvas, child, lx, ly)
    canvas = applyVectorMaskFromLayer(canvas, child, lx, ly, groupX + groupW, groupY + groupH)

    const effects = child.effects as Record<string, unknown> | undefined
    let drawX = lx - groupX
    let drawY = ly - groupY
    if (effects && hasAnyEffect(effects)) {
      const { canvas: fx, dx, dy } = applyLayerEffects(canvas, effects, lx, ly)
      canvas = fx
      drawX = lx - groupX + dx
      drawY = ly - groupY + dy
    } else {
      drawX = lx - groupX
      drawY = ly - groupY
    }

    ctx.save()
    ctx.globalAlpha = lOp
    ctx.globalCompositeOperation = lBlend as GlobalCompositeOperation
    ctx.drawImage(canvas, drawX, drawY, lw, lh)
    ctx.restore()
  }

  return offscreen
}

function hasAnyEffect(effects: Record<string, unknown>): boolean {
  const keys = ['dropShadow', 'innerShadow', 'outerGlow', 'innerGlow', 'stroke', 'gradientOverlay', 'solidFill', 'patternOverlay']
  for (const k of keys) {
    const arr = effects[k] as Array<Record<string, unknown>> | undefined
    if (arr?.some(e => e.enabled !== false)) return true
  }
  return false
}

function applyPixelMaskFromLayer(
  canvas: HTMLCanvasElement,
  layer: Record<string, unknown>,
  layerLeft: number,
  layerTop: number,
): HTMLCanvasElement {
  const maskInfo = layer.mask as Record<string, unknown> | undefined
  const maskCanvas = maskInfo?.canvas as HTMLCanvasElement | undefined
  if (!maskCanvas || maskCanvas.width === 0 || maskCanvas.height === 0) return canvas
  const maskLeft = (maskInfo?.left as number) ?? layerLeft
  const maskTop = (maskInfo?.top as number) ?? layerTop
  return applyPixelMask(canvas, maskCanvas, layerLeft, layerTop, maskLeft, maskTop)
}

function applyVectorMaskFromLayer(
  canvas: HTMLCanvasElement,
  layer: Record<string, unknown>,
  layerLeft: number,
  layerTop: number,
  docW: number,
  docH: number,
): HTMLCanvasElement {
  const vectorMask = layer.vectorMask as Record<string, unknown> | undefined
  if (!vectorMask) return canvas
  return applyVectorMask(canvas, vectorMask, layerLeft, layerTop, docW, docH)
}

function isPlaceholderName(layer: Record<string, unknown>): boolean {
  const n = ((layer.name as string) ?? '').toLowerCase()
  return (
    n === 'photo' || n.startsWith('photo ') ||
    n === 'image' || n.startsWith('image ') ||
    n === 'your photo' || n === 'your image' ||
    n.includes('place your image') || n.includes('your photo here') ||
    n.includes('photo placeholder') || n.includes('image slot') ||
    n.includes('drop photo here') || n.includes('add photo') ||
    n.includes('place photo') || n.includes('insert photo') ||
    n.includes('insert image') || n.includes('click to replace') ||
    (n.includes('double click') && (n.includes('place') || n.includes('image') || n.includes('photo')))
  )
}

function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return true
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false
  }
  return true
}

function sampleCanvasColor(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const points = [
    [0.1, 0.1], [0.5, 0.1], [0.9, 0.1],
    [0.1, 0.5], [0.5, 0.5], [0.9, 0.5],
    [0.1, 0.9], [0.5, 0.9], [0.9, 0.9],
  ]
  const freq: Record<string, number> = {}
  for (const [rx, ry] of points) {
    const px = Math.floor(canvas.width * rx)
    const py = Math.floor(canvas.height * ry)
    const d = ctx.getImageData(px, py, 1, 1).data
    if (d[3] < 200) continue
    const hex = rgbToHex(d[0], d[1], d[2])
    freq[hex] = (freq[hex] ?? 0) + 1
  }
  if (!Object.keys(freq).length) return null
  const sorted = Object.entries(freq).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return (a[0] === '#ffffff' ? 1 : 0) - (b[0] === '#ffffff' ? 1 : 0)
  })
  return sorted[0][0]
}

// trimCanvas is kept for clipping-group compositing (not used for raster geometry)
function trimCanvas(canvas: HTMLCanvasElement): { x: number; y: number; w: number; h: number } | null {
  const bounds = getVisiblePixelBounds(canvas)
  if (!bounds) return null
  return { x: bounds.left, y: bounds.top, w: bounds.width, h: bounds.height }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

function compareWithComposite(
  canvas: HTMLCanvasElement,
  docX: number,
  docY: number,
  docElemW: number,
  docElemH: number,
  composite: HTMLCanvasElement,
  docTotalW: number,
  docTotalH: number,
  layerName: string,
): void {
  const sW = Math.min(64, canvas.width)
  const sH = Math.min(64, canvas.height)
  if (sW < 4 || sH < 4) return
  const compScaleX = composite.width / docTotalW
  const compScaleY = composite.height / docTotalH
  const layerSample = document.createElement('canvas')
  layerSample.width = sW; layerSample.height = sH
  const lCtx = layerSample.getContext('2d', { willReadFrequently: true })
  if (!lCtx) return
  lCtx.drawImage(canvas, 0, 0, sW, sH)
  const compSample = document.createElement('canvas')
  compSample.width = sW; compSample.height = sH
  const cCtx = compSample.getContext('2d', { willReadFrequently: true })
  if (!cCtx) return
  cCtx.drawImage(composite,
    docX * compScaleX, docY * compScaleY,
    docElemW * compScaleX, docElemH * compScaleY,
    0, 0, sW, sH,
  )
  const layerData = lCtx.getImageData(0, 0, sW, sH).data
  const compData  = cCtx.getImageData(0, 0, sW, sH).data
  let mismatch = 0
  const total = sW * sH
  for (let i = 0; i < layerData.length; i += 4) {
    if (layerData[i + 3] < 10) continue
    const diff = Math.abs(layerData[i]     - compData[i])
               + Math.abs(layerData[i + 1] - compData[i + 1])
               + Math.abs(layerData[i + 2] - compData[i + 2])
    if (diff > 90) mismatch++
  }
  const pct = mismatch / total
  if (pct > 0.1) {
    console.warn('[VISUAL MISMATCH]', layerName, {
      mismatch: Math.round(pct * 100) + '%',
      pos:  `${Math.round(docX)},${Math.round(docY)}`,
      size: `${Math.round(docElemW)}×${Math.round(docElemH)}`,
    })
  }
}

function applyPixelMask(
  layerCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  layerLeft: number,
  layerTop: number,
  maskLeft: number,
  maskTop: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = layerCanvas.width
  out.height = layerCanvas.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(layerCanvas, 0, 0)
  const maskOffsetX = maskLeft - layerLeft
  const maskOffsetY = maskTop - layerTop
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskCanvas, maskOffsetX, maskOffsetY)
  ctx.globalCompositeOperation = 'source-over'
  return out
}

function rasterizeVectorMask(
  vectorMask: Record<string, unknown>,
  docW: number,
  docH: number,
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = docW
  canvas.height = docH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'

  const paths = vectorMask.paths as Array<Record<string, unknown>> | undefined
  if (!paths?.length) return null

  ctx.beginPath()
  let hasPath = false

  for (const pathResource of paths) {
    const ops = pathResource.ops as Array<Record<string, unknown>> | undefined
    if (!ops?.length) continue

    let started = false
    for (const op of ops) {
      const pt = op.anchor as { h: number; v: number } | undefined
      if (!pt) continue
      const px = pt.h * docW
      const py = pt.v * docH
      if (!started) { ctx.moveTo(px, py); started = true }
      else ctx.lineTo(px, py)
      hasPath = true
    }
    if (started) ctx.closePath()
  }

  if (!hasPath) return null
  ctx.fill()
  return canvas
}

function applyVectorMask(
  layerCanvas: HTMLCanvasElement,
  vectorMask: Record<string, unknown>,
  layerLeft: number,
  layerTop: number,
  docW: number,
  docH: number,
): HTMLCanvasElement {
  const maskCanvas = rasterizeVectorMask(vectorMask, docW, docH)
  if (!maskCanvas) return layerCanvas

  const out = document.createElement('canvas')
  out.width = layerCanvas.width
  out.height = layerCanvas.height
  const ctx = out.getContext('2d')!
  ctx.drawImage(layerCanvas, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskCanvas, -layerLeft, -layerTop)
  ctx.globalCompositeOperation = 'source-over'
  return out
}

function composeClippingGroup(
  baseLayers: Array<{ canvas: HTMLCanvasElement; x: number; y: number; blendMode: string; opacity: number }>,
  baseX: number,
  baseY: number,
  baseW: number,
  baseH: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = baseW
  out.height = baseH
  const ctx = out.getContext('2d')!

  for (const layer of baseLayers) {
    ctx.globalAlpha = layer.opacity
    if (layer === baseLayers[0]) {
      ctx.globalCompositeOperation = 'source-over'
    } else {
      ctx.globalCompositeOperation = layer.blendMode === 'source-over' ? 'source-atop' : (layer.blendMode as GlobalCompositeOperation)
    }
    ctx.drawImage(layer.canvas, layer.x - baseX, layer.y - baseY)
    ctx.globalAlpha = 1
  }

  return out
}

// ─── PSD → TemplateJson ───────────────────────────────────────────────────────

async function convertPsdToTemplateJson(
  psd: Record<string, unknown>,
  uploadAssets?: (files: File[]) => Promise<{ url: string }[]>,
  onProgress?: (msg: string) => void,
): Promise<TemplateJsonData> {
  const docW = (psd.width as number) ?? 7200
  const docH = (psd.height as number) ?? 2400
  let background = '#1a1a1a'
  let backgroundAdded = false
  const elements: any[] = []
  let idx = 0
  let layerOrder = 0

  const _geoLog: Array<Record<string, unknown>> = []
  function _logLayerGeo(layer: Record<string, unknown>, parentGroup: string, layerType: string) {
    const left   = (layer.left  as number) ?? 0
    const top    = (layer.top   as number) ?? 0
    const right  = (layer.right as number) ?? 0
    const bottom = (layer.bottom as number) ?? 0
    const w = right - left
    const h = bottom - top
    _geoLog.push({
      name:          (layer.name as string) ?? '(unnamed)',
      type:          layerType,
      left, top, right, bottom,
      width:         w,
      height:        h,
      clipping:      !!(layer as any).clipping,
      hasMask:       !!(layer as any).mask,
      hasVectorMask: !!(layer as any).vectorMask,
      parentGroup,
      OVERSIZED:     w > docW || h > docH ? '⚠' : '',
    })
  }

  const _audit: Array<{
    name: string
    psdL: number; psdT: number; psdR: number; psdB: number
    psdW: number; psdH: number
    pixelL: number|null; pixelT: number|null; pixelW: number|null; pixelH: number|null
    canvasW: number|null; canvasH: number|null
    plW: number|null; plH: number|null
    t8: string
    outX: number; outY: number; outW: number; outH: number; outRot: number
    dX: number; dY: number; dW: number; dH: number
    badGeo: string
    geomSrc: 'pixel' | 'psd' | 'smart-obj'
  }> = []

  function _recordAudit(
    layer: Record<string, unknown>,
    srcX: number, srcY: number, srcW: number, srcH: number,
    outX: number, outY: number, outW: number, outH: number, outRot: number,
    pixelBounds: { left: number; top: number; width: number; height: number } | null,
    geomSrc: 'pixel' | 'psd' | 'smart-obj',
  ) {
    const pl = (layer as any).placedLayer
    const c  = (layer as any).canvas as HTMLCanvasElement | null | undefined
    const t8 = pl?.transform as number[] | undefined
    const bad: string[] = []
    // NOTE: We intentionally do NOT flag x<0 / y+h>docH as bad geometry —
    // Photoshop legitimately allows elements to bleed outside the document.

    // Warn when pixel bounds differ significantly from PSD metadata bounds
    if (pixelBounds) {
      const pixW = pixelBounds.width
      const pixH = pixelBounds.height
      if (Math.abs(srcW - pixW) > 20 || Math.abs(srcH - pixH) > 20) {
        console.warn('[PSD BOUNDS WRONG]', {
          name: (layer.name as string) ?? '(unnamed)',
          psdBounds:   { x: Math.round(srcX), y: Math.round(srcY), w: Math.round(srcW), h: Math.round(srcH) },
          pixelBounds: { left: pixelBounds.left, top: pixelBounds.top, w: pixW, h: pixH },
          delta:       { dW: Math.round(pixW - srcW), dH: Math.round(pixH - srcH) },
        })
        bad.push('psd≠pixel')
      }
    }

    const entry = {
      name:    (layer.name as string) ?? '(unnamed)',
      psdL: Math.round(srcX),        psdT: Math.round(srcY),
      psdR: Math.round(srcX + srcW), psdB: Math.round(srcY + srcH),
      psdW: Math.round(srcW),        psdH: Math.round(srcH),
      pixelL: pixelBounds ? Math.round(pixelBounds.left) : null,
      pixelT: pixelBounds ? Math.round(pixelBounds.top)  : null,
      pixelW: pixelBounds ? Math.round(pixelBounds.width)  : null,
      pixelH: pixelBounds ? Math.round(pixelBounds.height) : null,
      canvasW: c ? c.width  : null,  canvasH: c ? c.height : null,
      plW:    pl?.width  ?? null,    plH:    pl?.height ?? null,
      t8:     t8 ? `[${t8.slice(0, 8).map((v: number) => Math.round(v)).join(',')}]` : 'none',
      outX: Math.round(outX), outY: Math.round(outY),
      outW: Math.round(outW), outH: Math.round(outH),
      outRot: Math.round(outRot),
      dX: Math.round(outX - srcX), dY: Math.round(outY - srcY),
      dW: Math.round(outW - srcW), dH: Math.round(outH - srcH),
      badGeo: bad.join(','),
      geomSrc,
    }
    _audit.push(entry)
  }

  // STEP 3 — PSD overflow is intentionally preserved; no clamping.
  function isOutOfBounds(x: number, y: number, w: number, h: number): boolean {
    // Only skip layers that are ENTIRELY outside — partial bleed is valid.
    return x >= docW || y >= docH || x + w <= 0 || y + h <= 0
  }

  async function uploadCanvas(canvas: HTMLCanvasElement, name: string): Promise<string | null> {
    if (!uploadAssets) return null
    try {
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
      if (!blob) return null
      const file = new File([blob], `${name}.png`, { type: 'image/png' })
      const uploaded = await uploadAssets([file])
      return uploaded?.[0]?.url ?? null
    } catch (e) {
      console.warn(`Upload failed for ${name}:`, e)
      return null
    }
  }

  function applyAllMasks(
    layerCanvas: HTMLCanvasElement,
    layer: Record<string, unknown>,
  ): HTMLCanvasElement {
    let result = layerCanvas
    const layerLeft = (layer.left as number) ?? 0
    const layerTop = (layer.top as number) ?? 0

    const maskInfo = layer.mask as Record<string, unknown> | undefined
    const maskCanvas = maskInfo?.canvas as HTMLCanvasElement | undefined
    if (maskCanvas && maskCanvas.width > 0 && maskCanvas.height > 0) {
      const maskLeft = (maskInfo?.left as number) ?? layerLeft
      const maskTop = (maskInfo?.top as number) ?? layerTop
      result = applyPixelMask(result, maskCanvas, layerLeft, layerTop, maskLeft, maskTop)
    }

    const vectorMask = layer.vectorMask as Record<string, unknown> | undefined
    if (vectorMask) {
      result = applyVectorMask(result, vectorMask, layerLeft, layerTop, docW, docH)
    }

    return result
  }

  // ── STEP 4 — Smart object bounds from transform corners ───────────────────
  /**
   * Resolve position, size, and rotation for a placed smart object.
   *
   * Priority:
   *   1. placedLayer.transform[8] — corner coordinates; derive tight AABB + rotation.
   *      Ignores placedLayer.width/height (embedded content's native size) entirely.
   *   2. Fallback: raw axis-aligned layer bounds (no rotation).
   */
  function resolvePlacedLayerBounds(layer: Record<string, unknown>): {
    x: number; y: number; w: number; h: number; rotation: number
  } {
    const rawX = (layer.left as number) ?? 0
    const rawY = (layer.top as number) ?? 0
    const rawW = ((layer.right as number) ?? docW) - rawX
    const rawH = ((layer.bottom as number) ?? docH) - rawY
    const pl = (layer as any).placedLayer
    const t = pl?.transform as number[] | undefined

    if (t && t.length >= 8) {
      const tlx = t[0], tly = t[1]
      const trx = t[2], try_ = t[3]
      const brx = t[4], bry = t[5]
      const blx = t[6], bly = t[7]

      // Derive width/height from edge lengths (not the axis-aligned bounding box)
      const w = Math.round(Math.hypot(trx - tlx, try_ - tly))
      const h = Math.round(Math.hypot(brx - trx, bry - try_))
      const rotation = Math.atan2(try_ - tly, trx - tlx) * 180 / Math.PI

      // Tight AABB origin: minimum of all four corners
      const minX = Math.min(tlx, trx, brx, blx)
      const minY = Math.min(tly, try_, bry, bly)

      console.log('[PSD SMART OBJ]', {
        name: (layer.name as string) ?? '(unnamed)',
        rawBounds: { rawX, rawY, rawW, rawH },
        'placedLayer.wh (ignored)': [pl?.width, pl?.height],
        transform8: t,
        corners: { tl: [tlx, tly], tr: [trx, try_], br: [brx, bry], bl: [blx, bly] },
        derived: { x: Math.round(minX), y: Math.round(minY), w, h, rotation: Math.round(rotation) },
      })

      if (w > 0 && h > 0) {
        return { x: minX, y: minY, w, h, rotation }
      }
    }

    console.log('[PSD SMART OBJ fallback]', {
      name: (layer.name as string) ?? '(unnamed)',
      rawBounds: { rawX, rawY, rawW, rawH },
      'placedLayer.wh': [pl?.width, pl?.height],
      transform8: t,
    })
    return { x: rawX, y: rawY, w: rawW, h: rawH, rotation: 0 }
  }

  async function processLeafLayer(
    layer: Record<string, unknown>,
    parentOpacity: number,
    pendingClipGroup: Array<{ layer: Record<string, unknown>; opacity: number }> | null,
    isClipBase: boolean,
  ): Promise<'element' | 'skip' | 'clip_base' | 'clipped'> {
    if (layer.hidden) {
      console.log('[PSD SKIP]', { name: layer.name, reason: 'layer.hidden === true' })
      return 'skip'
    }

    // PSD metadata bounds — used for position anchor, NOT for final element size
    const psdX = (layer.left as number) ?? 0
    const psdY = (layer.top as number) ?? 0
    const psdW = ((layer.right as number) ?? docW) - psdX
    const psdH = ((layer.bottom as number) ?? docH) - psdY

    const _layerType = layer.text ? 'text' : (layer as any).adjustment ? 'adjustment' : (layer as any).vectorMask && !(layer as any).canvas ? 'vectorFill' : 'raster'
    _logLayerGeo(layer, '', _layerType)

    if (psdW <= 0 || psdH <= 0) {
      console.log('[PSD SKIP]', { name: layer.name, reason: 'zero or negative PSD dimensions', psdW, psdH })
      return 'skip'
    }
    if (isOutOfBounds(psdX, psdY, psdW, psdH)) {
      console.log('[PSD SKIP]', { name: layer.name, reason: 'fully outside document bounds', psdX, psdY, psdW, psdH })
      return 'skip'
    }

    let layerOpacity = 1
    if (layer.opacity !== undefined) {
      const op = layer.opacity as number
      layerOpacity = op > 1 ? op / 255 : op
    }
    const opacity = Math.min(1, Math.max(0, layerOpacity * parentOpacity))
    const blendMode = psBlendToComposite((layer as any).blendMode)
    const layerName = ((layer.name as string) ?? '').toLowerCase()
    const textData = layer.text as Record<string, unknown> | undefined

    // ── TEXT ────────────────────────────────────────────────────────────────
    if (textData) {
      const styleRuns = textData.styleRuns as Array<Record<string, unknown>> | undefined
      const firstRunStyle = (styleRuns?.[0]?.style as Record<string, unknown>) ?? {}
      const ts = Object.keys(firstRunStyle).length
        ? { ...(textData.style as Record<string, unknown> ?? {}), ...firstRunStyle }
        : (textData.style as Record<string, unknown>) ?? {}

      const fc = ts.fillColor as Record<string, number> | undefined
      const color = fc ? rgbToHex(fc.r ?? 255, fc.g ?? 255, fc.b ?? 255) : '#ffffff'

      const paragraphRuns = textData.paragraphStyleRuns as Array<Record<string, unknown>> | undefined
      const paraStyle = (paragraphRuns?.[0]?.paragraphStyle ?? textData.defaultParagraphStyle) as Record<string, unknown> | undefined
      const justMap: Record<string, string> = {
        left: 'left', right: 'right', center: 'center',
        justifyLeft: 'left', justifyRight: 'right', justifyCenter: 'center', justifyAll: 'left',
      }
      const rawJust = (paraStyle?.justification as string) ?? 'left'
      const text_align = (justMap[rawJust] ?? 'left') as 'left' | 'center' | 'right'

      const fontSize = (ts.fontSize as number) ?? 48
      const tracking = (ts.tracking as number) ?? 0
      const letter_spacing = Math.round((tracking / 1000) * fontSize * 10) / 10

      const leading = ts.leading as number | undefined
      const line_height = leading ? Math.round((leading / fontSize) * 100) / 100 : 1.2

      const synBold = !!(ts.syntheticBold)
      const synItalic = !!(ts.syntheticItalic)
      const fontName = ((ts.font as Record<string, unknown>)?.name as string) ?? 'serif'
      const font_weight = synBold ? '700' : '400'
      const font_style: 'normal' | 'italic' = synItalic ? 'italic' : 'normal'
      const text_decoration: 'none' | 'underline' = (ts.underline) ? 'underline' : 'none'

      // Text layers always use PSD bounds (no pixel canvas to scan)
      _recordAudit(layer, psdX, psdY, psdW, psdH, psdX, psdY, psdW, psdH, 0, null, 'psd')
      elements.push({
        id: `text_${idx++}`,
        type: 'text',
        layerOrder: layerOrder++,
        x: psdX, y: psdY, width: psdW, height: psdH,
        rotation: 0, opacity,
        locked: false, visible: true,
        blend_mode: blendMode,
        text: (textData.text as string) ?? '',
        font_size: fontSize,
        font_family: fontName,
        font_weight, font_style, text_decoration, text_align,
        color, letter_spacing, line_height,
      })
      return 'element'
    }

    // ── PHOTO PLACEHOLDER ────────────────────────────────────────────────────
    if (isPlaceholderName(layer)) {
      // Smart objects use transform-derived bounds; plain placeholders use PSD metadata
      const bounds = resolvePlacedLayerBounds(layer)
      _recordAudit(layer, psdX, psdY, psdW, psdH, bounds.x, bounds.y, bounds.w, bounds.h, bounds.rotation, null, 'smart-obj')
      elements.push({
        id: `img_placeholder_${idx++}`,
        type: 'image',
        layerOrder: layerOrder++,
        x: bounds.x, y: bounds.y, width: bounds.w, height: bounds.h,
        rotation: bounds.rotation, opacity,
        src: '', locked: false, visible: true,
        blend_mode: blendMode,
        fit_mode: 'fill', border_radius: 0,
      })
      return 'element'
    }

    // ── SOLID COLOUR FILL ────────────────────────────────────────────────────
    const effects = layer.effects as Record<string, unknown> | undefined
    const solidFills = effects?.solidFill as Array<Record<string, number>> | undefined
    const solidColorRaw = solidFills?.[0]?.color as Record<string, number> | undefined
    let solidColor: { r: number; g: number; b: number } | undefined
    if (solidColorRaw) {
      if (solidColorRaw.r !== undefined) {
        solidColor = { r: solidColorRaw.r, g: solidColorRaw.g, b: solidColorRaw.b }
      } else if (solidColorRaw.fr !== undefined) {
        solidColor = {
          r: Math.round(solidColorRaw.fr * 255),
          g: Math.round(solidColorRaw.fg * 255),
          b: Math.round(solidColorRaw.fb * 255),
        }
      }
    }
    if (solidColor) {
      const isBg = !backgroundAdded && (
        layerName === 'background' ||
        (psdX <= 2 && psdY <= 2 && psdW >= docW * 0.95 && psdH >= docH * 0.95)
      )
      if (isBg) {
        background = rgbToHex(solidColor.r, solidColor.g, solidColor.b)
        backgroundAdded = true
        return 'element'
      }
      // Solid fills use PSD bounds (no canvas to pixel-scan)
      _recordAudit(layer, psdX, psdY, psdW, psdH, psdX, psdY, psdW, psdH, 0, null, 'psd')
      elements.push({
        id: `shape_${idx++}`,
        type: 'shape', shape_type: 'rect',
        layerOrder: layerOrder++,
        x: psdX, y: psdY, width: psdW, height: psdH,
        rotation: 0, opacity, locked: false, visible: true,
        blend_mode: blendMode,
        fill: rgbToHex(solidColor.r, solidColor.g, solidColor.b),
        stroke: 'transparent', stroke_width: 0, corner_radius: 0,
      })
      return 'element'
    }

    // ── RASTER / SMART OBJECT ─────────────────────────────────────────────────
    const layerCanvas = layer.canvas as HTMLCanvasElement | undefined
    if (layerCanvas && !isCanvasBlank(layerCanvas) && uploadAssets) {
      const hasAnyMask = !!(layer as any).mask || !!(layer as any).vectorMask
      const coversDoc = !hasAnyMask && psdX <= 2 && psdY <= 2 && psdW >= docW * 0.95 && psdH >= docH * 0.95
      if (coversDoc) {
        if (!backgroundAdded) {
          const sampled = sampleCanvasColor(layerCanvas)
          if (sampled) { background = sampled; backgroundAdded = true }
        }
        return 'skip'
      }

      const coverage = (psdW / docW) * (psdH / docH)
      if (coverage > 0.7 && !(layer as any).clipping) {
        console.warn('[PSD COMPOSITE CANDIDATE]', (layer.name as string) ?? '(unnamed)',
          { coverage: Math.round(coverage * 100) + '%', psdW, psdH })
      }

      const docArea = docW * docH
      if (psdW * psdH > 0.85 * docArea && opacity < 0.35 && blendMode === 'source-over') {
        console.log('[PSD SKIP]', { name: layer.name,
          reason: 'page-cover overlay: large+low-opacity+normal-blend',
          coverage: Math.round(coverage * 100) + '%', opacity })
        return 'skip'
      }

      // 1. Apply pixel & vector masks
      let workCanvas = applyAllMasks(layerCanvas, layer)

      // 2. Bake layer effects
      const layerEffects = layer.effects as Record<string, unknown> | undefined
      let effectsDx = 0
      let effectsDy = 0
      if (layerEffects && hasAnyEffect(layerEffects)) {
        const { canvas: fx, dx, dy } = applyLayerEffects(workCanvas, layerEffects, psdX, psdY)
        workCanvas = fx
        effectsDx = dx
        effectsDy = dy
      }

      // ── STEP 2 — Pixel-derived geometry ──────────────────────────────────
      // Scan the processed canvas for the tight bounding box of visible pixels.
      // This replaces the old trimCanvas approach and also replaces PSD metadata bounds.
      let outX: number
      let outY: number
      let outW: number
      let outH: number
      let pixelBoundsForAudit: { left: number; top: number; width: number; height: number } | null = null

      if (USE_PIXEL_GEOMETRY) {
        const pixBounds = getVisiblePixelBounds(workCanvas)
        if (!pixBounds) {
          console.log('[PSD SKIP]', { name: layer.name, reason: 'fully transparent after masks/effects (pixel scan)' })
          return 'skip'
        }

        // pixBounds is in canvas-local space; translate to document space.
        // The canvas covers [psdX + effectsDx, psdY + effectsDy] in doc coordinates,
        // scaled by (psdW / layerCanvas.width) × (psdH / layerCanvas.height).
        const scaleX = psdW / layerCanvas.width
        const scaleY = psdH / layerCanvas.height

        outX = psdX + effectsDx + pixBounds.left  * scaleX
        outY = psdY + effectsDy + pixBounds.top   * scaleY
        outW = pixBounds.width  * scaleX
        outH = pixBounds.height * scaleY

        pixelBoundsForAudit = pixBounds

        // ── STEP 5 — log pixel vs PSD bounds ─────────────────────────────
        console.log('[PIXEL BOUNDS]', {
          name:        (layer.name as string) ?? `layer_${idx}`,
          psdBounds:   { x: Math.round(psdX), y: Math.round(psdY), w: Math.round(psdW), h: Math.round(psdH) },
          pixelBounds: {
            left:   pixBounds.left,
            top:    pixBounds.top,
            right:  pixBounds.right,
            bottom: pixBounds.bottom,
            w:      pixBounds.width,
            h:      pixBounds.height,
          },
          delta: {
            dX: Math.round(outX - psdX),
            dY: Math.round(outY - psdY),
            dW: Math.round(outW - psdW),
            dH: Math.round(outH - psdH),
          },
          docSpace: { x: Math.round(outX), y: Math.round(outY), w: Math.round(outW), h: Math.round(outH) },
        })
      } else {
        // Legacy path: use trimCanvas (mirrors old behaviour exactly)
        const trim = trimCanvas(workCanvas)
        if (!trim) {
          console.log('[PSD SKIP]', { name: layer.name, reason: 'fully transparent after masks/effects' })
          return 'skip'
        }
        const scaleX = psdW / layerCanvas.width
        const scaleY = psdH / layerCanvas.height
        outX = psdX + effectsDx + trim.x * scaleX
        outY = psdY + effectsDy + trim.y * scaleY
        outW = trim.w * scaleX
        outH = trim.h * scaleY
      }

      // Crop the canvas to the visible pixel region for PNG export
      const pixBoundsForCrop = USE_PIXEL_GEOMETRY
        ? getVisiblePixelBounds(workCanvas)!   // already confirmed non-null above
        : (() => { const t = trimCanvas(workCanvas); return t ? { left: t.x, top: t.y, width: t.w, height: t.h } : null })()

      if (!pixBoundsForCrop) return 'skip'

      // STEP 5 — export as PNG preserving alpha
      const trimmedCanvas = document.createElement('canvas')
      trimmedCanvas.width  = pixBoundsForCrop.width
      trimmedCanvas.height = pixBoundsForCrop.height
      const tCtx = trimmedCanvas.getContext('2d')
      if (!tCtx) return 'skip'
      tCtx.drawImage(workCanvas, -pixBoundsForCrop.left, -pixBoundsForCrop.top)

      // Pixel-fidelity check against PSD composite
      const psdCompositeCanvas = (psd as any).canvas as HTMLCanvasElement | undefined
      if (psdCompositeCanvas && psdCompositeCanvas.width > 0) {
        compareWithComposite(trimmedCanvas, outX, outY, outW, outH,
          psdCompositeCanvas, docW, docH, (layer.name as string) ?? `layer_${idx}`)
      }

      _recordAudit(layer, psdX, psdY, psdW, psdH, outX, outY, outW, outH, 0, pixelBoundsForAudit, USE_PIXEL_GEOMETRY ? 'pixel' : 'psd')

      onProgress?.(`Uploading layer: ${(layer.name as string) ?? idx}`)
      const url = await uploadCanvas(trimmedCanvas, `layer_${idx}`)
      if (url) {
        elements.push({
          id: `img_${idx++}`,
          type: 'image',
          layerOrder: layerOrder++,
          x: outX,
          y: outY,
          width:  outW,
          height: outH,
          rotation: 0, opacity,
          src: url,
          locked: false, visible: true,
          blend_mode: blendMode,
          fit_mode: 'fill', border_radius: 0,
        })
        return 'element'
      }
    }

    // ── ADJUSTMENT LAYER ─────────────────────────────────────────────────────
    const isAdjustment = !!(layer as any).adjustment
    if (isAdjustment) {
      const psdComposite = (psd as any).canvas as HTMLCanvasElement | undefined
      if (psdComposite && psdComposite.width > 0 && uploadAssets) {
        const coversDoc = psdX <= 2 && psdY <= 2 && psdW >= docW * 0.95 && psdH >= docH * 0.95
        if (!coversDoc) {
          const cropCanvas = document.createElement('canvas')
          cropCanvas.width = psdW
          cropCanvas.height = psdH
          const cCtx = cropCanvas.getContext('2d')
          if (cCtx) {
            const scaleX = psdComposite.width / docW
            const scaleY = psdComposite.height / docH
            cCtx.drawImage(psdComposite, psdX * scaleX, psdY * scaleY, psdW * scaleX, psdH * scaleY, 0, 0, psdW, psdH)
            if (!isCanvasBlank(cropCanvas)) {
              onProgress?.(`Uploading adjustment: ${(layer.name as string) ?? idx}`)
              const url = await uploadCanvas(cropCanvas, `adj_${idx}`)
              if (url) {
                _recordAudit(layer, psdX, psdY, psdW, psdH, psdX, psdY, psdW, psdH, 0, null, 'psd')
                elements.push({
                  id: `img_${idx++}`,
                  type: 'image',
                  layerOrder: layerOrder++,
                  x: psdX, y: psdY, width: psdW, height: psdH,
                  rotation: 0, opacity,
                  src: url,
                  locked: false, visible: true,
                  blend_mode: blendMode,
                  fit_mode: 'fill', border_radius: 0,
                })
                return 'element'
              }
            }
          }
        }
      }
      console.log('[PSD SKIP]', { name: layer.name, reason: 'adjustment layer: no composite or full-doc coverage' })
      return 'skip'
    }

    console.log('[PSD SKIP]', {
      name: layer.name,
      reason: !uploadAssets ? 'no uploadAssets fn' : !layerCanvas ? 'no canvas data' : 'canvas is blank or pixel scan found nothing',
    })
    return 'skip'
  }

  function resolveCanvas(layer: Record<string, unknown>): HTMLCanvasElement | null {
    const c = layer.canvas as HTMLCanvasElement | undefined
    if (!c || isCanvasBlank(c)) return null
    return applyAllMasks(c, layer)
  }

  async function processClippingGroup(
    baseLayers: Record<string, unknown>[],
    parentOpacity: number,
  ): Promise<void> {
    if (!baseLayers.length) return

    const base = baseLayers[0]
    const bx = (base.left as number) ?? 0
    const by = (base.top as number) ?? 0
    const bw = ((base.right as number) ?? docW) - bx
    const bh = ((base.bottom as number) ?? docH) - by

    if (bw <= 0 || bh <= 0 || isOutOfBounds(bx, by, bw, bh)) {
      console.log('[PSD SKIP]', { name: base.name, reason: 'clipping base out of bounds or zero size' })
      return
    }

    const blendMode = psBlendToComposite((base as any).blendMode)
    let layerOpacity = 1
    if (base.opacity !== undefined) {
      const op = base.opacity as number
      layerOpacity = op > 1 ? op / 255 : op
    }
    const opacity = Math.min(1, Math.max(0, layerOpacity * parentOpacity))

    if (baseLayers.length === 1) {
      await processLeafLayer(base, parentOpacity, null, false)
      return
    }

    const placeholderLayers = baseLayers.slice(1).filter(l => isPlaceholderName(l))
    const canvasSources = baseLayers.filter(l => !isPlaceholderName(l))

    const baseCanvas = resolveCanvas(base)

    const compositeLayers: Array<{ canvas: HTMLCanvasElement; x: number; y: number; blendMode: string; opacity: number }> = []

    for (const layer of canvasSources) {
      const c = layer === base ? baseCanvas : resolveCanvas(layer)
      if (!c) continue
      const lx = (layer.left as number) ?? 0
      const ly = (layer.top as number) ?? 0
      const lw = ((layer.right as number) ?? docW) - lx
      const lh = ((layer.bottom as number) ?? docH) - ly

      const scaled = document.createElement('canvas')
      scaled.width = bw
      scaled.height = bh
      const sCtx = scaled.getContext('2d')!
      sCtx.drawImage(c, (lx - bx), (ly - by), lw, lh)

      let lOp = 1
      if (layer.opacity !== undefined) {
        const op = layer.opacity as number
        lOp = op > 1 ? op / 255 : op
      }

      compositeLayers.push({
        canvas: scaled,
        x: 0, y: 0,
        blendMode: psBlendToComposite((layer as any).blendMode),
        opacity: lOp,
      })
    }

    // Derive frame bounds via pixel scan rather than trim heuristic
    let frameX = bx, frameY = by, frameW = bw, frameH = bh
    if (baseCanvas && USE_PIXEL_GEOMETRY) {
      const pixBounds = getVisiblePixelBounds(baseCanvas)
      if (pixBounds) {
        // baseCanvas is in layer-local space (origin = bx, by in doc coords)
        const scaleX = bw / baseCanvas.width
        const scaleY = bh / baseCanvas.height
        frameX = bx + pixBounds.left  * scaleX
        frameY = by + pixBounds.top   * scaleY
        frameW = pixBounds.width  * scaleX
        frameH = pixBounds.height * scaleY
        console.log('[PIXEL BOUNDS clipping-base]', {
          name: (base.name as string) ?? '(unnamed)',
          psdFrame: { bx, by, bw, bh },
          pixelFrame: { frameX: Math.round(frameX), frameY: Math.round(frameY), frameW: Math.round(frameW), frameH: Math.round(frameH) },
        })
      }
    } else if (baseCanvas) {
      // Legacy trim path
      const bt = trimCanvas(baseCanvas)
      if (bt) {
        frameX = bx + bt.x
        frameY = by + bt.y
        frameW = bt.w
        frameH = bt.h
      }
    }

    for (const ph of placeholderLayers) {
      let phOp = 1
      if ((ph as any).opacity !== undefined) {
        const op = (ph as any).opacity as number
        phOp = op > 1 ? op / 255 : op
      }
      const _phL = (ph.left as number) ?? 0
      const _phT = (ph.top  as number) ?? 0
      const _phW = ((ph.right  as number) ?? docW) - _phL
      const _phH = ((ph.bottom as number) ?? docH) - _phT
      _recordAudit(ph, _phL, _phT, _phW, _phH, frameX, frameY, frameW, frameH, 0, null, 'psd')
      elements.push({
        id: `img_placeholder_${idx++}`,
        type: 'image',
        layerOrder: layerOrder++,
        x: frameX, y: frameY, width: frameW, height: frameH,
        rotation: 0, opacity: Math.min(1, Math.max(0, phOp * parentOpacity)),
        src: '', locked: false, visible: true,
        blend_mode: psBlendToComposite((ph as any).blendMode),
        fit_mode: 'fill', border_radius: 0,
        clipTo: { x: bx, y: by, w: bw, h: bh },
      })
    }

    if (!compositeLayers.length) {
      if (!placeholderLayers.length) {
        console.log('[PSD SKIP]', { name: base.name, reason: 'clipping group: no renderable canvases' })
      }
      return
    }

    const composed = composeClippingGroup(compositeLayers, 0, 0, bw, bh)

    onProgress?.(`Uploading clipping group: ${(base.name as string) ?? idx}`)
    const url = await uploadCanvas(composed, `clip_group_${idx}`)
    if (url) {
      // Use pixel bounds for the composed clipping group output
      let cgOutX = bx, cgOutY = by, cgOutW = bw, cgOutH = bh
      let cgPixBounds: { left: number; top: number; width: number; height: number } | null = null
      if (USE_PIXEL_GEOMETRY) {
        const pixBounds = getVisiblePixelBounds(composed)
        if (pixBounds) {
          cgOutX = bx + pixBounds.left
          cgOutY = by + pixBounds.top
          cgOutW = pixBounds.width
          cgOutH = pixBounds.height
          cgPixBounds = pixBounds
          console.log('[PIXEL BOUNDS clipping-group]', {
            name: (base.name as string) ?? '(unnamed)',
            psd: { bx, by, bw, bh },
            pixel: { x: Math.round(cgOutX), y: Math.round(cgOutY), w: Math.round(cgOutW), h: Math.round(cgOutH) },
          })
        }
      } else {
        const trim = trimCanvas(composed)
        if (trim) {
          cgOutX = bx + trim.x
          cgOutY = by + trim.y
          cgOutW = trim.w
          cgOutH = trim.h
        }
      }
      _recordAudit(base, bx, by, bw, bh, cgOutX, cgOutY, cgOutW, cgOutH, 0, cgPixBounds, USE_PIXEL_GEOMETRY ? 'pixel' : 'psd')
      elements.push({
        id: `img_${idx++}`,
        type: 'image',
        layerOrder: layerOrder++,
        x: cgOutX,
        y: cgOutY,
        width:  cgOutW,
        height: cgOutH,
        rotation: 0, opacity,
        src: url,
        locked: false, visible: true,
        blend_mode: blendMode,
        fit_mode: 'fill', border_radius: 0,
        clipTo: { x: bx, y: by, w: bw, h: bh },
      })
    } else {
      console.log('[PSD SKIP]', { name: base.name, reason: 'clipping group: upload failed' })
    }
  }

  const processLayers = async (
    layers: Record<string, unknown>[],
    parentOpacity = 1,
    depth = 0,
  ) => {
    const ordered = [...layers].reverse()

    let i = 0
    while (i < ordered.length) {
      const layer = ordered[i]

      // ── GROUP ───────────────────────────────────────────────────────────────
      const children = layer.children as Record<string, unknown>[] | undefined
      if (children !== undefined) {
        _logLayerGeo(layer, `depth:${depth}`, 'group')
        if (layer.hidden) {
          console.log('[PSD SKIP]', { name: layer.name, reason: 'group is hidden', depth })
          i++
          continue
        }

        let groupOp = 1
        if ((layer as any).opacity !== undefined) {
          const op = (layer as any).opacity as number
          groupOp = op > 1 ? op / 255 : op
        }

        const groupBlend = (layer as any).blendMode as string | undefined
        const isPassThrough = !groupBlend || groupBlend === 'pass through' || groupBlend === 'normal'

        if (isPassThrough) {
          if (children.length) {
            await processLayers(children, parentOpacity * groupOp, depth + 1)
          }
        } else {
          if (children.length && uploadAssets) {
            let gx = Infinity, gy = Infinity, gx2 = -Infinity, gy2 = -Infinity
            const collectBounds = (lyrs: Record<string, unknown>[]) => {
              for (const l of lyrs) {
                if (l.hidden) continue
                const lc = l.children as Record<string, unknown>[] | undefined
                if (lc) { collectBounds(lc); continue }
                const lx = (l.left as number) ?? 0
                const ly2 = (l.top as number) ?? 0
                const lx2 = (l.right as number) ?? docW
                const ly3 = (l.bottom as number) ?? docH
                if (lx < gx) gx = lx; if (ly2 < gy) gy = ly2
                if (lx2 > gx2) gx2 = lx2; if (ly3 > gy2) gy2 = ly3
              }
            }
            collectBounds(children)
            if (gx === Infinity) { i++; continue }
            gx = Math.max(0, gx); gy = Math.max(0, gy)
            gx2 = Math.min(docW, gx2); gy2 = Math.min(docH, gy2)
            const gw = gx2 - gx
            const gh = gy2 - gy
            if (gw > 0 && gh > 0) {
              onProgress?.(`Compositing group: ${(layer.name as string) ?? 'group'}`)
              const offscreen = await renderGroupOffscreen(
                children, gx, gy, gw, gh, 1, uploadAssets, onProgress,
              )
              if (offscreen && !isCanvasBlank(offscreen)) {
                const url = await uploadCanvas(offscreen, `group_${idx}`)
                if (url) {
                  _recordAudit(layer, gx, gy, gw, gh, gx, gy, gw, gh, 0, null, 'psd')
                  elements.push({
                    id: `img_${idx++}`,
                    type: 'image',
                    layerOrder: layerOrder++,
                    x: gx, y: gy, width: gw, height: gh,
                    rotation: 0,
                    opacity: Math.min(1, Math.max(0, groupOp * parentOpacity)),
                    src: url,
                    locked: false, visible: true,
                    blend_mode: psBlendToComposite(groupBlend),
                    fit_mode: 'fill', border_radius: 0,
                  })
                } else {
                  console.log('[PSD SKIP]', { name: layer.name, reason: 'isolated group: upload failed' })
                }
              } else {
                console.log('[PSD SKIP]', { name: layer.name, reason: 'isolated group: offscreen is blank' })
              }
            }
          } else if (children.length) {
            await processLayers(children, parentOpacity * groupOp, depth + 1)
          }
        }
        i++
        continue
      }

      // ── CLIPPING CHAIN DETECTION ────────────────────────────────────────────
      if (!(layer as any).clipping) {
        const clipGroup: Record<string, unknown>[] = [layer]
        let j = i + 1
        while (j < ordered.length) {
          const next = ordered[j]
          const nextChildren = next.children as Record<string, unknown>[] | undefined
          if (nextChildren !== undefined) break
          if (!(next as any).clipping) break
          clipGroup.push(next)
          j++
        }

        if (clipGroup.length > 1) {
          await processClippingGroup(clipGroup, parentOpacity)
          i = j
          continue
        }
      }

      // ── LEAF LAYER ─────────────────────────────────────────────────────────
      await processLeafLayer(layer, parentOpacity, null, false)
      i++
    }
  }

  const topLayers = psd.children as Record<string, unknown>[] | undefined
  if (topLayers?.length) await processLayers(topLayers)

  // ── Geometry audit output ─────────────────────────────────────────────────
  console.log(`[PSD AUDIT] doc=${docW}×${docH}  elements=${_audit.length}  USE_PIXEL_GEOMETRY=${USE_PIXEL_GEOMETRY}`)
  const _auditSorted = [..._audit].sort((a, b) =>
    (Math.abs(b.dW) + Math.abs(b.dH) + Math.abs(b.dX) + Math.abs(b.dY)) -
    (Math.abs(a.dW) + Math.abs(a.dH) + Math.abs(a.dX) + Math.abs(a.dY))
  )
  console.table(_auditSorted)
  const _badGeo = _audit.filter(e => e.badGeo)
  if (_badGeo.length) {
    console.warn(`[PSD BAD GEOMETRY SUMMARY] ${_badGeo.length} elements with PSD≠pixel bounds mismatch:`)
    console.table(_badGeo)
  }

  return { version: '1.0', width: docW, height: docH, pages: [{ background, elements }] }
}

// ─── Add Template Modal ───────────────────────────────────────────────────────

interface AddTemplateModalProps {
  open: boolean
  onClose: () => void
  onCreate: ReturnType<typeof useAdminCreateTemplate>
}

function AddTemplateModal({ open, onClose, onCreate }: AddTemplateModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AlbumCategory>('wedding')
  const [size, setSize] = useState<AlbumSize>('12x36')
  const [isPremium, setIsPremium] = useState(false)
  const [price, setPrice] = useState('')
  const [pagesCount, setPagesCount] = useState('1')
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [jsonText, setJsonText] = useState(EMPTY_JSON)
  const [jsonError, setJsonError] = useState('')

  const thumbInputRef = useRef<HTMLInputElement>(null)
  const previewInputRef = useRef<HTMLInputElement>(null)
  const psdInputRef = useRef<HTMLInputElement>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [psdError, setPsdError] = useState('')
  const presignUpload = usePresignUpload({ silent: true })

  const reset = () => {
    setName('')
    setCategory('wedding')
    setSize('12x36')
    setIsPremium(false)
    setPrice('')
    setPagesCount('1')
    setThumbnailPreview('')
    setPreviewImages([])
    setJsonText(EMPTY_JSON)
    setJsonError('')
    setPsdError('')
  }

  const handleThumbUpload = (files: FileList | null) => {
    if (!files?.length) return
    const reader = new FileReader()
    reader.onload = () => setThumbnailPreview(reader.result as string)
    reader.readAsDataURL(files[0])
  }

  const handlePreviewUpload = async (files: FileList | null) => {
    if (!files?.length) return
    const remaining = 5 - previewImages.length
    if (remaining <= 0) return
    const filesToProcess = Array.from(files).slice(0, remaining)
    const base64Images = await Promise.all(
      filesToProcess.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
      )
    )
    setPreviewImages((prev) => [...prev, ...base64Images])
    if (previewInputRef.current) previewInputRef.current.value = ''
  }

  const handlePsdUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setPsdError('')
    setIsParsing(true)
    try {
      const { readPsd } = await import('ag-psd')
      const buffer = await files[0].arrayBuffer()
      const psd = readPsd(buffer, { skipCompositeImageData: false, skipLayerImageData: false })

      const uploadFunc = async (filesToUpload: File[]) => {
        const assets = await presignUpload.mutateAsync(filesToUpload)
        return assets.map((a: any) => ({
          url: (a.asset?.url ?? a.url ?? '').split('?')[0],
        }))
      }

      const templateJson = await convertPsdToTemplateJson(
        psd as unknown as Record<string, unknown>,
        uploadFunc,
        (msg) => console.info('[PSD]', msg),
      )
      setJsonText(JSON.stringify(templateJson, null, 2))
      setPagesCount(String(templateJson.pages.length))
      setJsonError('')
    } catch (err) {
      setPsdError(err instanceof Error ? err.message : 'Failed to parse PSD file')
    } finally {
      setIsParsing(false)
      if (psdInputRef.current) psdInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    let parsedJson: any
    try {
      parsedJson = JSON.parse(jsonText)
      setJsonError('')
    } catch {
      setJsonError('Invalid JSON')
      return
    }

    await onCreate.mutateAsync({
      name,
      category,
      size,
      is_premium: isPremium,
      price: isPremium && price ? Math.round(parseFloat(price) * 100) : undefined,
      pages_count: parseInt(pagesCount) || 1,
      json_data: parsedJson,
      thumbnail_url: thumbnailPreview || undefined,
      preview_images: previewImages.length > 0 ? previewImages : undefined,
    })

    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Template Name</Label>
            <Input
              placeholder="e.g. Golden Bloom Wedding"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AlbumCategory)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Size</Label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as AlbumSize)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}&quot;</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Number of Pages</Label>
              <Input
                type="number"
                min={1}
                value={pagesCount}
                onChange={(e) => setPagesCount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pricing</Label>
              <div className="flex items-center gap-3 h-9">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    className="rounded"
                  />
                  Premium template
                </label>
              </div>
            </div>
          </div>

          {isPremium && (
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 499"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Enter price in rupees. Stored as paise internally.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Thumbnail Image</Label>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleThumbUpload(e.target.files)}
            />
            {thumbnailPreview ? (
              <div className="relative group rounded-lg overflow-hidden border border-border h-36">
                <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setThumbnailPreview('')}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-background/80 rounded-md px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                  <Upload className="h-3 w-3" /> Replace
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="w-full h-36 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <ImageIcon className="h-8 w-8 opacity-40" />
                <span className="text-xs">Click to upload thumbnail</span>
              </button>
            )}
            <p className="text-xs text-muted-foreground">Uploaded to CDN — URL stored as thumbnail_url.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Preview Images</Label>
              <span className="text-xs text-muted-foreground">{previewImages.length}/5</span>
            </div>
            <input
              ref={previewInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePreviewUpload(e.target.files)}
            />
            {previewImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {previewImages.map((src, i) => (
                  <div key={i} className="relative group w-20 h-16 rounded-md overflow-hidden border border-border">
                    <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPreviewImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute inset-0 bg-background/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => previewInputRef.current?.click()}
              disabled={previewImages.length >= 5}
              className="w-full h-10 border border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-3.5 w-3.5" />
              {previewImages.length >= 5 ? 'Maximum 5 images reached' : `Upload preview images (${5 - previewImages.length} remaining)`}
            </button>
            <p className="text-xs text-muted-foreground">Images are stored as base64. Max 5 images allowed.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Import from PSD</Label>
            <input
              ref={psdInputRef}
              type="file"
              accept=".psd"
              className="hidden"
              onChange={(e) => handlePsdUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={() => psdInputRef.current?.click()}
              disabled={isParsing}
              className="w-full h-12 border-2 border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? (
                <span className="text-xs">Parsing PSD layers…</span>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  Upload .psd — auto-generates Template JSON below
                </>
              )}
            </button>
            {psdError && <p className="text-xs text-destructive">{psdError}</p>}
            <p className="text-xs text-muted-foreground">
              Raster layers → image elements · Text layers → text elements · Clipping groups pre-composed · Review JSON before creating.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Template JSON</Label>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setJsonError('') }}
              rows={10}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              spellCheck={false}
            />
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            <p className="text-xs text-muted-foreground">
              Paste the template JSON. Each page needs <code>background</code> and <code>elements[]</code>. Image placeholders use <code>{`{"type":"image","src":"","x":0,"y":0,"width":1800,"height":1200}`}</code>.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="gold"
              className="flex-1"
              disabled={!name || onCreate.isPending}
              onClick={handleSubmit}
            >
              {onCreate.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}