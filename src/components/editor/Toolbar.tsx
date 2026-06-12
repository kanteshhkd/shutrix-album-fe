'use client'

import { ArrowLeft, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, MousePointer2, Hand, Type, Download, CheckCheck, Loader2, Upload } from 'lucide-react'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useEditorStore } from '@/store/editorStore'
import { cn } from '@/lib/utils'
import type { EditorTool } from '@/store/editorStore'

interface ToolbarProps {
  onExport: () => void
  onFitToScreen: () => void
  onSaveToTemplate?: () => void | Promise<void>
  isSavingTemplate?: boolean
}

export function Toolbar({ onExport, onFitToScreen, onSaveToTemplate, isSavingTemplate }: ToolbarProps) {
  const router = useRouter()
  const {
    zoom, setZoom, tool, setTool,
    undo, redo, isDirty, isSaving,
    historyIndex, history,
    addElement, currentPageIndex, pages,
  } = useEditorStore()

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1
  const zoomPercent = Math.round(zoom * 100)

  const handleAddText = () => {
    const page = pages[currentPageIndex]
    if (!page) return
    const id = Math.random().toString(36).substring(2, 11)
    addElement({
      id, type: 'text',
      x: page.json_data.width / 2 - 100, y: page.json_data.height / 2 - 30,
      width: 200, height: 60, rotation: 0, opacity: 1, locked: false, visible: true,
      text: 'Double-click to edit', font_family: 'Playfair Display',
      font_size: 40, font_weight: '400', font_style: 'normal',
      text_decoration: 'none', text_align: 'center', color: '#ffffff',
      letter_spacing: 2, line_height: 1.4,
    })
  }


  return (
    <TooltipProvider delayDuration={400}>
      <div className="h-12 bg-[#0d0d10] border-b border-white/[0.06] flex items-center px-2 gap-0.5 shrink-0">

        {/* Back */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground" onClick={() => router.push('/albums')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to Albums</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground" disabled={!canUndo} onClick={undo}>
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground" disabled={!canRedo} onClick={redo}>
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Zoom */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground" onClick={() => setZoom(Math.max(0.05, zoom - 0.1))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>

        <button
          className="h-7 min-w-[52px] px-2 text-[11px] font-mono text-muted-foreground/60 hover:text-foreground bg-transparent hover:bg-white/5 rounded-lg transition-colors"
          onClick={() => setZoom(1)}
        >
          {zoomPercent}%
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground" onClick={() => setZoom(zoom + 0.1)}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/60 hover:text-foreground" onClick={onFitToScreen}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to Screen</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Select / Pan tools */}
        {([
          { id: 'select', icon: MousePointer2, label: 'Select (V)' },
          { id: 'pan', icon: Hand, label: 'Pan (H)' },
        ] as { id: EditorTool; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-lg transition-all',
                  tool === id ? 'bg-primary/20 text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-white/5',
                )}
                onClick={() => setTool(id)}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Add elements */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={handleAddText}
              className="h-7 px-2.5 text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-white/5 rounded-lg transition-all flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5" />
              Text
            </button>
          </TooltipTrigger>
          <TooltipContent>Add Text (T)</TooltipContent>
        </Tooltip>


        {/* Spacer */}
        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-1.5 text-[11px] mr-3">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/50" />
              <span className="text-muted-foreground/50">Saving…</span>
            </>
          ) : isDirty ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400/80" />
              <span className="text-muted-foreground/50">Unsaved</span>
            </>
          ) : (
            <>
              <CheckCheck className="h-3 w-3 text-emerald-400/70" />
              <span className="text-muted-foreground/50">Saved</span>
            </>
          )}
        </div>

        {onSaveToTemplate && (
          <>
            <div className="w-px h-5 bg-white/[0.08] mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                  onClick={onSaveToTemplate}
                  disabled={isSavingTemplate}
                >
                  {isSavingTemplate
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Upload className="h-3.5 w-3.5" />}
                  {isSavingTemplate ? 'Saving…' : 'Update Template'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save layer fixes back to the master template</TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        {/* Export */}
        <Button variant="gold" size="sm" className="h-8 gap-1.5 text-xs" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </TooltipProvider>
  )
}
