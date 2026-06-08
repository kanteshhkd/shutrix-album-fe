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
      
      // If backend stored it as a string, try parsing it
      let jsonData = tpl?.json_data
      if (typeof jsonData === 'string') {
        try {
          jsonData = JSON.parse(jsonData)
          
        } catch (e) {
          console.error('Failed to parse template json_data', e)
        }
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
        // Also stash source dimensions for scale computation
        sessionStorage.setItem(`tpl_dims_${album.id}`, JSON.stringify({
          width: jsonData.width,
          height: jsonData.height,
        }))
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
              // Also stash source dimensions for scale computation
              sessionStorage.setItem(`tpl_dims_${album.id}`, JSON.stringify({
                width: jsonData.width,
                height: jsonData.height,
              }))
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
      {/* Header */}
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
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

      {/* Templates Grid */}
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

      {/* Preview Modal */}
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
              {/* Main visual: thumbnail or JSON layout preview */}
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

              {/* Preview images gallery */}
              {validPreviews.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Preview Images</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {validPreviews.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Preview ${i + 1}`}
                        className="h-24 w-auto rounded-md border border-border flex-shrink-0 object-cover"
                      />
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
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
                {!isAdmin && preview.is_premium && user?.subscription?.plan_id === 'free' ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => router.push('/settings#subscription')}
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    <Button
                      variant="gold"
                      className="flex-1"
                      disabled={purchasing || createFromTemplate.isPending}
                      onClick={() => handleBuyTemplate(preview)}
                    >
                      {purchasing ? 'Processing...' : `Buy ₹${preview.price ? (preview.price / 100).toFixed(0) : '—'}`}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="gold"
                    className="flex-1"
                    disabled={createFromTemplate.isPending}
                    onClick={() => handleUseTemplate(preview)}
                  >
                    {createFromTemplate.isPending ? 'Creating...' : 'Use Template'}
                  </Button>
                )}
              </div>
            </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Template Modal (admin only) */}
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

// ─── PSD → TemplateJson helpers ──────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

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
    // Sample a 3x3 grid and prefer the most common non-white opaque color
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
    // Sort by frequency, break ties by preferring non-white
    const sorted = Object.entries(freq).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      const aIsWhite = a[0] === '#ffffff'
      const bIsWhite = b[0] === '#ffffff'
      if (aIsWhite && !bIsWhite) return 1
      if (!aIsWhite && bIsWhite) return -1
      return 0
    })
    return sorted[0][0]
  }

  function isOutOfBounds(x: number, y: number, w: number, h: number): boolean {
    return x >= docW || y >= docH || x + w <= 0 || y + h <= 0
  }

  const processLayers = async (layers: Record<string, unknown>[]) => {
    const reversed = [...layers].reverse()
    for (const layer of reversed) {
      const children = layer.children as Record<string, unknown>[] | undefined
      if (children?.length) {
        if (!layer.hidden) await processLayers(children)
        continue
      }

      if (layer.hidden) continue

      const x = (layer.left as number) ?? 0
      const y = (layer.top as number) ?? 0
      const w = ((layer.right as number) ?? docW) - x
      const h = ((layer.bottom as number) ?? docH) - y
      if (w <= 0 || h <= 0) continue
      if (isOutOfBounds(x, y, w, h)) {
        console.debug('Skipping out-of-bounds layer:', layer.name, { x, y, w, h })
        continue
      }

      let opacity = 1
      if (layer.opacity !== undefined) {
        const op = layer.opacity as number
        opacity = op > 1 ? op / 255 : op
      }

      const layerName = ((layer.name as string) ?? '').toLowerCase()
      const textData = layer.text as Record<string, unknown> | undefined

      // ── 1. TEXT LAYER ────────────────────────────────────────────────
      if (textData) {
        const ts = (textData.style as Record<string, unknown>) ?? {}
        const fc = ts.fillColor as Record<string, number> | undefined
        const color = fc ? rgbToHex(fc.r ?? 255, fc.g ?? 255, fc.b ?? 255) : '#ffffff'
        const transform = textData.transform as Record<string, number> | undefined
        const tx = transform?.tx ?? x
        const ty = transform?.ty ?? y
        elements.push({
          id: `text_${idx++}`,
          type: 'text',
          x: tx, y: ty, width: w, height: h,
          rotation: 0, opacity,
          locked: false, visible: true,
          text: (textData.text as string) ?? '',
          font_size: (ts.fontSize as number) ?? 48,
          font_family: ((ts.font as Record<string, unknown>)?.name as string) ?? 'serif',
          font_weight: '400',
          font_style: 'normal',
          text_decoration: 'none',
          text_align: 'left',
          color,
          letter_spacing: 0,
          line_height: 1.2,
        })
        continue
      }

      // ── 2. SOLID COLOUR FILL ─────────────────────────────────────────
      const effects = layer.effects as Record<string, unknown> | undefined
      const solidFills = effects?.solidColorFill as Array<Record<string, unknown>> | undefined
      const solidColor = solidFills?.[0]?.color as Record<string, number> | undefined
      if (solidColor) {
        const isBgSolid = !backgroundAdded && (
          layerName === 'background' ||
          (x <= 2 && y <= 2 && w >= docW * 0.95 && h >= docH * 0.95)
        )
        if (isBgSolid) {
          background = rgbToHex(solidColor.r ?? 26, solidColor.g ?? 26, solidColor.b ?? 26)
          backgroundAdded = true
        } else {
          elements.push({
            id: `shape_${idx++}`,
            type: 'shape', shape_type: 'rect',
            x, y, width: w, height: h,
            rotation: 0, opacity, locked: false, visible: true,
            fill: rgbToHex(solidColor.r ?? 200, solidColor.g ?? 200, solidColor.b ?? 200),
            stroke: 'transparent', stroke_width: 0, corner_radius: 0,
          })
        }
        continue
      }

      // ── 3. PHOTO PLACEHOLDER ─────────────────────────────────────────
      const isPhotoPlaceholder =
        layerName.includes('place your image') ||
        layerName.includes('photo placeholder') ||
        layerName.includes('image slot') ||
        layerName.includes('drop photo here') ||
        layerName.includes('add photo') ||
        layerName.includes('place photo') ||
        layerName.includes('insert photo') ||
        layerName.includes('insert image') ||
        (layerName.includes('double click to edit') && (
          layerName.includes('place') ||
          layerName.includes('image') ||
          layerName.includes('photo')
        ))

      if (isPhotoPlaceholder) {
        elements.push({
          id: `img_placeholder_${idx++}`,
          type: 'image',
          x, y, width: w, height: h,
          rotation: 0, opacity,
          src: '',
          locked: false, visible: true,
          fit_mode: 'fill',
          border_radius: 0,
        })
        continue
      }

      // ── 4. BACKGROUND LAYER — sample color, skip uploading ───────────
      const BG_NAME_PATTERNS = ['background', 'bg', 'layer 0', 'base', 'backdrop']
      const isBackgroundLayer =
        !backgroundAdded &&
        BG_NAME_PATTERNS.some(p => layerName === p || layerName.startsWith(p + ' '))

      const layerCanvas = layer.canvas as HTMLCanvasElement | undefined

      if (isBackgroundLayer && layerCanvas && !isCanvasBlank(layerCanvas)) {
        const sampled = sampleCanvasColor(layerCanvas)
        if (sampled) {
          background = sampled
          backgroundAdded = true
          console.log('Background color sampled from layer:', layer.name, '→', sampled)
          continue
        }
      }

      // ── 5. RASTER LAYER — upload ─────────────────────────────────────
const BLEND_MODE_MAP: Record<string, string> = {
  'norm': 'source-over',
  'mul ': 'multiply',
  'scrn': 'screen',
  'over': 'overlay',
  'dark': 'darken',
  'lite': 'lighten',
  'hLit': 'hard-light',
  'sLit': 'soft-light',
  'diff': 'difference',
  'smud': 'exclusion',
  'div ': 'color-dodge',
  'idiv': 'color-burn',
  'lum ': 'luminosity',
  'hue ': 'hue',
  'sat ': 'saturation',
  'colr': 'color',
}

if (layerCanvas && !isCanvasBlank(layerCanvas) && uploadAssets) {
  onProgress?.(`Uploading layer: ${(layer.name as string) ?? idx}`)
  const blob = await new Promise<Blob | null>((res) => layerCanvas.toBlob(res, 'image/png'))
  if (blob) {
    const file = new File([blob], `layer_${idx}.png`, { type: 'image/png' })
    try {
      const uploaded = await uploadAssets([file])
      if (uploaded?.[0]?.url) {
        const rawBlend = (layer.blendMode as string ?? 'norm').trim().padEnd(4, ' ').slice(0, 4)
        const blendMode = BLEND_MODE_MAP[rawBlend] ?? 'source-over'
        elements.push({
          id: `img_${idx}`,
          type: 'image',
          x, y, width: w, height: h,
          rotation: 0, opacity,
          src: uploaded[0].url,
          locked: false,
          visible: true,
          fit_mode: 'fill',
          border_radius: 0,
          blend_mode: blendMode,  // ← add this
        })
        idx++
        continue
      }
    } catch (e) {
      console.warn('Layer upload failed, skipping:', layer.name, e)
    }
  }
}

      console.debug('Skipping layer:', layer.name)
    }
  }

  const topLayers = psd.children as Record<string, unknown>[] | undefined
  if (topLayers?.length) await processLayers(topLayers)

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
      // skipLayerImageData:false  → each raster layer gets a .canvas with its pixels
      // skipCompositeImageData:true → skip the full flat composite (saves memory)
      const psd = readPsd(buffer, { skipCompositeImageData: true, skipLayerImageData: false })
      console.log('PSD layers:', JSON.stringify(
        (psd.children ?? []).map((l: any) => ({
          name: l.name,
          hidden: l.hidden,
          hasCanvas: !!l.canvas,
          hasText: !!l.text,
          left: l.left, top: l.top, right: l.right, bottom: l.bottom,
          childCount: l.children?.length ?? 0,
        })),
        null, 2
      ))

const uploadFunc = async (filesToUpload: File[]) => {
  const assets = await presignUpload.mutateAsync(filesToUpload)
  return assets.map((a: any) => ({ 
    // Strip signing params — store permanent base URL only
    url: (a.asset?.url ?? a.url ?? '').split('?')[0]
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
    // ❌ Remove the entire previewImages.unshift block — gone completely
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
    json_data: parsedJson,           // ← pure template JSON, no injected bg
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
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Template Name</Label>
            <Input
              placeholder="e.g. Golden Bloom Wedding"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
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

            {/* Size */}
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
            {/* Pages count */}
            <div className="space-y-1.5">
              <Label>Number of Pages</Label>
              <Input
                type="number"
                min={1}
                value={pagesCount}
                onChange={(e) => setPagesCount(e.target.value)}
              />
            </div>

            {/* Premium */}
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

          {/* Thumbnail Upload */}
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

          {/* Preview Images Upload */}
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

          {/* PSD Import */}
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
              Raster layers → image placeholders · Text layers → text elements · Review JSON before creating.
            </p>
          </div>

          {/* JSON Data */}
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
