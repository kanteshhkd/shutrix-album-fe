'use client'

import { useRef, useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { LeftSidebar } from './LeftSidebar'
import { EditorCanvas } from './EditorCanvas'
import { RightSidebar } from './RightSidebar'
import { BottomTimeline } from './BottomTimeline'
import { Toolbar } from './Toolbar'
import { ExportModal } from './ExportModal'
import { useEditorStore } from '@/store/editorStore'

interface EditorLayoutProps {
  albumId: string
}

export function EditorLayout({ albumId }: EditorLayoutProps) {
  const [showExport, setShowExport] = useState(false)
  const [rightOpen, setRightOpen] = useState(true)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const { setZoom, setPan, pages, currentPageIndex, selectedElementIds } = useEditorStore()

  // Auto-open/close right panel based on selection
  useEffect(() => {
    if (selectedElementIds.length > 0) {
      setRightOpen(true)
    } else {
      setRightOpen(false)
    }
  }, [selectedElementIds])

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
      <Toolbar onExport={() => setShowExport(true)} onFitToScreen={fitToScreen} />

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
    </div>
  )
}
