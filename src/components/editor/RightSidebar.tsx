


'use client'

import { useRef, useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { usePresignUpload } from '@/hooks/useAssets'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Lock, Unlock, Eye, EyeOff, Trash2, Copy, ChevronUp, ChevronDown, RefreshCw, X, ImageOff, Layers } from 'lucide-react'
import type { ImageElement, TextElement, ShapeElement, CanvasElement } from '@/types'
import { FONT_CATEGORIES, FONT_WEIGHTS, cn } from '@/lib/utils'

// Quick-apply color swatches shown inline in the properties panel
const QUICK_COLORS = [
  '#ffffff', '#f5f0e8', '#c9a84c', '#d4af37', '#b76e79',
  '#1a1a1a', '#3a2e28', '#8b0000', '#1e3a6e', '#4a6741',
  '#e8c875', '#d4a5c0', '#8fad8e', '#6b95c8', '#c4a882',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function NumberInput({
  label, value, onChange, min, max, step = 1, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; suffix?: string
}) {
  const safeValue = isNaN(value) || value === undefined ? 0 : value
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="relative">
        <input type="number" value={safeValue}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="w-full h-7 px-2 pr-6 text-xs bg-surface-elevated border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {suffix && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  )
}

function FontSizeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const safeValue = isNaN(value) || value === undefined ? 12 : value
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Size</Label>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onChange(Math.max(8, safeValue - 1))}
          className="w-6 h-7 flex items-center justify-center rounded-l-md border border-border bg-surface-elevated hover:bg-muted/40 transition-colors shrink-0">
          <ChevronDown className="h-3 w-3" />
        </button>
        <input type="number" value={safeValue} min={8} max={500}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-7 px-1 text-xs text-center bg-surface-elevated border-y border-border text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
        />
        <button onClick={() => onChange(Math.min(500, safeValue + 1))}
          className="w-6 h-7 flex items-center justify-center rounded-r-md border border-border bg-surface-elevated hover:bg-muted/40 transition-colors shrink-0">
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md border border-border cursor-pointer bg-transparent shrink-0" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs font-mono flex-1" />
      </div>
      <div className="flex flex-wrap gap-1 mt-1">
        {QUICK_COLORS.map((c) => (
          <button key={c} onClick={() => onChange(c)} title={c}
            className={cn('w-5 h-5 rounded border transition-all hover:scale-110',
              value === c ? 'border-primary scale-110 ring-1 ring-primary' : 'border-white/15 hover:border-white/40')}
            style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">{children}</p>
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RightSidebar() {
  const {
    pages, currentPageIndex, selectedElementIds,
    updateElement, updatePageBackground,
    deleteSelectedElements, duplicateSelectedElements,
    pushHistory,
  } = useEditorStore()

  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const uploadAsset = usePresignUpload({ silent: true })

  const currentPage = pages[currentPageIndex]
  const elements = currentPage?.json_data.elements || []
  const selectedId = selectedElementIds[0]
  const selectedElement = elements.find((el) => el.id === selectedId)

  const update = (updates: Partial<CanvasElement>) => {
    if (!selectedId) return
    updateElement(selectedId, updates)
  }

  const handleReplacePhoto = () => {
    if (!selectedId) return
    setReplacingId(selectedId)
    replaceInputRef.current?.click()
  }

  const handleReplaceInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !replacingId) return
    e.target.value = ''
    try {
      const [asset] = await uploadAsset.mutateAsync([file])
      pushHistory()
      updateElement(replacingId, { src: asset.url } as Partial<ImageElement>)
    } catch {
      // upload failed silently
    } finally {
      setReplacingId(null)
    }
  }

  // ── Empty state: page properties ──────────────────────────────────────────
  const replaceFileInput = (
    <input
      ref={replaceInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleReplaceInputChange}
    />
  )

  if (!selectedElement) {
    return (
      <div className="w-[260px] bg-surface-elevated border-l border-border flex flex-col overflow-y-auto scrollbar-thin">
        {replaceFileInput}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Page</h3>
        </div>
        <div className="p-4 space-y-4">
          <SectionTitle>Background</SectionTitle>
          <ColorRow
            label="Color"
            value={currentPage?.json_data.background_color || '#1a1a1a'}
            onChange={updatePageBackground}
          />
          {currentPage && (
            <>
              <Separator />
              <SectionTitle>Canvas Size</SectionTitle>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-card rounded-md p-2 border border-border">
                  <p className="text-muted-foreground text-[10px]">Width</p>
                  <p className="font-mono text-foreground">{currentPage.json_data.width}px</p>
                </div>
                <div className="bg-card rounded-md p-2 border border-border">
                  <p className="text-muted-foreground text-[10px]">Height</p>
                  <p className="font-mono text-foreground">{currentPage.json_data.height}px</p>
                </div>
              </div>
            </>
          )}
          <Separator />
          <p className="text-xs text-muted-foreground/60 text-center pt-2">Select an element to edit its properties</p>
        </div>
      </div>
    )
  }

  const textEl = selectedElement as TextElement
  const imgEl = selectedElement as ImageElement
  const shapeEl = selectedElement as ShapeElement

  // ── Element selected ───────────────────────────────────────────────────────
  return (
    <div className="w-[260px] bg-surface-elevated border-l border-border flex flex-col overflow-y-auto scrollbar-thin">
      {replaceFileInput}
      {/* Header with quick actions */}
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-1.5">
        <h3 className="text-xs font-semibold text-foreground capitalize truncate">
          {selectedElement.type}
          {selectedElement.type === 'shape' ? ` · ${shapeEl.shape_type}` : ''}
        </h3>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" title={selectedElement.locked ? 'Unlock' : 'Lock'}
            onClick={() => update({ locked: !selectedElement.locked })}>
            {selectedElement.locked
              ? <Lock className="h-3 w-3 text-yellow-400" />
              : <Unlock className="h-3 w-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title={selectedElement.visible ? 'Hide' : 'Show'}
            onClick={() => update({ visible: !selectedElement.visible })}>
            {selectedElement.visible
              ? <Eye className="h-3 w-3" />
              : <EyeOff className="h-3 w-3 text-muted-foreground/50" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Duplicate (Ctrl+D)"
            onClick={() => { pushHistory(); duplicateSelectedElements() }}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" title="Delete (Del)"
            onClick={() => { pushHistory(); deleteSelectedElements() }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-4">

        {/* ── Transform ── */}
        <div>
          <SectionTitle>Transform</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="X" value={Math.round(selectedElement.x)} onChange={(v) => update({ x: v })} />
            <NumberInput label="Y" value={Math.round(selectedElement.y)} onChange={(v) => update({ y: v })} />
            <NumberInput label="W" value={Math.round(selectedElement.width)} onChange={(v) => update({ width: v })} min={10} />
            <NumberInput label="H" value={Math.round(selectedElement.height)} onChange={(v) => update({ height: v })} min={10} />
            <NumberInput label="Rotate" value={Math.round(selectedElement.rotation)} onChange={(v) => update({ rotation: v })} suffix="°" min={-360} max={360} />
            <NumberInput label="Opacity" value={Math.round(selectedElement.opacity * 100)} onChange={(v) => update({ opacity: v / 100 })} suffix="%" min={0} max={100} />
          </div>
        </div>

        <Separator />

        {/* ── Image properties ── */}
        {selectedElement.type === 'image' && (
          <>
            <div>
              <SectionTitle>Image</SectionTitle>
              <div className="space-y-3">
                <div className="flex gap-1.5">
                  {(['fit', 'fill'] as const).map((mode) => (
                    <button key={mode} onClick={() => update({ fit_mode: mode } as Partial<ImageElement>)}
                      className={cn('flex-1 h-7 text-xs font-medium rounded-md border transition-all capitalize',
                        imgEl.fit_mode === mode ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40')}>
                      {mode}
                    </button>
                  ))}
                </div>
                
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Frame Shape</Label>
                  <Select value={imgEl.mask_shape || 'rect'} onValueChange={(v) => update({ mask_shape: v } as Partial<ImageElement>)}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rect">Rectangle</SelectItem>
                      <SelectItem value="circle">Circle</SelectItem>
                      <SelectItem value="arch">Arch</SelectItem>
                      <SelectItem value="polaroid">Polaroid</SelectItem>
                      <SelectItem value="filmstrip">Filmstrip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <NumberInput label="Corner Radius" value={imgEl.border_radius || 0} onChange={(v) => update({ border_radius: v } as Partial<ImageElement>)} min={0} max={500} suffix="px" />

                {imgEl.src ? (
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs gap-1.5"
                      onClick={handleReplacePhoto}
                      disabled={uploadAsset.isPending}
                    >
                      <RefreshCw className={cn('h-3 w-3', uploadAsset.isPending && replacingId === selectedId && 'animate-spin')} />
                      {uploadAsset.isPending && replacingId === selectedId ? 'Uploading…' : 'Replace'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground/60 hover:text-destructive"
                      title="Clear photo"
                      onClick={() => { pushHistory(); update({ src: '' } as Partial<ImageElement>) }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={handleReplacePhoto}
                      disabled={uploadAsset.isPending}
                    >
                      <RefreshCw className={cn('h-3 w-3', uploadAsset.isPending && replacingId === selectedId && 'animate-spin')} />
                      {uploadAsset.isPending && replacingId === selectedId ? 'Uploading…' : 'Upload Photo'}
                    </Button>
                  </div>
                )}

                {/* ── Background toggle ── */}
                <div className="pt-1">
                  <button
                    onClick={() => update({ is_background: !imgEl.is_background } as Partial<ImageElement>)}
                    className={cn(
                      'w-full h-7 text-xs rounded-md border flex items-center justify-center gap-1.5 transition-all',
                      imgEl.is_background
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                    )}
                    title={imgEl.is_background ? 'Unmark as background — makes it clickable & moveable again' : 'Mark as background — locks it so clicks fall through to other elements'}
                  >
                    <Layers className="h-3 w-3" />
                    {imgEl.is_background ? 'Background (click to unmark)' : 'Mark as Background'}
                  </button>
                </div>

                {/* ── Tint colour overlay ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Colour Tint</Label>
                    {imgEl.tint_color && (
                      <button
                        onClick={() => update({ tint_color: undefined, tint_opacity: undefined } as Partial<ImageElement>)}
                        className="text-[9px] text-muted-foreground/50 hover:text-destructive transition-colors flex items-center gap-0.5"
                        title="Remove tint"
                      >
                        <ImageOff className="h-2.5 w-2.5" /> Remove
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={imgEl.tint_color || '#000000'}
                      onChange={(e) => update({ tint_color: e.target.value, tint_opacity: imgEl.tint_opacity ?? 0.4 } as Partial<ImageElement>)}
                      className="w-8 h-8 rounded-md border border-border cursor-pointer bg-transparent shrink-0"
                    />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground/60">Opacity</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{Math.round((imgEl.tint_opacity ?? 0.4) * 100)}%</span>
                      </div>
                      <input
                        type="range" min={0} max={1} step={0.01}
                        value={imgEl.tint_opacity ?? 0.4}
                        onChange={(e) => update({ tint_opacity: Number(e.target.value), tint_color: imgEl.tint_color || '#000000' } as Partial<ImageElement>)}
                        className="w-full h-1 accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                  {!imgEl.tint_color && (
                    <p className="text-[9px] text-muted-foreground/40">Pick a colour above to apply a tint overlay</p>
                  )}
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Text properties ── */}
        {selectedElement.type === 'text' && (
          <>
            {/* Content */}
            <div>
              <SectionTitle>Content</SectionTitle>
              <textarea value={textEl.text} onChange={(e) => update({ text: e.target.value } as Partial<TextElement>)}
                className="w-full h-16 px-2 py-1.5 text-xs bg-surface-elevated border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
            </div>

            {/* Font family */}
            <div>
              <SectionTitle>Font</SectionTitle>
              <Select value={textEl.font_family} onValueChange={(v) => update({ font_family: v } as Partial<TextElement>)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {FONT_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                        {cat.label}
                      </div>
                      {(cat.fonts as readonly string[]).map((font) => (
                        <SelectItem key={font} value={font}>
                          <span style={{ fontFamily: font }}>{font}</span>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>

              {/* Font preview */}
              <div className="mt-1.5 px-2 py-2 rounded-md bg-card border border-border min-h-[36px] flex items-center justify-center overflow-hidden">
                <span className="text-lg text-foreground/80 truncate" style={{ fontFamily: textEl.font_family, fontWeight: textEl.font_weight }}>
                  {textEl.text.slice(0, 20) || 'Preview'}
                </span>
              </div>
            </div>

            {/* Size + Weight */}
            <div className="grid grid-cols-2 gap-2">
              <FontSizeInput value={textEl.font_size} onChange={(v) => update({ font_size: v } as Partial<TextElement>)} />
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Weight</Label>
                <Select value={textEl.font_weight || '400'} onValueChange={(v) => update({ font_weight: v } as Partial<TextElement>)}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHTS.map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        <span style={{ fontWeight: w.value }}>{w.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Spacing */}
            <div className="grid grid-cols-2 gap-2">
              <NumberInput label="Spacing" value={textEl.letter_spacing || 0} onChange={(v) => update({ letter_spacing: v } as Partial<TextElement>)} step={0.5} />
              <NumberInput label="Line H" value={textEl.line_height || 1.4} onChange={(v) => update({ line_height: v } as Partial<TextElement>)} min={0.5} max={5} step={0.1} />
            </div>

            {/* Alignment */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Align</Label>
              <div className="flex gap-1">
                {([
                  { align: 'left', icon: AlignLeft },
                  { align: 'center', icon: AlignCenter },
                  { align: 'right', icon: AlignRight },
                ] as { align: string; icon: React.ElementType }[]).map(({ align, icon: Icon }) => (
                  <button key={align} onClick={() => update({ text_align: align as 'left' | 'center' | 'right' } as Partial<TextElement>)}
                    className={cn('flex-1 h-7 rounded-md border transition-all flex items-center justify-center',
                      textEl.text_align === align ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40')}>
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Style: B / I / U */}
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Style</Label>
              <div className="flex gap-1.5">
                {([
                  { icon: Bold, label: 'B', active: textEl.font_weight === '700', onClick: () => update({ font_weight: textEl.font_weight === '700' ? '400' : '700' } as Partial<TextElement>) },
                  { icon: Italic, label: 'I', active: textEl.font_style === 'italic', onClick: () => update({ font_style: textEl.font_style === 'italic' ? 'normal' : 'italic' } as Partial<TextElement>) },
                  { icon: Underline, label: 'U', active: textEl.text_decoration === 'underline', onClick: () => update({ text_decoration: textEl.text_decoration === 'underline' ? 'none' : 'underline' } as Partial<TextElement>) },
                ] as { icon: React.ElementType; label: string; active: boolean; onClick: () => void }[]).map(({ icon: Icon, label, active, onClick }) => (
                  <button key={label} onClick={onClick}
                    className={cn('flex-1 h-7 rounded-md border text-xs font-bold transition-all flex items-center justify-center gap-1',
                      active ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Text color */}
            <ColorRow label="Color" value={textEl.color} onChange={(v) => update({ color: v } as Partial<TextElement>)} />

            <Separator />
          </>
        )}

        {/* ── Shape properties ── */}
        {selectedElement.type === 'shape' && (
          <>
            <div>
              <SectionTitle>Fill & Stroke</SectionTitle>
              <div className="space-y-3">
                <ColorRow label="Fill" value={shapeEl.fill || '#c9a84c'} onChange={(v) => update({ fill: v } as Partial<ShapeElement>)} />
                <ColorRow label="Stroke" value={shapeEl.stroke || '#c9a84c'} onChange={(v) => update({ stroke: v } as Partial<ShapeElement>)} />
                <NumberInput label="Stroke Width" value={shapeEl.stroke_width || 0} onChange={(v) => update({ stroke_width: v } as Partial<ShapeElement>)} min={0} max={40} suffix="px" />
                {shapeEl.shape_type === 'rect' && (
                  <NumberInput label="Corner Radius" value={shapeEl.corner_radius || 0} onChange={(v) => update({ corner_radius: v } as Partial<ShapeElement>)} min={0} max={300} suffix="px" />
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

      </div>
    </div>
  )
}
