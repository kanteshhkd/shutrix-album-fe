'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Image as ImageIcon, LayoutTemplate, Sparkles, Upload, Search, Trash2, Plus } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEditorStore } from '@/store/editorStore'
import { useAssets, useUploadAsset, useDeleteAsset } from '@/hooks/useAssets'
import { useTemplates } from '@/hooks/useTemplates'
import { generateId } from '@/lib/utils'
import type { AlbumCategory } from '@/types'

// Decorative elements to add
const DECORATIVE_ELEMENTS = [
  { id: 'border1', label: 'Gold Border', fill: 'transparent', stroke: '#c9a84c', type: 'rect' },
  { id: 'border2', label: 'Thin Line', fill: 'transparent', stroke: '#ffffff', type: 'rect' },
  { id: 'ellipse1', label: 'Oval Frame', fill: 'transparent', stroke: '#c9a84c', type: 'ellipse' },
  { id: 'overlay1', label: 'Gold Overlay', fill: 'rgba(201,168,76,0.15)', stroke: 'transparent', type: 'rect' },
  { id: 'overlay2', label: 'Dark Overlay', fill: 'rgba(0,0,0,0.4)', stroke: 'transparent', type: 'rect' },
]

export function LeftSidebar() {
  const [search, setSearch] = useState('')
  const [templateCategory, setTemplateCategory] = useState<AlbumCategory | 'all'>('all')
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null)

  const { addElement, pages, currentPageIndex } = useEditorStore()
  const { data: assetsData } = useAssets({ asset_type: 'photo' })
  const { data: templatesData } = useTemplates({ per_page: 20, category: templateCategory !== 'all' ? templateCategory : undefined })
  const uploadAsset = useUploadAsset()
  const deleteAsset = useDeleteAsset()

  const assets = assetsData?.data || []
  const templates = templatesData?.data || []

  const onDrop = useCallback(async (files: File[]) => {
    await uploadAsset.mutateAsync(files)
  }, [uploadAsset])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 20 * 1024 * 1024,
  })

  const addPhotoToCanvas = (assetUrl: string) => {
    const page = pages[currentPageIndex]
    if (!page) return
    const id = generateId()
    addElement({
      id,
      type: 'image',
      src: assetUrl,
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fit_mode: 'fill',
      border_radius: 0,
    })
  }

  const addDecorativeElement = (el: typeof DECORATIVE_ELEMENTS[0]) => {
    const page = pages[currentPageIndex]
    if (!page) return
    const id = generateId()
    addElement({
      id,
      type: 'shape',
      shape_type: el.type as 'rect' | 'ellipse',
      x: page.json_data.width / 2 - 150,
      y: page.json_data.height / 2 - 100,
      width: 300,
      height: 200,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      fill: el.fill,
      stroke: el.stroke,
      stroke_width: 2,
    })
  }

  return (
    <div className="w-[280px] bg-surface-elevated border-r border-border flex flex-col">
      <Tabs defaultValue="photos" className="flex flex-col flex-1 min-h-0">
        <TabsList className="m-2 grid grid-cols-3">
          <TabsTrigger value="templates" className="text-xs gap-1">
            <LayoutTemplate className="h-3 w-3" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs gap-1">
            <ImageIcon className="h-3 w-3" />
            Photos
          </TabsTrigger>
          <TabsTrigger value="elements" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            Elements
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 flex flex-col min-h-0 mt-0 px-2 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
          <Select value={templateCategory} onValueChange={(v) => setTemplateCategory(v as AlbumCategory | 'all')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {['wedding', 'pre_wedding', 'engagement', 'haldi', 'reception', 'cinematic', 'luxury', 'minimal'].map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">{cat.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className="aspect-[3/2] rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all relative group bg-surface-overlay"
                  title={template.name}
                >
                  {template.thumbnail_url ? (
                    <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground text-center p-1">{template.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-xs text-foreground font-medium">Apply</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="flex-1 flex flex-col min-h-0 mt-0 px-2 pb-2 space-y-2">
          {/* Upload zone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {isDragActive ? 'Drop photos here' : 'Drop photos or click to upload'}
            </p>
            {uploadAsset.isPending && (
              <p className="text-xs text-primary mt-1">Uploading...</p>
            )}
          </div>

          {/* Photos grid */}
          <ScrollArea className="flex-1">
            {assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">No photos yet. Upload some!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative aspect-square rounded-md overflow-hidden border border-border group cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => {
                      setDraggingAssetId(asset.id)
                      e.dataTransfer.setData('assetUrl', asset.file_url)
                      e.dataTransfer.setData('assetId', asset.id)
                    }}
                    onDragEnd={() => setDraggingAssetId(null)}
                    onDoubleClick={() => addPhotoToCanvas(asset.file_url)}
                  >
                    <img
                      src={asset.thumbnail_url || asset.file_url}
                      alt={asset.file_name}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addPhotoToCanvas(asset.file_url)
                          }}
                          className="w-6 h-6 rounded bg-primary/80 flex items-center justify-center hover:bg-primary transition-colors"
                          title="Add to canvas"
                        >
                          <Plus className="h-3 w-3 text-primary-foreground" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteAsset.mutate(asset.id)
                          }}
                          className="w-6 h-6 rounded bg-destructive/80 flex items-center justify-center hover:bg-destructive transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Elements Tab */}
        <TabsContent value="elements" className="flex-1 flex flex-col min-h-0 mt-0 px-2 pb-2">
          <ScrollArea className="flex-1">
            <p className="text-xs text-muted-foreground mb-3">Decorative elements</p>
            <div className="space-y-2">
              {DECORATIVE_ELEMENTS.map((el) => (
                <button
                  key={el.id}
                  onClick={() => addDecorativeElement(el)}
                  className="w-full p-2.5 rounded-lg border border-border hover:border-primary/50 bg-card text-left text-xs font-medium text-foreground transition-all hover:bg-muted/30 flex items-center gap-3"
                >
                  <div
                    className="w-8 h-5 rounded shrink-0"
                    style={{
                      backgroundColor: el.fill === 'transparent' ? 'transparent' : el.fill,
                      border: el.stroke !== 'transparent' ? `2px solid ${el.stroke}` : 'none',
                      outline: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  {el.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-4 mb-3">Text overlays</p>
            <div className="space-y-2">
              {[
                { label: 'Couple Names', text: 'Rahul & Priya', font: 'Great Vibes', size: 80, color: '#c9a84c' },
                { label: 'Date', text: '14 February 2024', font: 'Cinzel', size: 28, color: '#ffffff' },
                { label: 'Tagline', text: 'Forever & Always', font: 'Cormorant Garamond', size: 40, color: '#e8c875' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const page = pages[currentPageIndex]
                    if (!page) return
                    addElement({
                      id: generateId(),
                      type: 'text',
                      text: preset.text,
                      font_family: preset.font,
                      font_size: preset.size,
                      font_weight: '400',
                      font_style: 'normal',
                      text_decoration: 'none',
                      text_align: 'center',
                      color: preset.color,
                      letter_spacing: 2,
                      line_height: 1.4,
                      x: page.json_data.width / 2 - 200,
                      y: page.json_data.height / 2 - preset.size / 2,
                      width: 400,
                      height: preset.size * 1.6,
                      rotation: 0,
                      opacity: 1,
                      locked: false,
                      visible: true,
                    })
                  }}
                  className="w-full p-2.5 rounded-lg border border-border hover:border-primary/50 bg-card text-left transition-all hover:bg-muted/30"
                >
                  <p
                    className="text-xs truncate"
                    style={{ fontFamily: preset.font, color: preset.color }}
                  >
                    {preset.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{preset.label} • {preset.font}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
