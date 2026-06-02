'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Crown, X, Eye, Sparkles, Plus, Trash2 } from 'lucide-react'
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
import { useTemplates, useAdminCreateTemplate, useAdminDeleteTemplate } from '@/hooks/useTemplates'
import { useCreateAlbumFromTemplate } from '@/hooks/useAlbums'
import { useAuthStore } from '@/store/authStore'
import { TemplateLayoutPreview } from '@/components/templates/TemplateLayoutPreview'
import type { Template, AlbumCategory, AlbumSize } from '@/types'
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
    pages: [{ background: '#1a1a1a', elements: [] }],
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

  const { data, isLoading } = useTemplates({
    category: activeCategory !== 'all' ? activeCategory : undefined,
    search: search || undefined,
    per_page: 24,
  })

  const templates = data?.data || []

  const handleUseTemplate = async (template: Template) => {
    // Admins always have access; free users are gated on premium templates
    if (!isAdmin && template.is_premium && user?.subscription?.plan_id === 'free') {
      router.push('/settings#subscription')
      return
    }

    const album = await createFromTemplate.mutateAsync({
      title: `Album from ${template.name}`,
      category: template.category,
      size: template.size,
      template_id: template.id,
    })

    if (album) {
      setPreview(null)
      router.push(`/editor/${album.id}`)
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

          {preview && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
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
                <Button
                  variant="gold"
                  className="flex-1"
                  disabled={createFromTemplate.isPending}
                  onClick={() => handleUseTemplate(preview)}
                >
                  {createFromTemplate.isPending ? 'Creating...' : (
                    !isAdmin && preview.is_premium && user?.subscription?.plan_id === 'free'
                      ? 'Upgrade to Use'
                      : 'Use Template'
                  )}
                </Button>
              </div>
            </div>
          )}
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
  const [jsonText, setJsonText] = useState(EMPTY_JSON)
  const [jsonError, setJsonError] = useState('')

  const reset = () => {
    setName('')
    setCategory('wedding')
    setSize('12x36')
    setIsPremium(false)
    setPrice('')
    setPagesCount('1')
    setJsonText(EMPTY_JSON)
    setJsonError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    let parsedJson: object
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
              Paste the template JSON. The top-level structure needs <code>version</code>, <code>width</code>, <code>height</code>, and <code>pages[]</code>.
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
