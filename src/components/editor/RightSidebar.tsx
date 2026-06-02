'use client'

import { useEditorStore } from '@/store/editorStore'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react'
import type { ImageElement, TextElement, ShapeElement, CanvasElement } from '@/types'
import { WEDDING_FONTS } from '@/lib/utils'
import { cn } from '@/lib/utils'

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-full h-8 px-2 pr-6 text-sm bg-surface-elevated border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</p>
}

export function RightSidebar() {
  const { pages, currentPageIndex, selectedElementIds, updateElement, updatePageBackground } = useEditorStore()

  const currentPage = pages[currentPageIndex]
  const elements = currentPage?.json_data.elements || []
  const selectedId = selectedElementIds[0]
  const selectedElement = elements.find((el) => el.id === selectedId)

  const update = (updates: Partial<CanvasElement>) => {
    if (!selectedId) return
    updateElement(selectedId, updates)
  }

  if (!selectedElement) {
    return (
      <div className="w-[280px] bg-surface-elevated border-l border-border flex flex-col overflow-y-auto scrollbar-thin">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Page Properties</h3>
        </div>
        <div className="p-4 space-y-4">
          <SectionTitle>Background</SectionTitle>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Background Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentPage?.json_data.background_color || '#1a1a1a'}
                onChange={(e) => updatePageBackground(e.target.value)}
                className="w-8 h-8 rounded border border-border cursor-pointer bg-surface-elevated"
              />
              <Input
                value={currentPage?.json_data.background_color || '#1a1a1a'}
                onChange={(e) => updatePageBackground(e.target.value)}
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
          {currentPage && (
            <>
              <Separator />
              <SectionTitle>Dimensions</SectionTitle>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Width</span>
                  <span className="font-mono text-foreground">{currentPage.json_data.width}px</span>
                </div>
                <div className="flex justify-between">
                  <span>Height</span>
                  <span className="font-mono text-foreground">{currentPage.json_data.height}px</span>
                </div>
              </div>
            </>
          )}
          <Separator />
          <p className="text-xs text-muted-foreground text-center">Select an element to edit its properties</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[280px] bg-surface-elevated border-l border-border flex flex-col overflow-y-auto scrollbar-thin">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground capitalize">{selectedElement.type} Properties</h3>
      </div>

      <div className="p-4 space-y-5">
        {/* Transform */}
        <div>
          <SectionTitle>Transform</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <NumberInput label="X" value={Math.round(selectedElement.x)} onChange={(v) => update({ x: v })} />
            <NumberInput label="Y" value={Math.round(selectedElement.y)} onChange={(v) => update({ y: v })} />
            <NumberInput label="Width" value={Math.round(selectedElement.width)} onChange={(v) => update({ width: v })} min={10} />
            <NumberInput label="Height" value={Math.round(selectedElement.height)} onChange={(v) => update({ height: v })} min={10} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumberInput label="Rotation" value={Math.round(selectedElement.rotation)} onChange={(v) => update({ rotation: v })} suffix="°" min={-360} max={360} />
            <NumberInput label="Opacity" value={Math.round(selectedElement.opacity * 100)} onChange={(v) => update({ opacity: v / 100 })} suffix="%" min={0} max={100} />
          </div>
        </div>

        <Separator />

        {/* Image-specific properties */}
        {selectedElement.type === 'image' && (
          <>
            <div>
              <SectionTitle>Image</SectionTitle>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(['fit', 'fill'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => update({ fit_mode: mode } as Partial<ImageElement>)}
                      className={cn(
                        'flex-1 h-8 text-xs font-medium rounded-md border transition-all capitalize',
                        (selectedElement as ImageElement).fit_mode === mode
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <NumberInput
                  label="Border Radius"
                  value={(selectedElement as ImageElement).border_radius || 0}
                  onChange={(v) => update({ border_radius: v } as Partial<ImageElement>)}
                  min={0} max={500} suffix="px"
                />
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Text-specific properties */}
        {selectedElement.type === 'text' && (
          <>
            <div>
              <SectionTitle>Text Content</SectionTitle>
              <textarea
                value={(selectedElement as TextElement).text}
                onChange={(e) => update({ text: e.target.value } as Partial<TextElement>)}
                className="w-full h-20 px-2 py-1.5 text-sm bg-surface-elevated border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
            </div>

            <div>
              <SectionTitle>Typography</SectionTitle>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Font Family</Label>
                  <Select
                    value={(selectedElement as TextElement).font_family}
                    onValueChange={(v) => update({ font_family: v } as Partial<TextElement>)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEDDING_FONTS.map((font) => (
                        <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Font Size" value={(selectedElement as TextElement).font_size} onChange={(v) => update({ font_size: v } as Partial<TextElement>)} min={8} max={500} />
                  <NumberInput label="Letter Spacing" value={(selectedElement as TextElement).letter_spacing || 0} onChange={(v) => update({ letter_spacing: v } as Partial<TextElement>)} step={0.5} />
                </div>

                <NumberInput label="Line Height" value={(selectedElement as TextElement).line_height || 1.4} onChange={(v) => update({ line_height: v } as Partial<TextElement>)} min={0.5} max={5} step={0.1} />

                {/* Alignment */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Alignment</Label>
                  <div className="flex gap-1">
                    {([
                      { align: 'left', icon: AlignLeft },
                      { align: 'center', icon: AlignCenter },
                      { align: 'right', icon: AlignRight },
                    ] as { align: string; icon: React.ElementType }[]).map(({ align, icon: Icon }) => (
                      <button
                        key={align}
                        onClick={() => update({ text_align: align as 'left' | 'center' | 'right' } as Partial<TextElement>)}
                        className={cn(
                          'flex-1 h-8 rounded-md border transition-all flex items-center justify-center',
                          (selectedElement as TextElement).text_align === align
                            ? 'border-primary bg-primary/20 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Style toggles */}
                <div className="flex gap-2">
                  <button
                    onClick={() => update({
                      font_style: (selectedElement as TextElement).font_style === 'italic' ? 'normal' : 'italic'
                    } as Partial<TextElement>)}
                    className={cn(
                      'flex-1 h-8 rounded-md border text-xs font-medium transition-all flex items-center justify-center gap-1',
                      (selectedElement as TextElement).font_style === 'italic'
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    <Italic className="h-3.5 w-3.5" />
                    Italic
                  </button>
                  <button
                    onClick={() => update({
                      text_decoration: (selectedElement as TextElement).text_decoration === 'underline' ? 'none' : 'underline'
                    } as Partial<TextElement>)}
                    className={cn(
                      'flex-1 h-8 rounded-md border text-xs font-medium transition-all flex items-center justify-center gap-1',
                      (selectedElement as TextElement).text_decoration === 'underline'
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    <Underline className="h-3.5 w-3.5" />
                    Underline
                  </button>
                </div>

                {/* Color */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Text Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(selectedElement as TextElement).color}
                      onChange={(e) => update({ color: e.target.value } as Partial<TextElement>)}
                      className="w-8 h-8 rounded border border-border cursor-pointer bg-surface-elevated"
                    />
                    <Input
                      value={(selectedElement as TextElement).color}
                      onChange={(e) => update({ color: e.target.value } as Partial<TextElement>)}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Shape properties */}
        {selectedElement.type === 'shape' && (() => {
          const shapeEl = selectedElement as ShapeElement
          return (
            <>
              <div>
                <SectionTitle>Fill & Stroke</SectionTitle>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Fill Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={shapeEl.fill || '#c9a84c'}
                        onChange={(e) => update({ fill: e.target.value } as Partial<ShapeElement>)}
                        className="w-8 h-8 rounded border border-border cursor-pointer bg-surface-elevated"
                      />
                      <Input value={shapeEl.fill || '#c9a84c'} onChange={(e) => update({ fill: e.target.value } as Partial<ShapeElement>)} className="h-8 text-sm font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Stroke Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={shapeEl.stroke || '#c9a84c'}
                        onChange={(e) => update({ stroke: e.target.value } as Partial<ShapeElement>)}
                        className="w-8 h-8 rounded border border-border cursor-pointer bg-surface-elevated"
                      />
                      <Input value={shapeEl.stroke || '#c9a84c'} onChange={(e) => update({ stroke: e.target.value } as Partial<ShapeElement>)} className="h-8 text-sm font-mono" />
                    </div>
                  </div>
                  <NumberInput label="Stroke Width" value={shapeEl.stroke_width || 0} onChange={(v) => update({ stroke_width: v } as Partial<ShapeElement>)} min={0} max={20} suffix="px" />
                </div>
              </div>
              <Separator />
            </>
          )
        })()}
      </div>
    </div>
  )
}
