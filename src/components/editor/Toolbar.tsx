'use client'

import { ArrowLeft, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, MousePointer2, Hand, Type, Square, Download, Save, CheckCheck, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useEditorStore } from '@/store/editorStore'
import { cn } from '@/lib/utils'
import type { EditorTool } from '@/store/editorStore'

interface ToolbarProps {
  onExport: () => void
  onFitToScreen: () => void
}

export function Toolbar({ onExport, onFitToScreen }: ToolbarProps) {
  const router = useRouter()
  const {
    zoom, setZoom, tool, setTool,
    undo, redo, isDirty, isSaving, lastSavedAt,
    historyIndex, history,
    addElement,
    currentPageIndex,
    pages,
  } = useEditorStore()

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const zoomPercent = Math.round(zoom * 100)

  const handleAddText = () => {
    const page = pages[currentPageIndex]
    if (!page) return
    const id = Math.random().toString(36).substring(2, 11)
    addElement({
      id,
      type: 'text',
      x: page.json_data.width / 2 - 100,
      y: page.json_data.height / 2 - 30,
      width: 200,
      height: 60,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      text: 'Double-click to edit',
      font_family: 'Playfair Display',
      font_size: 40,
      font_weight: '400',
      font_style: 'normal',
      text_decoration: 'none',
      text_align: 'center',
      color: '#ffffff',
      letter_spacing: 2,
      line_height: 1.4,
    })
  }

  const handleAddShape = () => {
    const page = pages[currentPageIndex]
    if (!page) return
    const id = Math.random().toString(36).substring(2, 11)
    addElement({
      id,
      type: 'shape',
      shape_type: 'rect',
      x: page.json_data.width / 2 - 100,
      y: page.json_data.height / 2 - 50,
      width: 200,
      height: 100,
      rotation: 0,
      opacity: 0.8,
      locked: false,
      visible: true,
      fill: 'rgba(201,168,76,0.3)',
      stroke: '#c9a84c',
      stroke_width: 2,
      corner_radius: 4,
    })
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div className="h-12 bg-surface-elevated border-b border-border flex items-center px-3 gap-1">
        {/* Back to Albums */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/albums')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to Albums</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={undo}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={redo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Zoom controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(zoom - 0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        <button
          className="h-8 min-w-[52px] px-2 text-xs font-mono text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted rounded-md transition-colors"
          onClick={() => setZoom(1)}
        >
          {zoomPercent}%
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(zoom + 0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitToScreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to Screen</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Tools */}
        {([
          { id: 'select', icon: MousePointer2, label: 'Select (V)' },
          { id: 'pan', icon: Hand, label: 'Pan (H)' },
        ] as { id: EditorTool; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8', tool === id && 'bg-primary/20 text-primary')}
                onClick={() => setTool(id)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Add elements */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddText}>
              <Type className="h-3.5 w-3.5" />
              Text
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Text (T)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddShape}>
              <Square className="h-3.5 w-3.5" />
              Shape
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Shape</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auto-save indicator */}
        <div className="flex items-center gap-1.5 text-xs mr-2">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Saving...</span>
            </>
          ) : isDirty ? (
            <>
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">Unsaved changes</span>
            </>
          ) : (
            <>
              <CheckCheck className="h-3 w-3 text-green-400" />
              <span className="text-muted-foreground">Saved</span>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* Export */}
        <Button variant="gold" size="sm" className="h-8 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </TooltipProvider>
  )
}
