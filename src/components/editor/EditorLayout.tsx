'use client'

import { useRef, useState } from 'react'
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
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const { setZoom, setPan, pages, currentPageIndex } = useEditorStore()

  const fitToScreen = () => {
    const container = canvasContainerRef.current
    if (!container || !pages[currentPageIndex]) return
    const page = pages[currentPageIndex]
    const w = container.offsetWidth
    const h = container.offsetHeight
    const scaleX = (w - 80) / page.json_data.width
    const scaleY = (h - 80) / page.json_data.height
    const newZoom = Math.min(scaleX, scaleY, 1)
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

        {/* Right sidebar */}
        <RightSidebar />
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
