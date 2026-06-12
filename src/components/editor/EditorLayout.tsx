'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Upload } from 'lucide-react'
import { LeftSidebar } from './LeftSidebar'
import { EditorCanvas } from './EditorCanvas'
import { RightSidebar } from './RightSidebar'
import { BottomTimeline } from './BottomTimeline'
import { Toolbar } from './Toolbar'
import { ExportModal } from './ExportModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useEditorStore } from '@/store/editorStore'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { useAdminUpdateTemplate } from '@/hooks/useTemplates'

interface EditorLayoutProps {
  albumId: string
  templateId?: string
}

export function EditorLayout({ albumId, templateId }: EditorLayoutProps) {
  const [showExport, setShowExport] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [rightOpen, setRightOpen] = useState(true)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const { setZoom, setPan, pages, currentPageIndex, selectedElementIds } = useEditorStore()
  const { user } = useAuthStore()
  const { addToast } = useUIStore()
  const adminUpdateTemplate = useAdminUpdateTemplate()
  const isAdmin = user?.role === 'admin'

  // Auto-open/close right panel based on selection
  useEffect(() => {
    if (selectedElementIds.length > 0) {
      setRightOpen(true)
    } else {
      setRightOpen(false)
    }
  }, [selectedElementIds])

  // Reconstruct template json_data from current editor pages and PATCH the template
  const handleSaveToTemplate = useCallback(async () => {
    if (!templateId || !isAdmin) return
    const state = useEditorStore.getState()
    const firstPage = state.pages[0]
    if (!firstPage) return

    const templateJson = {
      version: '1.0',
      width: firstPage.json_data.width,
      height: firstPage.json_data.height,
      pages: state.pages.map((p) => ({
        background: p.json_data.background_color ?? '#1a1a1a',
        elements: p.json_data.elements,
      })),
    }

    try {
      await adminUpdateTemplate.mutateAsync({ id: templateId, payload: { json_data: templateJson } })
      addToast({ title: 'Template updated', description: 'Layer fixes saved to the master template.', variant: 'success' })
    } catch {
      addToast({ title: 'Update failed', description: 'Could not save template changes.', variant: 'destructive' })
    }
  }, [templateId, isAdmin, adminUpdateTemplate, addToast])

  const fitToScreen = () => {
    const container = canvasContainerRef.current
    if (!container || !pages[currentPageIndex]) return
    const page = pages[currentPageIndex]
    const w = container.offsetWidth
    const h = container.offsetHeight
    const padding = 60
    const scaleX = (w - padding * 2) / page.json_data.width
    const scaleY = (h - padding * 2) / page.json_data.height
    const newZoom = Math.min(scaleX, scaleY)
    setZoom(newZoom)
    setPan(
      (w - page.json_data.width * newZoom) / 2,
      (h - page.json_data.height * newZoom) / 2
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top toolbar */}
      <Toolbar
        onExport={() => setShowExport(true)}
        onFitToScreen={fitToScreen}
        onSaveToTemplate={isAdmin && templateId ? () => setShowSaveConfirm(true) : undefined}
        isSavingTemplate={adminUpdateTemplate.isPending}
      />

      {/* Main editor area */}
      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <LeftSidebar />

        {/* Canvas */}
        <div ref={canvasContainerRef} className="flex-1 min-w-0 relative">
          <EditorCanvas albumId={albumId} containerRef={canvasContainerRef} />
        </div>

        {/* Right sidebar with collapsible toggle */}
        <div className="flex shrink-0">
          {/* Toggle strip */}
          <button
            onClick={() => setRightOpen((v) => !v)}
            className="w-3.5 bg-[#0d0d10] border-l border-white/[0.06] flex items-center justify-center hover:bg-white/5 transition-colors group"
            title={rightOpen ? 'Collapse panel' : 'Expand panel'}
          >
            {rightOpen
              ? <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/70" />
              : <ChevronLeft className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground/70" />}
          </button>
          {rightOpen && <RightSidebar />}
        </div>
      </div>

      {/* Bottom timeline */}
      <BottomTimeline />

      {/* Export modal */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        albumId={albumId}
      />

      {/* Confirm save-to-template dialog */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-400" />
              Update Master Template
            </DialogTitle>
            <DialogDescription>
              This will overwrite the master template's layer data with your current editor layout. All future albums created from this template will use the updated layers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSaveConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={adminUpdateTemplate.isPending}
              onClick={async () => {
                setShowSaveConfirm(false)
                await handleSaveToTemplate()
              }}
            >
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
