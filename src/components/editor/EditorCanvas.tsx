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
  RegularPolygon,
  Star,
  Transformer,
  Line,
  Path,
  Group,
} from 'react-konva'
import useImage from 'use-image'
import React from 'react'
import Konva from 'konva'
import { Trash2, Copy, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, ImageIcon, Move } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { useUpdatePage } from '@/hooks/useAlbums'
import { useUploadAsset } from '@/hooks/useAssets'
import { debounce, generateId } from '@/lib/utils'
import type {
  CanvasElement,
  ImageElement,
  TextElement,
  ShapeElement,
} from '@/types'


// Walk up Konva node tree to find a node whose id is one of our element IDs
function getElementIdFromNode(node: Konva.Node, elementIds: Set<string>): string | null {
  let cur: Konva.Node | null = node
  while (cur) {
    const id = cur.id()
    if (id && elementIds.has(id)) return id
    cur = cur.parent as Konva.Node | null
  }
  return null
}

// ─── Individual element renderers ────────────────────────────────────────────

function KonvaImageElement({
  el,
  isSelected,
  onSelect,
  onUpdate,
  onPhotoClick,
  cropTargetId,
  onEnterCrop,
  zoom,
}: {
  el: ImageElement
  isSelected: boolean
  onSelect: (id: string, multi?: boolean) => void
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
  onPhotoClick: (id: string) => void
  cropTargetId: string | null
  onEnterCrop: (id: string) => void
  zoom: number
}) {
const [image] = useImage(el.src || '','anonymous')

  const isCropMode = cropTargetId === el.id
  const offsetX = el.photo_offset_x ?? 0
  const offsetY = el.photo_offset_y ?? 0
  const photoScale = el.photo_scale ?? 1

  const sharedTransform = {
    id: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    draggable: !el.locked,
    listening: el.is_background ? false : undefined,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      onSelect(el.id, e.evt.shiftKey)
    },
    onTap: () => {
      onSelect(el.id)
    },
    onDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!el.src) { e.cancelBubble = true; onPhotoClick(el.id) }
    },
    onDblTap: () => {
      if (!el.src) onPhotoClick(el.id)
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onUpdate(el.id, { x: e.target.x(), y: e.target.y() }),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target
      const scaleX = node.scaleX()
      const scaleY = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      onUpdate(el.id, {
        x: node.x(), y: node.y(),
        width: Math.max(10, el.width * scaleX),
        height: Math.max(10, el.height * scaleY),
        rotation: node.rotation(),
      })
    },
  }

  const sharedProps = {
    id: el.id,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    rotation: el.rotation,
    opacity: el.opacity,
    draggable: !el.locked && !isCropMode,
    listening: el.is_background ? false : undefined,
    onClick: (e: any) => {
      if (isCropMode) return
      onSelect(el.id, e.evt.shiftKey)
    },
    onTap: () => {
      if (isCropMode) return
      onSelect(el.id)
    },
    onDblClick: (e: any) => {
      if (!el.src) {
        e.cancelBubble = true
        onPhotoClick(el.id)
      } else if (el.mask_shape && el.mask_shape !== 'rect') {
        e.cancelBubble = true
        onEnterCrop(el.id)
      }
    },
    onDblTap: () => {
      if (!el.src) {
        onPhotoClick(el.id)
      } else if (el.mask_shape && el.mask_shape !== 'rect') {
        onEnterCrop(el.id)
      }
    },
    onDragEnd: (e: any) => onUpdate(el.id, { x: e.target.x(), y: e.target.y() }),
    onTransformEnd: (e: any) => {
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
    },
  }

  // ── Polaroid ─────────────────────────────────────────────────────────────
  if (el.mask_shape === 'polaroid') {
    const pad = el.width * 0.05
    const imgW = el.width * 0.9
    const imgH = el.height - el.width * 0.25
    return (
      <Group {...sharedProps} cursor={!el.src ? 'pointer' : isCropMode ? 'crosshair' : 'default'}>
        <Rect
          width={el.width} height={el.height}
          fill="white"
          shadowColor={isCropMode ? 'rgba(201,168,76,0.5)' : 'rgba(0,0,0,0.25)'}
          shadowBlur={isCropMode ? 28 : 20}
          shadowOffsetY={6}
          cornerRadius={2}
        />
        {el.src ? (
          <Group clipX={pad} clipY={pad} clipWidth={imgW} clipHeight={imgH}>
            <KonvaImage
              image={image}
              x={pad + offsetX}
              y={pad + offsetY}
              width={imgW * photoScale}
              height={imgH * photoScale}
              draggable={isCropMode}
              onClick={isCropMode ? (e: any) => { e.cancelBubble = true } : undefined}
              onDragEnd={isCropMode ? (e: any) => {
                onUpdate(el.id, {
                  photo_offset_x: e.target.x() - pad,
                  photo_offset_y: e.target.y() - pad,
                } as Partial<ImageElement>)
              } : undefined}
            />
          </Group>
        ) : (
          <Rect x={pad} y={pad} width={imgW} height={imgH}
            fill="rgba(0,0,0,0.001)"
            stroke={isSelected ? 'rgba(201,168,76,0.8)' : 'transparent'}
            strokeWidth={1.5 / zoom} />
        )}
        {el.tint_color && (
          <Rect x={pad} y={pad} width={imgW} height={imgH}
            fill={el.tint_color} opacity={el.tint_opacity ?? 0.4} listening={false} />
        )}
        {isCropMode && (
          <Rect x={pad} y={pad} width={imgW} height={imgH}
            stroke="#c9a84c" strokeWidth={1.5} dash={[6, 3]} fill="transparent" listening={false} />
        )}
      </Group>
    )
  }

  // ── Filmstrip ─────────────────────────────────────────────────────────────
  if (el.mask_shape === 'filmstrip') {
    const imgX = el.width * 0.15
    const imgY = el.height * 0.05
    const imgW = el.width * 0.7
    const imgH = el.height * 0.9
    const holes = [0.1, 0.3, 0.5, 0.7, 0.9]
    return (
      <Group {...sharedProps} cursor={!el.src ? 'pointer' : isCropMode ? 'crosshair' : 'default'}>
        <Rect width={el.width} height={el.height} fill="#1a1a1a" cornerRadius={3} />
        {el.src ? (
          <Group clipX={imgX} clipY={imgY} clipWidth={imgW} clipHeight={imgH}>
            <KonvaImage
              image={image}
              x={imgX + offsetX}
              y={imgY + offsetY}
              width={imgW * photoScale}
              height={imgH * photoScale}
              draggable={isCropMode}
              onClick={isCropMode ? (e: any) => { e.cancelBubble = true } : undefined}
              onDragEnd={isCropMode ? (e: any) => {
                onUpdate(el.id, {
                  photo_offset_x: e.target.x() - imgX,
                  photo_offset_y: e.target.y() - imgY,
                } as Partial<ImageElement>)
              } : undefined}
            />
          </Group>
        ) : (
          <Rect x={imgX} y={imgY} width={imgW} height={imgH}
            fill="rgba(0,0,0,0.001)"
            stroke={isSelected ? 'rgba(201,168,76,0.8)' : 'transparent'}
            strokeWidth={1.5 / zoom} />
        )}
        {holes.map((py, i) => (
          <React.Fragment key={i}>
            <Rect x={el.width * 0.03} y={el.height * py - el.height * 0.025}
              width={el.width * 0.07} height={el.height * 0.05} fill="rgba(255,255,255,0.2)" cornerRadius={2} />
            <Rect x={el.width * 0.9} y={el.height * py - el.height * 0.025}
              width={el.width * 0.07} height={el.height * 0.05} fill="rgba(255,255,255,0.2)" cornerRadius={2} />
          </React.Fragment>
        ))}
        {el.tint_color && (
          <Rect x={imgX} y={imgY} width={imgW} height={imgH}
            fill={el.tint_color} opacity={el.tint_opacity ?? 0.4} listening={false} />
        )}
        {isCropMode && (
          <Rect x={imgX} y={imgY} width={imgW} height={imgH}
            stroke="#c9a84c" strokeWidth={1.5} dash={[6, 3]} fill="transparent" listening={false} />
        )}
      </Group>
    )
  }

  // ── Circle / Arch with clip ───────────────────────────────────────────────
  let clipFunc: ((ctx: any) => void) | undefined
  if (el.mask_shape === 'circle') {
    clipFunc = (ctx: any) => {
      ctx.arc(el.width / 2, el.height / 2, Math.min(el.width, el.height) / 2, 0, Math.PI * 2, false)
    }
  } else if (el.mask_shape === 'arch') {
    clipFunc = (ctx: any) => {
      ctx.beginPath()
      ctx.moveTo(0, el.height)
      ctx.lineTo(0, el.width / 2)
      ctx.arc(el.width / 2, el.width / 2, el.width / 2, Math.PI, 0, false)
      ctx.lineTo(el.width, el.height)
      ctx.closePath()
    }
  }

  if (clipFunc) {
    return (
      <Group {...sharedProps} clipFunc={clipFunc} cursor={!el.src ? 'pointer' : isCropMode ? 'crosshair' : 'default'}>
        {el.src ? (
          <KonvaImage
            image={image}
            x={offsetX}
            y={offsetY}
            width={el.width * photoScale}
            height={el.height * photoScale}
            draggable={isCropMode}
            onClick={isCropMode ? (e: any) => { e.cancelBubble = true } : undefined}
            onDragEnd={isCropMode ? (e: any) => {
              onUpdate(el.id, {
                photo_offset_x: e.target.x(),
                photo_offset_y: e.target.y(),
              } as Partial<ImageElement>)
            } : undefined}
          />
        ) : (
          <>
            <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />
            {isSelected && (
              <Rect width={el.width} height={el.height}
                fill="transparent"
                stroke="rgba(201,168,76,0.9)"
                strokeWidth={2 / zoom}
                listening={false}
              />
            )}
          </>
        )}
        {el.tint_color && (
          <Rect width={el.width} height={el.height}
            fill={el.tint_color} opacity={el.tint_opacity ?? 0.4} listening={false} />
        )}
      </Group>
    )
  }

  // ── Default image / empty slot ────────────────────────────────────────────
  if (!el.src) {
    const sz = 1 / zoom
    return (
      <Group {...sharedTransform} cursor="pointer">
        <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" cornerRadius={el.border_radius || 0} />
        {isSelected && (
          <Rect
            width={el.width} height={el.height}
            fill="transparent"
            cornerRadius={el.border_radius || 0}
            stroke="rgba(201,168,76,0.9)"
            strokeWidth={2 * sz}
            listening={false}
          />
        )}
      </Group>
    )
  }

  // Tint overlay: wrap in Group so we can stack a coloured Rect on top
  if (el.tint_color) {
    return (
      <Group {...sharedProps}>
      <KonvaImage
        image={image}
        width={el.width}
        height={el.height}
        cornerRadius={el.border_radius || 0}
        globalCompositeOperation={(el.blend_mode as any) || 'source-over'}  // ← add
      />
        <Rect width={el.width} height={el.height} fill={el.tint_color} opacity={el.tint_opacity ?? 0.4}
          listening={false} cornerRadius={el.border_radius || 0} />
      </Group>
    )
  }
  return (
    <KonvaImage
      {...sharedProps}
      image={image}
      cornerRadius={el.border_radius || 0}
    />
  )
}

function KonvaTextElement({
  el,
  isSelected: _isSelected,
  isEditing,
  onSelect,
  onUpdate,
  onEdit,
}: {
  el: TextElement
  isSelected: boolean
  isEditing: boolean
  onSelect: (id: string, multi?: boolean) => void
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
  onEdit: (id: string) => void
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
      opacity={isEditing ? 0 : el.opacity}
      draggable={!el.locked}
      onClick={(e) => onSelect(el.id, e.evt.shiftKey)}
      onTap={() => onSelect(el.id)}
      onDblClick={(e) => { e.cancelBubble = true; onEdit(el.id) }}
      onDblTap={() => onEdit(el.id)}
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
  const sharedEvents = {
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

  const baseProps = {
    id: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.stroke_width,
    draggable: !el.locked,
    ...sharedEvents,
  }

  // ── Line: rendered as a thin pill rect ─────────────────────────────────────
  if (el.shape_type === 'line') {
    const lineH = Math.max(el.stroke_width || 3, el.height || 3)
    return (
      <Rect
        {...baseProps}
        fill={el.stroke || el.fill}
        stroke="transparent"
        strokeWidth={0}
        width={el.width}
        height={lineH}
        cornerRadius={lineH / 2}
      />
    )
  }

  // ── Ellipse ─────────────────────────────────────────────────────────────────
  if (el.shape_type === 'ellipse') {
    return (
      <Ellipse
        {...baseProps}
        radiusX={el.width / 2}
        radiusY={el.height / 2}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
      />
    )
  }

  // ── Triangle (3-sided polygon) ──────────────────────────────────────────────
  if (el.shape_type === 'triangle') {
    const radius = Math.min(el.width, el.height) / 2
    return (
      <RegularPolygon
        {...baseProps}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
        sides={3}
        radius={radius}
      />
    )
  }

  // ── Diamond (4-sided polygon, 45° rotation offset) ─────────────────────────
  if (el.shape_type === 'diamond') {
    const radius = Math.min(el.width, el.height) / 2
    return (
      <RegularPolygon
        {...baseProps}
        rotation={(el.rotation ?? 0) + 45}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
        sides={4}
        radius={radius}
        onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
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
            rotation: node.rotation() - 45,
          })
        }}
      />
    )
  }

  // ── Pentagon ─────────────────────────────────────────────────────────────────
  if (el.shape_type === 'pentagon') {
    const radius = Math.min(el.width, el.height) / 2
    return (
      <RegularPolygon
        {...baseProps}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
        sides={5}
        radius={radius}
      />
    )
  }

  // ── Hexagon ───────────────────────────────────────────────────────────────────
  if (el.shape_type === 'hexagon') {
    const radius = Math.min(el.width, el.height) / 2
    return (
      <RegularPolygon
        {...baseProps}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
        sides={6}
        radius={radius}
      />
    )
  }

  // ── Star ──────────────────────────────────────────────────────────────────────
  if (el.shape_type === 'star') {
    const outerR = Math.min(el.width, el.height) / 2
    const innerR = outerR * (el.inner_radius_ratio ?? 0.4)
    return (
      <Star
        {...baseProps}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
        numPoints={el.num_points ?? 5}
        outerRadius={outerR}
        innerRadius={innerR}
      />
    )
  }

  // ── Octagon ───────────────────────────────────────────────────────────────────
  if (el.shape_type === 'octagon') {
    const radius = Math.min(el.width, el.height) / 2
    return (
      <RegularPolygon
        {...baseProps}
        offsetX={-el.width / 2}
        offsetY={-el.height / 2}
        sides={8}
        radius={radius}
      />
    )
  }

  // ── Cross / Plus ──────────────────────────────────────────────────────────────
  if (el.shape_type === 'cross') {
    const crossPath = 'M 33,0 L 67,0 L 67,33 L 100,33 L 100,67 L 67,67 L 67,100 L 33,100 L 33,67 L 0,67 L 0,33 L 33,33 Z'
    return (
      <Path
        {...baseProps}
        data={crossPath}
        scaleX={el.width / 100}
        scaleY={el.height / 100}
        onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
          const node = e.target
          // node.scaleX() = (el.width/100) * transformerScale → newWidth = scaleX * 100
          const newW = Math.max(10, node.scaleX() * 100)
          const newH = Math.max(10, node.scaleY() * 100)
          node.scaleX(1)
          node.scaleY(1)
          onUpdate(el.id, { x: node.x(), y: node.y(), width: newW, height: newH, rotation: node.rotation() })
        }}
      />
    )
  }

  // ── Arch (rectangle + semicircular top) ──────────────────────────────────────
  if (el.shape_type === 'arch') {
    const archPath = 'M 0,100 L 0,50 A 50,50 0 0 1 100,50 L 100,100 Z'
    return (
      <Path
        {...baseProps}
        data={archPath}
        scaleX={el.width / 100}
        scaleY={el.height / 100}
        onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
          const node = e.target
          const newW = Math.max(10, node.scaleX() * 100)
          const newH = Math.max(10, node.scaleY() * 100)
          node.scaleX(1)
          node.scaleY(1)
          onUpdate(el.id, { x: node.x(), y: node.y(), width: newW, height: newH, rotation: node.rotation() })
        }}
      />
    )
  }

  // ── Heart ─────────────────────────────────────────────────────────────────────
  if (el.shape_type === 'heart') {
    const heartPath = 'M 50,80 C 20,60 0,40 0,25 C 0,10 12,0 25,0 C 35,0 45,8 50,18 C 55,8 65,0 75,0 C 88,0 100,10 100,25 C 100,40 80,60 50,80 Z'
    return (
      <Path
        {...baseProps}
        data={heartPath}
        scaleX={el.width / 100}
        scaleY={el.height / 100}
        onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
          const node = e.target
          const newW = Math.max(10, node.scaleX() * 100)
          const newH = Math.max(10, node.scaleY() * 100)
          node.scaleX(1)
          node.scaleY(1)
          onUpdate(el.id, { x: node.x(), y: node.y(), width: newW, height: newH, rotation: node.rotation() })
        }}
      />
    )
  }

  // ── Default: Rect ─────────────────────────────────────────────────────────────
  return (
    <Rect
      {...baseProps}
      width={el.width}
      height={el.height}
      cornerRadius={el.corner_radius || 0}
    />
  )
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────

interface EditorCanvasProps {
  albumId: string
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function EditorCanvas({ albumId, containerRef }: EditorCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null)
  const [cropTargetId, setCropTargetId] = useState<string | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; elementId: string } | null>(null)

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
    reorderElements,
    pushHistory,
    undo,
    redo,
    isDirty,
    setSaving,
    setDirty,
    setLastSavedAt,
  } = useEditorStore()

  const updatePage = useUpdatePage()
  const uploadAsset = useUploadAsset({ folder: 'photos' })
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [lastPointer, setLastPointer] = useState({ x: 0, y: 0 })
  const [guideLines] = useState<{ x?: number; y?: number }[]>([])

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
      // Skip save for temp pages that don't exist in the backend yet
      if (String(page.id).startsWith('temp_')) return
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
    if (!currentPage || !stageSize.width || !stageSize.height) return
    const padding = 60
    const scaleX = (stageSize.width - padding * 2) / currentPage.json_data.width
    const scaleY = (stageSize.height - padding * 2) / currentPage.json_data.height
    const newZoom = Math.min(scaleX, scaleY)
    setZoom(newZoom)
    setPan(
      (stageSize.width - currentPage.json_data.width * newZoom) / 2,
      (stageSize.height - currentPage.json_data.height * newZoom) / 2
    )
  }, [currentPage?.id, stageSize.width, stageSize.height])

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

  useEffect(() => {
  const layer = layerRef.current
  if (!layer) return
  const timer = setTimeout(() => layer.batchDraw(), 100)
  return () => clearTimeout(timer)
}, [elements])

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if (e.key === 'Escape') {
        if (cropTargetId) { setCropTargetId(null); return }
        deselectAll()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (cropTargetId) return
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
        if (!cropTargetId) duplicateSelectedElements()
      }

      // Arrow nudge — 1px per press, 10px with Shift; skip if in crop mode
      if (e.key.startsWith('Arrow') && !cropTargetId) {
        const state = useEditorStore.getState()
        if (!state.selectedElementIds.length) return
        e.preventDefault()
        const d = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        // Push history only on first press of a new arrow key sequence
        if (!e.repeat) state.pushHistory()
        const page = state.pages[state.currentPageIndex]
        if (!page) return
        state.selectedElementIds.forEach((id) => {
          const found = page.json_data.elements.find((el) => el.id === id)
          if (found) state.updateElement(id, { x: found.x + dx, y: found.y + dy })
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedElements, duplicateSelectedElements, deselectAll, undo, redo, cropTargetId])

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

  // ─── Crop mode ───────────────────────────────────────────────────────────
  const handleEnterCrop = useCallback((id: string) => {
    deselectAll()
    setCropTargetId(id)
  }, [deselectAll])

  // ─── Context menu ─────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault()
    const elementIds = new Set(elements.map((el) => el.id))
    const elementId = getElementIdFromNode(e.target as Konva.Node, elementIds)
    if (elementId) {
      selectElement(elementId)
      setCtxMenu({ x: e.evt.clientX, y: e.evt.clientY, elementId })
    }
  }, [elements, selectElement])

  // Dismiss context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const dismiss = () => setCtxMenu(null)
    const timer = window.setTimeout(() => {
      window.addEventListener('click', dismiss, { once: true })
      window.addEventListener('contextmenu', dismiss, { once: true })
    }, 50)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('click', dismiss)
      window.removeEventListener('contextmenu', dismiss)
    }
  }, [ctxMenu])

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (ctxMenu) { setCtxMenu(null); return }
    if (cropTargetId) {
      const elementIds = new Set(elements.map((el) => el.id))
      const clickedId = getElementIdFromNode(e.target as Konva.Node, elementIds)
      if (clickedId !== cropTargetId) {
        setCropTargetId(null)
        if (!clickedId) deselectAll()
      }
      return
    }
    if (e.target === stageRef.current || e.target.id()?.startsWith('bg')) {
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

  // ─── Click-to-fill empty image frame ─────────────────────────────────────
  const handlePhotoClick = (id: string) => {
    selectElement(id)
    setPhotoTargetId(id)
    photoInputRef.current?.click()
  }

  const handlePhotoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !photoTargetId) return
    e.target.value = ''
    try {
      const [asset] = await uploadAsset.mutateAsync([file])
      pushHistory()
      updateElement(photoTargetId, { src: asset.url } as Partial<ImageElement>)
    } catch {
      // upload failed — leave element empty
    } finally {
      setPhotoTargetId(null)
    }
  }

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No pages in this album</p>
      </div>
    )
  }

  
  const bgColor = currentPage.json_data.background_color || '#1a1a1a'
  console.log('bgColor:', bgColor, 'elements:', elements.length, elements.map(e => ({id: e.id, type: e.type, src: (e as any).src?.slice(0,50)})))
  const pageW = currentPage.json_data.width
  const pageH = currentPage.json_data.height

  // ── Inline text edit overlay ──────────────────────────────────────────────
  const textEditOverlay = editingTextId ? (() => {
    const textEl = elements.find((e) => e.id === editingTextId) as TextElement | undefined
    if (!textEl) return null
    const left = textEl.x * zoom + panX
    const top = textEl.y * zoom + panY
    const width = textEl.width * zoom
    const fontSize = textEl.font_size * zoom
    return (
      <textarea
        key={editingTextId}
        ref={textareaRef}
        autoFocus
        defaultValue={textEl.text}
        style={{
          position: 'absolute',
          left,
          top,
          width,
          minHeight: fontSize * 1.2,
          fontSize,
          fontFamily: textEl.font_family,
          fontWeight: textEl.font_weight,
          fontStyle: textEl.font_style,
          color: textEl.color,
          textAlign: textEl.text_align as React.CSSProperties['textAlign'],
          letterSpacing: textEl.letter_spacing * zoom,
          lineHeight: textEl.line_height,
          background: 'transparent',
          border: '1px dashed rgba(201,168,76,0.6)',
          outline: 'none',
          resize: 'none',
          padding: 0,
          margin: 0,
          overflow: 'hidden',
          zIndex: 1000,
          transform: textEl.rotation ? `rotate(${textEl.rotation}deg)` : undefined,
          transformOrigin: 'top left',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => {
          const newText = e.target.value
          if (newText !== textEl.text) handleUpdate(editingTextId, { text: newText })
          setEditingTextId(null)
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') setEditingTextId(null)
          if (e.key === 'Enter' && !e.shiftKey) {
            const newText = e.currentTarget.value
            if (newText !== textEl.text) handleUpdate(editingTextId, { text: newText })
            setEditingTextId(null)
            e.preventDefault()
          }
        }}
        onChange={(e) => {
          e.target.style.height = 'auto'
          e.target.style.height = `${e.target.scrollHeight}px`
        }}
      />
    )
  })() : null

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{
        cursor: tool === 'pan' || isPanning ? 'grab' : 'default',
        background: 'radial-gradient(ellipse at center, #23232e 0%, #16161c 100%)',
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onMouseDown={(e) => {
        if (editingTextId && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          textareaRef.current?.blur()
        }
      }}
    >
      {/* CSS border overlay — frames the canvas without Konva */}
      <div
        className="absolute pointer-events-none z-10"
        style={{
          left: panX,
          top: panY,
          width: pageW * zoom,
          height: pageH * zoom,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
        }}
      />

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
        onContextMenu={handleContextMenu}
      >
        <Layer ref={layerRef}>
          {/* Canvas background */}
          <Rect
            id="bg-rect"
            x={0}
            y={0}
            width={pageW}
            height={pageH}
            fill={bgColor}
            listening={false}
          />

          {/* All content clipped strictly to canvas bounds — nothing bleeds outside */}
          <Group clipX={0} clipY={0} clipWidth={pageW} clipHeight={pageH}>
            {/* Book fold shadows */}
            <Rect
              id="bg-fold-left"
              x={pageW / 2 - 40}
              y={0}
              width={40}
              height={pageH}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 40, y: 0 }}
              fillLinearGradientColorStops={[0, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.06)']}
              listening={false}
            />
            <Rect
              id="bg-fold-right"
              x={pageW / 2}
              y={0}
              width={40}
              height={pageH}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 40, y: 0 }}
              fillLinearGradientColorStops={[0, 'rgba(0,0,0,0.06)', 1, 'rgba(0,0,0,0)']}
              listening={false}
            />
            <Line
              id="bg-crease"
              points={[pageW / 2, 0, pageW / 2, pageH]}
              stroke="rgba(0,0,0,0.12)"
              strokeWidth={1}
              listening={false}
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
                    onPhotoClick={handlePhotoClick}
                    cropTargetId={cropTargetId}
                    onEnterCrop={handleEnterCrop}
                    zoom={zoom}
                  />
                )
              }
              if (el.type === 'text') {
                return (
                  <KonvaTextElement
                    key={el.id}
                    el={el as TextElement}
                    isSelected={isSelected}
                    isEditing={editingTextId === el.id}
                    onSelect={selectElement}
                    onUpdate={handleUpdate}
                    onEdit={(id) => { deselectAll(); setEditingTextId(id) }}
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
          </Group>

          {/* Transformer (selection handles) — draggable so you can move selection from anywhere */}
          <Transformer
            ref={transformerRef}
            borderStroke="#c9a84c"
            borderStrokeWidth={1 / zoom}
            anchorStroke="#c9a84c"
            anchorFill="#ffffff"
            anchorSize={3 / zoom}
            anchorCornerRadius={1}
            rotateAnchorOffset={10 / zoom}
            draggable
            enabledAnchors={[
              'top-left', 'top-center', 'top-right',
              'middle-right', 'middle-left',
              'bottom-left', 'bottom-center', 'bottom-right',
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 10 || newBox.height < 10) return oldBox
              return newBox
            }}
            onDragStart={() => {
              // Push history once when drag starts
              pushHistory()
            }}
            onDragEnd={(e) => {
              // The transformer moved — sync each attached node's new position back to state
              const tr = e.target as unknown as Konva.Transformer
              const nodes = tr.nodes() as Konva.Node[]
              nodes.forEach((node) => {
                updateElement(node.id(), { x: node.x(), y: node.y() })
              })
              // Reset transformer position to (0,0) so it doesn't accumulate offset
              tr.x(0)
              tr.y(0)
            }}
          />

          {/* Guide lines */}
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

      {/* Inline text edit overlay */}
      {textEditOverlay}

      {/* Hidden file input for click-to-fill photo frames */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoInputChange}
      />

      {/* Upload progress overlay */}
      {uploadAsset.isPending && (
        <div className="absolute inset-0 bg-background/40 flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 rounded-lg px-4 py-2 text-sm text-foreground">
            Uploading photo…
          </div>
        </div>
      )}

      {/* Crop mode banner */}
      {cropTargetId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#1a1a22]/90 border border-[#c9a84c]/40 text-[#c9a84c] text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none select-none">
          <Move className="h-3 w-3" />
          Drag to reposition photo · Esc to exit
        </div>
      )}

      {/* Page info overlay */}
      <div className="absolute bottom-3 left-3 text-xs text-muted-foreground/60 bg-background/50 px-2 py-1 rounded-md font-mono">
        {pageW} × {pageH}px • {Math.round(zoom * 100)}%
      </div>

      {/* Context menu */}
      {ctxMenu && (() => {
        const ctxEl = elements.find((e) => e.id === ctxMenu.elementId)
        const ctxIdx = elements.findIndex((e) => e.id === ctxMenu.elementId)
        const ctxImg = ctxEl?.type === 'image' ? ctxEl as ImageElement : null
        const closeRun = (fn: () => void) => { setCtxMenu(null); fn() }
        return (
          <div
            className="fixed z-50 min-w-[190px] bg-[#18181f] border border-white/12 rounded-xl shadow-2xl py-1 overflow-hidden"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <button onClick={() => closeRun(() => { pushHistory(); deleteSelectedElements() })}
              className="w-full px-3 py-1.5 text-xs text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
              <span className="ml-auto text-[10px] text-white/20">Del</span>
            </button>
            <button onClick={() => closeRun(() => duplicateSelectedElements())}
              className="w-full px-3 py-1.5 text-xs text-left text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors">
              <Copy className="h-3.5 w-3.5" />
              Duplicate
              <span className="ml-auto text-[10px] text-white/20">Ctrl+D</span>
            </button>

            <div className="my-1 border-t border-white/[0.07]" />

            <button onClick={() => closeRun(() => reorderElements(ctxIdx, Math.min(ctxIdx + 1, elements.length - 1)))}
              disabled={ctxIdx === elements.length - 1}
              className="w-full px-3 py-1.5 text-xs text-left text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors disabled:opacity-30">
              <ChevronUp className="h-3.5 w-3.5" />
              Bring Forward
            </button>
            <button onClick={() => closeRun(() => reorderElements(ctxIdx, Math.max(ctxIdx - 1, 0)))}
              disabled={ctxIdx === 0}
              className="w-full px-3 py-1.5 text-xs text-left text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors disabled:opacity-30">
              <ChevronDown className="h-3.5 w-3.5" />
              Send Backward
            </button>
            <button onClick={() => closeRun(() => reorderElements(ctxIdx, elements.length - 1))}
              disabled={ctxIdx === elements.length - 1}
              className="w-full px-3 py-1.5 text-xs text-left text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors disabled:opacity-30">
              <ChevronsUp className="h-3.5 w-3.5" />
              Bring to Front
            </button>
            <button onClick={() => closeRun(() => reorderElements(ctxIdx, 0))}
              disabled={ctxIdx === 0}
              className="w-full px-3 py-1.5 text-xs text-left text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors disabled:opacity-30">
              <ChevronsDown className="h-3.5 w-3.5" />
              Send to Back
            </button>

            {ctxImg?.src && (
              <>
                <div className="my-1 border-t border-white/[0.07]" />
                <button onClick={() => closeRun(() => handlePhotoClick(ctxMenu.elementId))}
                  className="w-full px-3 py-1.5 text-xs text-left text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Replace Photo
                </button>
                {ctxImg.mask_shape && ctxImg.mask_shape !== 'rect' && (
                  <button onClick={() => closeRun(() => handleEnterCrop(ctxMenu.elementId))}
                    className="w-full px-3 py-1.5 text-xs text-left text-white/70 hover:bg-white/5 flex items-center gap-2 transition-colors">
                    <Move className="h-3.5 w-3.5" />
                    Adjust Photo Position
                  </button>
                )}
              </>
            )}
          </div>
        )
      })()}
    </div>
  )
}
