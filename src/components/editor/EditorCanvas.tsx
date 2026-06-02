'use client'

import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react'
import {
  Stage,
  Layer,
  Image as KonvaImage,
  Text as KonvaText,
  Rect,
  Ellipse,
  Transformer,
  Line,
} from 'react-konva'
import useImage from 'use-image'
import Konva from 'konva'
import { useEditorStore } from '@/store/editorStore'
import { useUpdatePage } from '@/hooks/useAlbums'
import { debounce, generateId } from '@/lib/utils'
import type {
  CanvasElement,
  ImageElement,
  TextElement,
  ShapeElement,
} from '@/types'

// ─── Individual element renderers ────────────────────────────────────────────

function KonvaImageElement({
  el,
  isSelected: _isSelected,
  onSelect,
  onUpdate,
}: {
  el: ImageElement
  isSelected: boolean
  onSelect: (id: string, multi?: boolean) => void
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
}) {
  const [image] = useImage(el.src, 'anonymous')

  return (
    <KonvaImage
      id={el.id}
      image={image}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity}
      cornerRadius={el.border_radius || 0}
      draggable={!el.locked}
      onClick={(e) => onSelect(el.id, e.evt.shiftKey)}
      onTap={() => onSelect(el.id)}
      onDragEnd={(e) => {
        onUpdate(el.id, { x: e.target.x(), y: e.target.y() })
      }}
      onTransformEnd={(e) => {
        const node = e.target
        const scaleX = node.scaleX()
        const scaleY = node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        onUpdate(el.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(10, node.width() * scaleX),
          height: Math.max(10, node.height() * scaleY),
          rotation: node.rotation(),
        })
      }}
    />
  )
}

function KonvaTextElement({
  el,
  isSelected: _isSelected,
  onSelect,
  onUpdate,
}: {
  el: TextElement
  isSelected: boolean
  onSelect: (id: string, multi?: boolean) => void
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
}) {
  return (
    <KonvaText
      id={el.id}
      text={el.text}
      x={el.x}
      y={el.y}
      width={el.width}
      fontSize={el.font_size}
      fontFamily={el.font_family}
      fontStyle={`${el.font_style === 'italic' ? 'italic' : 'normal'} ${el.font_weight}`}
      textDecoration={el.text_decoration === 'underline' ? 'underline' : ''}
      align={el.text_align}
      fill={el.color}
      letterSpacing={el.letter_spacing}
      lineHeight={el.line_height}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={!el.locked}
      onClick={(e) => onSelect(el.id, e.evt.shiftKey)}
      onTap={() => onSelect(el.id)}
      onDragEnd={(e) => {
        onUpdate(el.id, { x: e.target.x(), y: e.target.y() })
      }}
      onTransformEnd={(e) => {
        const node = e.target
        const scaleX = node.scaleX()
        node.scaleX(1)
        node.scaleY(1)
        onUpdate(el.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(10, node.width() * scaleX),
          rotation: node.rotation(),
        })
      }}
    />
  )
}

function KonvaShapeElement({
  el,
  isSelected: _isSelected,
  onSelect,
  onUpdate,
}: {
  el: ShapeElement
  isSelected: boolean
  onSelect: (id: string, multi?: boolean) => void
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
}) {
  const commonProps = {
    id: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.stroke_width,
    draggable: !el.locked,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => onSelect(el.id, e.evt.shiftKey),
    onTap: () => onSelect(el.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onUpdate(el.id, { x: e.target.x(), y: e.target.y() })
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      onUpdate(el.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(10, el.width * scaleX),
        height: Math.max(10, el.height * scaleY),
        rotation: node.rotation(),
      })
    },
  }

  if (el.shape_type === 'ellipse') {
    return (
      <Ellipse
        {...commonProps}
        radiusX={el.width / 2}
        radiusY={el.height / 2}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
      />
    )
  }

  return (
    <Rect
      {...commonProps}
      width={el.width}
      height={el.height}
      cornerRadius={(el as ShapeElement).corner_radius || 0}
    />
  )
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────

interface EditorCanvasProps {
  albumId: string
  containerRef: React.RefObject<HTMLDivElement>
}

export function EditorCanvas({ albumId, containerRef }: EditorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)

  const {
    pages,
    currentPageIndex,
    selectedElementIds,
    zoom,
    panX,
    panY,
    tool,
    setZoom,
    setPan,
    selectElement,
    deselectAll,
    updateElement,
    deleteSelectedElements,
    duplicateSelectedElements,
    pushHistory,
    undo,
    redo,
    isDirty,
    setSaving,
    setDirty,
    setLastSavedAt,
  } = useEditorStore()

  const updatePage = useUpdatePage()
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPointer, setLastPointer] = useState({ x: 0, y: 0 })
  const [guideLines, setGuideLines] = useState<{ x?: number; y?: number }[]>([])

  const currentPage = pages[currentPageIndex]
  const elements = currentPage?.json_data.elements || []

  // ─── Auto-save ───────────────────────────────────────────────────────────
  const saveRef = useRef({ albumId, updatePage, setSaving, setDirty, setLastSavedAt })
  saveRef.current = { albumId, updatePage, setSaving, setDirty, setLastSavedAt }

  const debouncedSave = useCallback(
    debounce(() => {
      const { albumId: aid, updatePage: up, setSaving: ss, setDirty: sd, setLastSavedAt: sl } = saveRef.current
      const state = useEditorStore.getState()
      const page = state.pages[state.currentPageIndex]
      if (!page || !state.isDirty) return
      ss(true)
      up.mutateAsync({
        albumId: aid,
        pageId: page.id,
        data: { json_data: page.json_data },
      }).then(() => {
        sd(false)
        sl(new Date())
      }).catch(() => {}).finally(() => ss(false))
    }, 2000),
    []
  )

  useEffect(() => {
    if (isDirty) debouncedSave()
  }, [isDirty, pages, currentPageIndex])

  // ─── Container resize observer ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [containerRef])

  // ─── Fit to screen on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!currentPage || !stageSize.width) return
    const scaleX = (stageSize.width - 80) / currentPage.json_data.width
    const scaleY = (stageSize.height - 80) / currentPage.json_data.height
    const newZoom = Math.min(scaleX, scaleY, 1)
    setZoom(newZoom)
    setPan(
      (stageSize.width - currentPage.json_data.width * newZoom) / 2,
      (stageSize.height - currentPage.json_data.height * newZoom) / 2
    )
  }, [currentPage?.id, stageSize.width])

  // ─── Sync transformer to selection ───────────────────────────────────────
  useEffect(() => {
    const tr = transformerRef.current
    const layer = layerRef.current
    if (!tr || !layer) return

    const nodes = selectedElementIds
      .map((id) => layer.findOne(`#${id}`) as Konva.Node)
      .filter(Boolean)

    tr.nodes(nodes)
    layer.batchDraw()
  }, [selectedElementIds, elements])

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        pushHistory()
        deleteSelectedElements()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        duplicateSelectedElements()
      }
      if (e.key === 'Escape') {
        deselectAll()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedElements, duplicateSelectedElements, deselectAll, undo, redo])

  // ─── Stage wheel (zoom + scroll) ─────────────────────────────────────────
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const stage = stageRef.current!
      const pointer = stage.getPointerPosition()!
      const oldScale = zoom
      const factor = e.evt.deltaY < 0 ? 1.1 : 0.9
      const newScale = Math.min(Math.max(oldScale * factor, 0.1), 4)

      const mousePointTo = {
        x: (pointer.x - panX) / oldScale,
        y: (pointer.y - panY) / oldScale,
      }

      setZoom(newScale)
      setPan(
        pointer.x - mousePointTo.x * newScale,
        pointer.y - mousePointTo.y * newScale
      )
    } else {
      setPan(panX - e.evt.deltaX, panY - e.evt.deltaY)
    }
  }

  // ─── Stage mouse events (pan) ─────────────────────────────────────────────
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'pan') {
      setIsPanning(true)
      setLastPointer({ x: e.evt.clientX, y: e.evt.clientY })
    }
  }

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning) return
    const dx = e.evt.clientX - lastPointer.x
    const dy = e.evt.clientY - lastPointer.y
    setPan(panX + dx, panY + dy)
    setLastPointer({ x: e.evt.clientX, y: e.evt.clientY })
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Click on empty stage = deselect
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current) {
      deselectAll()
    }
  }

  // ─── Drop handler (photos from left sidebar) ──────────────────────────────
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const assetUrl = e.dataTransfer.getData('assetUrl')
    if (!assetUrl || !stageRef.current) return

    stageRef.current.setPointersPositions(e.nativeEvent)
    const pos = stageRef.current.getPointerPosition()!

    const canvasX = (pos.x - panX) / zoom
    const canvasY = (pos.y - panY) / zoom

    // Check if dropped on an existing image element — if so, replace it
    const target = elements.find(
      (el) =>
        el.type === 'image' &&
        canvasX >= el.x &&
        canvasX <= el.x + el.width &&
        canvasY >= el.y &&
        canvasY <= el.y + el.height
    )

    if (target) {
      pushHistory()
      updateElement(target.id, { src: assetUrl } as Partial<ImageElement>)
    } else {
      pushHistory()
      const id = generateId()
      useEditorStore.getState().addElement({
        id,
        type: 'image',
        src: assetUrl,
        x: canvasX - 200,
        y: canvasY - 150,
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
  }

  const handleUpdate = (id: string, updates: Partial<CanvasElement>) => {
    pushHistory()
    updateElement(id, updates)
  }

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No pages in this album</p>
      </div>
    )
  }

  const bgColor = currentPage.json_data.background_color || '#1a1a1a'
  const pageW = currentPage.json_data.width
  const pageH = currentPage.json_data.height

  return (
    <div
      className="flex-1 bg-[#0d0d10] relative overflow-hidden"
      style={{ cursor: tool === 'pan' || isPanning ? 'grab' : 'default' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panX}
        y={panY}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
      >
        <Layer ref={layerRef}>
          {/* Page background */}
          <Rect
            x={0}
            y={0}
            width={pageW}
            height={pageH}
            fill={bgColor}
            shadowColor="rgba(0,0,0,0.5)"
            shadowBlur={40}
            shadowOffsetX={0}
            shadowOffsetY={10}
          />

          {/* Render elements */}
          {elements.map((el) => {
            if (!el.visible) return null
            const isSelected = selectedElementIds.includes(el.id)

            if (el.type === 'image') {
              return (
                <KonvaImageElement
                  key={el.id}
                  el={el as ImageElement}
                  isSelected={isSelected}
                  onSelect={selectElement}
                  onUpdate={handleUpdate}
                />
              )
            }
            if (el.type === 'text') {
              return (
                <KonvaTextElement
                  key={el.id}
                  el={el as TextElement}
                  isSelected={isSelected}
                  onSelect={selectElement}
                  onUpdate={handleUpdate}
                />
              )
            }
            if (el.type === 'shape') {
              return (
                <KonvaShapeElement
                  key={el.id}
                  el={el as ShapeElement}
                  isSelected={isSelected}
                  onSelect={selectElement}
                  onUpdate={handleUpdate}
                />
              )
            }
            return null
          })}

          {/* Transformer (selection handles) */}
          <Transformer
            ref={transformerRef}
            borderStroke="#c9a84c"
            borderStrokeWidth={1.5 / zoom}
            anchorStroke="#c9a84c"
            anchorFill="#0a0a0b"
            anchorSize={8 / zoom}
            anchorCornerRadius={2}
            rotateAnchorOffset={20 / zoom}
            enabledAnchors={[
              'top-left', 'top-center', 'top-right',
              'middle-right', 'middle-left',
              'bottom-left', 'bottom-center', 'bottom-right',
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) return oldBox
              return newBox
            }}
          />

          {/* Guide lines for snapping */}
          {guideLines.map((guide, i) => (
            guide.x != null ? (
              <Line
                key={`gx${i}`}
                points={[guide.x, 0, guide.x, pageH]}
                stroke="#c9a84c"
                strokeWidth={1 / zoom}
                dash={[4 / zoom, 4 / zoom]}
              />
            ) : guide.y != null ? (
              <Line
                key={`gy${i}`}
                points={[0, guide.y!, pageW, guide.y!]}
                stroke="#c9a84c"
                strokeWidth={1 / zoom}
                dash={[4 / zoom, 4 / zoom]}
              />
            ) : null
          ))}
        </Layer>
      </Stage>

      {/* Page info overlay */}
      <div className="absolute bottom-3 left-3 text-xs text-muted-foreground/60 bg-background/50 px-2 py-1 rounded-md font-mono">
        {pageW} × {pageH}px • {Math.round(zoom * 100)}%
      </div>
    </div>
  )
}
