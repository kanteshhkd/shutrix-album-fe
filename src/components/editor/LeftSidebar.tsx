'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Image as ImageIcon, LayoutTemplate, Type, Palette, Square, Frame,
  Upload, Search, Trash2, Plus, Layers, GripVertical, Eye, EyeOff,
  Lock, Unlock, Flower, ChevronUp, ChevronDown, BookImage, ChevronLeft,
  ImageOff,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEditorStore } from '@/store/editorStore'
import { useShutrixAlbums, useShutrixAlbumPhotos, useShutrixAlbumUpload, type ShutrixPhoto } from '@/hooks/useAlbums'
import { useAssets, usePresignUpload, useDeleteAsset } from '@/hooks/useAssets'
import { generateId, cn, FONT_CATEGORIES } from '@/lib/utils'
import type { AlbumCategory, ShapeElement, TextElement, ImageElement, CanvasElement } from '@/types'

// ─── Shape library ────────────────────────────────────────────────────────────

type ShapeDef = {
  id: string
  label: string
  category: 'basic' | 'polygons' | 'lines' | 'overlays'
  shape_type: ShapeElement['shape_type']
  fill: string
  stroke: string
  stroke_width: number
  corner_radius?: number
  num_points?: number
  inner_radius_ratio?: number
  defaultW: number
  defaultH: number
}

const SHAPE_LIBRARY: ShapeDef[] = [
  // Basic
  { id: 's-rect', label: 'Rect', category: 'basic', shape_type: 'rect', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, corner_radius: 0, defaultW: 240, defaultH: 140 },
  { id: 's-rounded', label: 'Rounded', category: 'basic', shape_type: 'rect', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, corner_radius: 24, defaultW: 240, defaultH: 140 },
  { id: 's-circle', label: 'Circle', category: 'basic', shape_type: 'ellipse', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 140, defaultH: 140 },
  { id: 's-oval', label: 'Oval', category: 'basic', shape_type: 'ellipse', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 220, defaultH: 130 },
  { id: 's-square', label: 'Square', category: 'basic', shape_type: 'rect', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, corner_radius: 0, defaultW: 150, defaultH: 150 },
  { id: 's-pill', label: 'Pill', category: 'basic', shape_type: 'rect', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, corner_radius: 60, defaultW: 240, defaultH: 80 },
  { id: 's-arch', label: 'Arch', category: 'basic', shape_type: 'arch', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 180, defaultH: 240 },
  { id: 's-heart', label: 'Heart', category: 'basic', shape_type: 'heart', fill: '#b76e79', stroke: 'transparent', stroke_width: 0, defaultW: 180, defaultH: 170 },
  { id: 's-cross', label: 'Cross', category: 'basic', shape_type: 'cross', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 130, defaultH: 130 },
  { id: 's-diamond', label: 'Diamond', category: 'basic', shape_type: 'diamond', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 130, defaultH: 160 },
  // Polygons
  { id: 'p-triangle', label: 'Triangle', category: 'polygons', shape_type: 'triangle', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 160, defaultH: 160 },
  { id: 'p-pentagon', label: 'Pentagon', category: 'polygons', shape_type: 'pentagon', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 150, defaultH: 150 },
  { id: 'p-hexagon', label: 'Hexagon', category: 'polygons', shape_type: 'hexagon', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 160, defaultH: 150 },
  { id: 'p-octagon', label: 'Octagon', category: 'polygons', shape_type: 'octagon', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, defaultW: 150, defaultH: 150 },
  { id: 'p-star5', label: 'Star 5', category: 'polygons', shape_type: 'star', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, num_points: 5, inner_radius_ratio: 0.4, defaultW: 150, defaultH: 150 },
  { id: 'p-star6', label: 'Star 6', category: 'polygons', shape_type: 'star', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, num_points: 6, inner_radius_ratio: 0.55, defaultW: 150, defaultH: 150 },
  { id: 'p-star4', label: 'Star 4', category: 'polygons', shape_type: 'star', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, num_points: 4, inner_radius_ratio: 0.35, defaultW: 150, defaultH: 150 },
  { id: 'p-star8', label: 'Star 8', category: 'polygons', shape_type: 'star', fill: '#4b5563', stroke: 'transparent', stroke_width: 0, num_points: 8, inner_radius_ratio: 0.65, defaultW: 150, defaultH: 150 },
  // Lines
  { id: 'l-thin', label: 'Thin', category: 'lines', shape_type: 'line', fill: 'transparent', stroke: '#ffffff', stroke_width: 2, defaultW: 300, defaultH: 2 },
  { id: 'l-med', label: 'Medium', category: 'lines', shape_type: 'line', fill: 'transparent', stroke: '#ffffff', stroke_width: 4, defaultW: 300, defaultH: 4 },
  { id: 'l-thick', label: 'Thick', category: 'lines', shape_type: 'line', fill: 'transparent', stroke: '#ffffff', stroke_width: 8, defaultW: 280, defaultH: 8 },
  { id: 'l-gold', label: 'Gold', category: 'lines', shape_type: 'line', fill: 'transparent', stroke: '#c9a84c', stroke_width: 3, defaultW: 300, defaultH: 3 },
  { id: 'l-fade', label: 'Faded', category: 'lines', shape_type: 'line', fill: 'transparent', stroke: 'rgba(255,255,255,0.35)', stroke_width: 1, defaultW: 400, defaultH: 1 },
  { id: 'l-rose', label: 'Rose', category: 'lines', shape_type: 'line', fill: 'transparent', stroke: '#b76e79', stroke_width: 3, defaultW: 300, defaultH: 3 },
  // Overlays
  { id: 'o-gold', label: 'Gold', category: 'overlays', shape_type: 'rect', fill: 'rgba(201,168,76,0.18)', stroke: 'transparent', stroke_width: 0, defaultW: 500, defaultH: 340 },
  { id: 'o-dark', label: 'Dark', category: 'overlays', shape_type: 'rect', fill: 'rgba(0,0,0,0.55)', stroke: 'transparent', stroke_width: 0, defaultW: 500, defaultH: 340 },
  { id: 'o-light', label: 'White', category: 'overlays', shape_type: 'rect', fill: 'rgba(255,255,255,0.12)', stroke: 'transparent', stroke_width: 0, defaultW: 500, defaultH: 340 },
  { id: 'o-warm', label: 'Warm', category: 'overlays', shape_type: 'rect', fill: 'rgba(180,100,60,0.2)', stroke: 'transparent', stroke_width: 0, defaultW: 500, defaultH: 340 },
  { id: 'o-blush', label: 'Blush', category: 'overlays', shape_type: 'rect', fill: 'rgba(210,140,160,0.2)', stroke: 'transparent', stroke_width: 0, defaultW: 500, defaultH: 340 },
  { id: 'o-navy', label: 'Navy', category: 'overlays', shape_type: 'rect', fill: 'rgba(10,30,70,0.5)', stroke: 'transparent', stroke_width: 0, defaultW: 500, defaultH: 340 },
]

// ─── Frame library ────────────────────────────────────────────────────────────

type FrameDef = {
  id: string
  label: string
  category: 'basic' | 'creative'
  mask_shape: 'rect' | 'circle' | 'arch' | 'polaroid' | 'filmstrip'
  defaultW: number
  defaultH: number
}

const FRAME_LIBRARY: FrameDef[] = [
  { id: 'f-rect', label: 'Rectangle', category: 'basic', mask_shape: 'rect', defaultW: 300, defaultH: 400 },
  { id: 'f-circle', label: 'Circle', category: 'basic', mask_shape: 'circle', defaultW: 300, defaultH: 300 },
  { id: 'f-arch', label: 'Arch', category: 'creative', mask_shape: 'arch', defaultW: 300, defaultH: 400 },
  { id: 'f-polaroid', label: 'Polaroid', category: 'creative', mask_shape: 'polaroid', defaultW: 300, defaultH: 360 },
  { id: 'f-filmstrip', label: 'Filmstrip', category: 'creative', mask_shape: 'filmstrip', defaultW: 240, defaultH: 600 },
]

// ─── Local Templates (built-in, apply real elements to canvas) ───────────────

type LocalTemplate = {
  id: string
  name: string
  category: string
  json_data: {
    background_color: string
    elements: CanvasElement[]
  }
}

// Canvas: 3600×1200. Left page: 0–1800. Right page: 1800–3600. Fold at x=1800.
const LOCAL_TEMPLATES: LocalTemplate[] = [
  // ─ 1: Classic Portrait Pair ────────────────────────────────────────────────
  {
    id: 'local-t1', name: 'Classic Portraits', category: 'wedding',
    json_data: {
      background_color: '#100d0b',
      elements: [
        { id: 't1-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 80, y: 80, width: 1640, height: 1040, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't1-img2', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 1880, y: 80, width: 1640, height: 1040, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't1-sep', type: 'shape', shape_type: 'rect', fill: '#c9a84c', stroke: 'transparent', stroke_width: 0,
          x: 1792, y: 100, width: 16, height: 1000, rotation: 0, opacity: 0.45, locked: false, visible: true },
      ],
    },
  },
  // ─ 2: Hero Spread ──────────────────────────────────────────────────────────
  {
    id: 'local-t2', name: 'Hero Spread', category: 'wedding',
    json_data: {
      background_color: '#080808',
      elements: [
        { id: 't2-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 0, y: 0, width: 3600, height: 1200, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't2-ovl', type: 'shape', shape_type: 'rect', fill: 'rgba(0,0,0,0.5)', stroke: 'transparent', stroke_width: 0,
          x: 0, y: 0, width: 3600, height: 1200, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't2-txt1', type: 'text', text: 'Rahul & Priya', font_family: 'Great Vibes', font_size: 120, font_weight: '400',
          font_style: 'normal', text_decoration: 'none', text_align: 'center', color: '#c9a84c',
          letter_spacing: 2, line_height: 1.2, x: 900, y: 440, width: 1800, height: 160,
          rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't2-txt2', type: 'text', text: '14 February 2024', font_family: 'Cinzel', font_size: 32, font_weight: '400',
          font_style: 'normal', text_decoration: 'none', text_align: 'center', color: '#ffffff',
          letter_spacing: 8, line_height: 1.4, x: 1200, y: 595, width: 1200, height: 60,
          rotation: 0, opacity: 0.8, locked: false, visible: true },
      ],
    },
  },
  // ─ 3: Hero + Side Stack ────────────────────────────────────────────────────
  {
    id: 'local-t3', name: 'Hero + Stack', category: 'pre_wedding',
    json_data: {
      background_color: '#0a0a0e',
      elements: [
        { id: 't3-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 80, y: 80, width: 2080, height: 1040, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't3-img2', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 2240, y: 80, width: 1280, height: 320, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't3-img3', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 2240, y: 440, width: 1280, height: 320, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't3-img4', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 2240, y: 800, width: 1280, height: 320, rotation: 0, opacity: 1, locked: false, visible: true },
      ],
    },
  },
  // ─ 4: 4-Photo Grid ─────────────────────────────────────────────────────────
  {
    id: 'local-t4', name: '4-Photo Grid', category: 'pre_wedding',
    json_data: {
      background_color: '#111111',
      elements: [
        { id: 't4-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 60, y: 60, width: 1710, height: 534, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't4-img2', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 1830, y: 60, width: 1710, height: 534, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't4-img3', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 60, y: 654, width: 1710, height: 486, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't4-img4', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 1830, y: 654, width: 1710, height: 486, rotation: 0, opacity: 1, locked: false, visible: true },
      ],
    },
  },
  // ─ 5: Triple Arch ──────────────────────────────────────────────────────────
  {
    id: 'local-t5', name: 'Triple Arch', category: 'reception',
    json_data: {
      background_color: '#0d0d10',
      elements: [
        { id: 't5-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0, mask_shape: 'arch',
          x: 300, y: 80, width: 800, height: 880, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't5-img2', type: 'image', src: '', fit_mode: 'fill', border_radius: 0, mask_shape: 'arch',
          x: 1400, y: 80, width: 800, height: 880, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't5-img3', type: 'image', src: '', fit_mode: 'fill', border_radius: 0, mask_shape: 'arch',
          x: 2500, y: 80, width: 800, height: 880, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't5-txt1', type: 'text', text: 'OUR STORY', font_family: 'Cinzel', font_size: 28, font_weight: '700',
          font_style: 'normal', text_decoration: 'none', text_align: 'center', color: '#c9a84c',
          letter_spacing: 10, line_height: 1.2, x: 1500, y: 1020, width: 600, height: 50,
          rotation: 0, opacity: 0.9, locked: false, visible: true },
      ],
    },
  },
  // ─ 6: Cinematic ────────────────────────────────────────────────────────────
  {
    id: 'local-t6', name: 'Cinematic', category: 'cinematic',
    json_data: {
      background_color: '#000000',
      elements: [
        { id: 't6-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 0, y: 240, width: 3600, height: 720, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't6-txt1', type: 'text', text: 'RAHUL & PRIYA', font_family: 'Cinzel', font_size: 40, font_weight: '700',
          font_style: 'normal', text_decoration: 'none', text_align: 'center', color: '#c9a84c',
          letter_spacing: 16, line_height: 1.2, x: 900, y: 80, width: 1800, height: 80,
          rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't6-txt2', type: 'text', text: 'A love story in every frame.', font_family: 'Cormorant Garamond', font_size: 30, font_weight: '400',
          font_style: 'italic', text_decoration: 'none', text_align: 'center', color: '#ffffff',
          letter_spacing: 2, line_height: 1.4, x: 1100, y: 165, width: 1400, height: 50,
          rotation: 0, opacity: 0.65, locked: false, visible: true },
        { id: 't6-txt3', type: 'text', text: '14 FEBRUARY 2024', font_family: 'Josefin Sans', font_size: 22, font_weight: '300',
          font_style: 'normal', text_decoration: 'none', text_align: 'center', color: '#ffffff',
          letter_spacing: 10, line_height: 1.4, x: 1300, y: 1000, width: 1000, height: 50,
          rotation: 0, opacity: 0.45, locked: false, visible: true },
      ],
    },
  },
  // ─ 7: Minimal Elegant ──────────────────────────────────────────────────────
  {
    id: 'local-t7', name: 'Minimal Elegant', category: 'luxury',
    json_data: {
      background_color: '#f5f0e8',
      elements: [
        { id: 't7-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0,
          x: 80, y: 80, width: 1640, height: 1040, rotation: 0, opacity: 1, locked: false, visible: true },
        { id: 't7-txt1', type: 'text', text: 'Forever', font_family: 'Great Vibes', font_size: 90, font_weight: '400',
          font_style: 'normal', text_decoration: 'none', text_align: 'center', color: '#2d1a0e',
          letter_spacing: 2, line_height: 1.2, x: 1900, y: 300, width: 1500, height: 140,
          rotation: 0, opacity: 0.9, locked: false, visible: true },
        { id: 't7-div', type: 'shape', shape_type: 'line', fill: 'transparent', stroke: '#c9a84c', stroke_width: 2,
          x: 2050, y: 500, width: 1200, height: 2, rotation: 0, opacity: 0.6, locked: false, visible: true },
        { id: 't7-txt2', type: 'text', text: 'Rahul & Priya', font_family: 'Cinzel', font_size: 32, font_weight: '400',
          font_style: 'normal', text_decoration: 'none', text_align: 'center', color: '#2d1a0e',
          letter_spacing: 8, line_height: 1.4, x: 1900, y: 540, width: 1500, height: 60,
          rotation: 0, opacity: 0.7, locked: false, visible: true },
        { id: 't7-txt3', type: 'text', text: '14 February 2024', font_family: 'Cormorant Garamond', font_size: 28, font_weight: '400',
          font_style: 'italic', text_decoration: 'none', text_align: 'center', color: '#6b4a2e',
          letter_spacing: 3, line_height: 1.4, x: 1900, y: 622, width: 1500, height: 60,
          rotation: 0, opacity: 0.6, locked: false, visible: true },
      ],
    },
  },
  // ─ 8: Polaroid Collection ──────────────────────────────────────────────────
  {
    id: 'local-t8', name: 'Polaroids', category: 'pre_wedding',
    json_data: {
      background_color: '#1a1a1a',
      elements: [
        { id: 't8-img1', type: 'image', src: '', fit_mode: 'fill', border_radius: 0, mask_shape: 'polaroid',
          x: 80, y: 100, width: 780, height: 940, rotation: -3, opacity: 1, locked: false, visible: true },
        { id: 't8-img2', type: 'image', src: '', fit_mode: 'fill', border_radius: 0, mask_shape: 'polaroid',
          x: 920, y: 140, width: 780, height: 940, rotation: 2, opacity: 1, locked: false, visible: true },
        { id: 't8-img3', type: 'image', src: '', fit_mode: 'fill', border_radius: 0, mask_shape: 'polaroid',
          x: 1980, y: 100, width: 780, height: 940, rotation: -2, opacity: 1, locked: false, visible: true },
        { id: 't8-img4', type: 'image', src: '', fit_mode: 'fill', border_radius: 0, mask_shape: 'polaroid',
          x: 2820, y: 140, width: 780, height: 940, rotation: 3, opacity: 1, locked: false, visible: true },
      ],
    },
  },
]

// ─── Template layout thumbnail ────────────────────────────────────────────────

function LocalTemplateThumbnailSvg({ template }: { template: LocalTemplate }) {
  const S = 0.1 // 3600→360, 1200→120
  return (
    <svg viewBox="0 0 360 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      <rect width="360" height="120" fill={template.json_data.background_color} />
      {template.json_data.elements.map((el) => {
        if (!el.visible) return null
        if (el.type === 'image') {
          const im = el as ImageElement
          if (im.mask_shape === 'arch') {
            const x = im.x * S, y = im.y * S, w = im.width * S, h = im.height * S, r = w / 2
            return <path key={el.id} d={`M ${x},${y+h} L ${x},${y+r} A ${r},${r} 0 0 1 ${x+w},${y+r} L ${x+w},${y+h} Z`} fill="#6b7280" opacity={0.65} />
          }
          if (im.mask_shape === 'circle') {
            const cx = im.x * S + im.width * S / 2, cy = im.y * S + im.height * S / 2, r = Math.min(im.width, im.height) * S / 2
            return <circle key={el.id} cx={cx} cy={cy} r={r} fill="#6b7280" opacity={0.65} />
          }
          if (im.mask_shape === 'polaroid') {
            const x = im.x * S, y = im.y * S, w = im.width * S, h = im.height * S
            return (
              <g key={el.id} transform={im.rotation ? `rotate(${im.rotation} ${x + w / 2} ${y + h / 2})` : undefined}>
                <rect x={x} y={y} width={w} height={h} fill="white" opacity={0.9} />
                <rect x={x + w * 0.05} y={y + w * 0.05} width={w * 0.9} height={h - w * 0.25} fill="#6b7280" opacity={0.65} />
              </g>
            )
          }
          return <rect key={el.id} x={im.x * S} y={im.y * S} width={im.width * S} height={im.height * S} fill="#6b7280" opacity={0.65} rx={im.border_radius ? Math.min(im.border_radius * S, 4) : 0} />
        }
        if (el.type === 'shape') {
          const sh = el as ShapeElement
          return <rect key={el.id} x={sh.x * S} y={sh.y * S} width={Math.max(sh.width * S, 1)} height={Math.max(sh.height * S, 1)} fill={sh.fill} opacity={sh.opacity * 0.9} />
        }
        if (el.type === 'text') {
          const tx = el as TextElement
          return <rect key={el.id} x={tx.x * S} y={tx.y * S} width={tx.width * S} height={Math.max(tx.font_size * S * 0.7, 2)} fill={tx.color} opacity={0.55} rx={1} />
        }
        return null
      })}
      <line x1="180" y1="0" x2="180" y2="120" stroke="rgba(255,255,255,0.07)" strokeWidth={0.8} strokeDasharray="2,2" />
    </svg>
  )
}

// ─── Wedding Assets ───────────────────────────────────────────────────────────

const ASSET_LIBRARY = [
  { id: 'al1', label: 'Vintage Rose', url: 'https://images.unsplash.com/photo-1509121774026-681b997c6d66?auto=format&fit=crop&w=200&q=80', category: 'floral' },
  { id: 'al2', label: 'Gold Leaves', url: 'https://images.unsplash.com/photo-1508611849129-373f71c4c9e8?auto=format&fit=crop&w=200&q=80', category: 'floral' },
  { id: 'al3', label: 'Watercolor Peony', url: 'https://images.unsplash.com/photo-1543888355-667cb7c2ee1a?auto=format&fit=crop&w=200&q=80', category: 'floral' },
  { id: 'al4', label: 'Elegant Branch', url: 'https://images.unsplash.com/photo-1455243166885-356a64426569?auto=format&fit=crop&w=200&q=80', category: 'floral' },
  { id: 'aw1', label: 'Rings', url: 'https://images.unsplash.com/photo-1605144883445-5690558b0918?auto=format&fit=crop&w=200&q=80', category: 'wedding' },
  { id: 'aw2', label: 'Mandap', url: 'https://images.unsplash.com/photo-1632517592497-6a454d68e146?auto=format&fit=crop&w=200&q=80', category: 'wedding' },
]

// ─── Color swatches ───────────────────────────────────────────────────────────

const COLOR_GROUPS = [
  { label: 'Wedding Gold', swatches: ['#c9a84c', '#d4af37', '#f0c060', '#8b6914', '#5c4010', '#f5e6b0', '#e8c875', '#b8860b'] },
  { label: 'Neutrals', swatches: ['#ffffff', '#f5f0e8', '#e8e0d0', '#d4c8b8', '#a09080', '#6b5a4e', '#3a2e28', '#1a1410'] },
  { label: 'Blacks & Grays', swatches: ['#0a0a0b', '#1a1a1a', '#2d2d2d', '#404040', '#5a5a5a', '#757575', '#9e9e9e', '#c8c8c8'] },
  { label: 'Rose & Blush', swatches: ['#b76e79', '#d4a0a8', '#f2d2d7', '#fff0f3', '#8b3a46', '#c0627a', '#e8a0b0', '#fce4ec'] },
  { label: 'Royal & Navy', swatches: ['#0a1a3e', '#1e3a6e', '#2e5197', '#4472c4', '#6495ed', '#8ab4f8', '#c0d8ff', '#e8f0ff'] },
  { label: 'Burgundy & Wine', swatches: ['#2c0011', '#4a0018', '#8b0000', '#a52828', '#c0392b', '#e74c3c', '#f1948a', '#fad7d3'] },
  { label: 'Sage & Forest', swatches: ['#1a2b1a', '#2d4a2d', '#4a6741', '#6b8f5e', '#8fad8e', '#b8cdb8', '#d8e8d8', '#f0f5f0'] },
  { label: 'Mauve & Lavender', swatches: ['#3a1a3a', '#6b3a6b', '#9b5fa5', '#c4a0c0', '#d4a5c0', '#e8c8e0', '#f5e6f5', '#faf0fa'] },
  { label: 'Warm Terracotta', swatches: ['#3b1a0a', '#7c3a1a', '#b05a28', '#c87941', '#d4956a', '#e8b898', '#f5d8c0', '#fdf0e8'] },
]

// ─── Text presets ─────────────────────────────────────────────────────────────

const TEXT_PRESETS = [
  { label: 'Couple Names', text: 'Rahul & Priya', font: 'Great Vibes', size: 80, color: '#c9a84c', weight: '400' },
  { label: 'Wedding Date', text: '14 February 2024', font: 'Cinzel', size: 28, color: '#ffffff', weight: '400' },
  { label: 'Forever Tagline', text: 'Forever & Always', font: 'Cormorant Garamond', size: 40, color: '#e8c875', weight: '400' },
  { label: 'Venue Name', text: 'The Grand Palace', font: 'Raleway', size: 24, color: '#d0c0a0', weight: '300' },
  { label: 'Title Bold', text: 'OUR STORY', font: 'Montserrat', size: 36, color: '#ffffff', weight: '700' },
  { label: 'Script Quote', text: '"A love story"', font: 'Dancing Script', size: 50, color: '#c9a84c', weight: '400' },
  { label: 'Subtitle', text: 'Wedding Album', font: 'Playfair Display', size: 32, color: '#f0e8d8', weight: '400' },
  { label: 'Monogram', text: 'R & P', font: 'Cinzel', size: 60, color: '#c9a84c', weight: '700' },
  { label: 'Chapter', text: 'Chapter One', font: 'Gilda Display', size: 34, color: '#d4c8b8', weight: '400' },
  { label: 'Hashtag', text: '#RahulWedsPriya', font: 'Josefin Sans', size: 22, color: '#a0c0e8', weight: '300' },
]

// ─── SVG shape preview ────────────────────────────────────────────────────────

function ShapePreviewSvg({ shape }: { shape: ShapeDef }) {
  const isFilled = shape.fill !== 'transparent' && !shape.fill.startsWith('rgba')
  const isOverlay = shape.fill.startsWith('rgba')
  const isOutline = !isFilled && !isOverlay
  const f = isOverlay ? shape.fill : (isFilled ? '#6b7280' : 'none')
  const s = shape.stroke === 'transparent' ? (isOutline ? '#6b7280' : 'none') : shape.stroke
  const sw = isOutline ? Math.min(shape.stroke_width, 2) + 1 : 0

  switch (shape.shape_type) {
    case 'rect':
      return <rect x="4" y="10" width="44" height="28" rx={shape.corner_radius ? Math.min(shape.corner_radius * 0.18, 8) : 0} fill={f} stroke={s} strokeWidth={sw} />
    case 'ellipse':
      return <ellipse cx="26" cy="24" rx="22" ry="14" fill={f} stroke={s} strokeWidth={sw} />
    case 'triangle':
      return <polygon points="26,5 47,43 5,43" fill={f} stroke={s} strokeWidth={sw} />
    case 'diamond':
      return <polygon points="26,4 46,24 26,44 6,24" fill={f} stroke={s} strokeWidth={sw} />
    case 'pentagon':
      return <polygon points="26,4 46,18 39,40 13,40 6,18" fill={f} stroke={s} strokeWidth={sw} />
    case 'hexagon':
      return <polygon points="15,5 37,5 48,24 37,43 15,43 4,24" fill={f} stroke={s} strokeWidth={sw} />
    case 'octagon':
      return <polygon points="18,4 34,4 46,16 46,32 34,44 18,44 6,32 6,16" fill={f} stroke={s} strokeWidth={sw} />
    case 'cross':
      return <polygon points="18,4 34,4 34,18 48,18 48,30 34,30 34,44 18,44 18,30 4,30 4,18 18,18" fill={f} stroke={s} strokeWidth={sw} />
    case 'arch':
      return <path d="M 4,44 L 4,26 A 22,22 0 0 1 48,26 L 48,44 Z" fill={f} stroke={s} strokeWidth={sw} />
    case 'heart':
      return <path d="M 26,40 C 10,28 2,18 2,12 C 2,5 8,1 14,1 C 19,1 23,4 26,8 C 29,4 33,1 38,1 C 44,1 50,5 50,12 C 50,18 42,28 26,40 Z" fill={f} stroke={s} strokeWidth={sw} />
    case 'star': {
      const n = shape.num_points ?? 5
      const outerR = 20, cx = 26, cy = 24
      const innerR = outerR * (shape.inner_radius_ratio ?? 0.4)
      const pts: string[] = []
      for (let i = 0; i < n * 2; i++) {
        const a = (Math.PI / n) * i - Math.PI / 2
        const r = i % 2 === 0 ? outerR : innerR
        pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
      }
      return <polygon points={pts.join(' ')} fill={f} stroke={s} strokeWidth={sw} />
    }
    case 'line':
      return <line x1="4" y1="24" x2="48" y2="24" stroke={s || '#6b7280'} strokeWidth={Math.max(sw, 2)} strokeLinecap="round" />
    default:
      return <rect x="4" y="10" width="44" height="28" fill={f} stroke={s} strokeWidth={sw} />
  }
}

function ShapeCard({ shape, onClick }: { shape: ShapeDef; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={shape.label}
      className="group flex flex-col items-center gap-0.5 p-1 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all"
    >
      <svg viewBox="0 0 52 48" width="46" height="40">
        <ShapePreviewSvg shape={shape} />
      </svg>
      <span className="text-[8.5px] text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors truncate w-full text-center leading-tight">
        {shape.label}
      </span>
    </button>
  )
}

// ─── Frame SVG preview ────────────────────────────────────────────────────────

function FramePreviewSvg({ frame }: { frame: FrameDef }) {
  const f = '#6b7280'
  switch (frame.mask_shape) {
    case 'rect': return <rect x="8" y="4" width="36" height="40" fill={f} />
    case 'circle': return <circle cx="26" cy="24" r="18" fill={f} />
    case 'arch': return <path d="M 12,44 L 12,24 A 14,14 0 0 1 40,24 L 40,44 Z" fill={f} />
    case 'polaroid': return <g><rect x="6" y="2" width="40" height="44" fill="#ffffff" /><rect x="10" y="6" width="32" height="28" fill={f} /></g>
    case 'filmstrip': return <g><rect x="14" y="2" width="24" height="44" fill="#111" /><rect x="18" y="4" width="16" height="10" fill={f} /><rect x="18" y="19" width="16" height="10" fill={f} /><rect x="18" y="34" width="16" height="10" fill={f} /></g>
    default: return <rect x="4" y="10" width="44" height="28" fill={f} />
  }
}

function FrameCard({ frame, onClick }: { frame: FrameDef; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={frame.label}
      className="group flex flex-col items-center gap-0.5 p-1 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 transition-all"
    >
      <svg viewBox="0 0 52 48" width="46" height="40">
        <FramePreviewSvg frame={frame} />
      </svg>
      <span className="text-[8.5px] text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors truncate w-full text-center leading-tight">
        {frame.label}
      </span>
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold text-muted-foreground/40 uppercase tracking-widest mb-1.5 mt-3 first:mt-0 px-0.5">
      {children}
    </p>
  )
}

// ─── Layers panel ─────────────────────────────────────────────────────────────

function LayersPanel() {
  const {
    pages, currentPageIndex, selectedElementIds,
    selectElement, updateElement, reorderElements,
  } = useEditorStore()
  const elements = pages[currentPageIndex]?.json_data.elements || []
  const [dragDisplayIndex, setDragDisplayIndex] = useState<number | null>(null)
  const [dragOverDisplayIndex, setDragOverDisplayIndex] = useState<number | null>(null)

  // Reversed: displayIndex 0 = topmost layer visually. actualIndex = elements.length - 1 - displayIndex
  const layerList = [...elements].map((el, i) => ({ el, actualIndex: i })).reverse()

  const getLabel = (el: CanvasElement): string => {
    if (el.type === 'text') return (el as TextElement).text.slice(0, 22) || 'Text'
    if (el.type === 'image') return (el as ImageElement).is_background ? 'Background' : 'Photo'
    if (el.type === 'shape') {
      const t = (el as ShapeElement).shape_type
      return t.charAt(0).toUpperCase() + t.slice(1)
    }
    return 'Element'
  }

  const getIcon = (el: CanvasElement) => {
    if (el.type === 'text') return <Type className="h-3 w-3 shrink-0" />
    if (el.type === 'image') return <ImageIcon className="h-3 w-3 shrink-0" />
    return <Square className="h-3 w-3 shrink-0" />
  }

  const handleDrop = (dropDisplayIndex: number) => {
    if (dragDisplayIndex === null || dragDisplayIndex === dropDisplayIndex) {
      setDragDisplayIndex(null)
      setDragOverDisplayIndex(null)
      return
    }
    const fromActual = elements.length - 1 - dragDisplayIndex
    const toActual = elements.length - 1 - dropDisplayIndex
    reorderElements(fromActual, toActual)
    setDragDisplayIndex(null)
    setDragOverDisplayIndex(null)
  }

  return (
    <ScrollArea className="flex-1">
      {layerList.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center px-3">
          <Layers className="h-7 w-7 text-muted-foreground/20 mb-2" />
          <p className="text-[11px] text-muted-foreground/40">No elements yet</p>
          <p className="text-[10px] text-muted-foreground/30 mt-1">Add shapes, text, or photos to see layers</p>
        </div>
      ) : (
        <div className="p-1.5 space-y-px">
          {layerList.map(({ el, actualIndex }, displayIndex) => (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => { e.stopPropagation(); setDragDisplayIndex(displayIndex) }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverDisplayIndex(displayIndex) }}
              onDragLeave={() => setDragOverDisplayIndex(null)}
              onDragEnd={() => { setDragDisplayIndex(null); setDragOverDisplayIndex(null) }}
              onDrop={(e) => { e.preventDefault(); handleDrop(displayIndex) }}
              onClick={() => selectElement(el.id)}
              className={cn(
                'group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all select-none',
                selectedElementIds.includes(el.id)
                  ? 'bg-primary/15 border border-primary/20 text-primary'
                  : 'hover:bg-white/5 text-muted-foreground/60 border border-transparent',
                dragOverDisplayIndex === displayIndex && dragDisplayIndex !== displayIndex
                  ? 'border-primary/50 bg-primary/5'
                  : '',
              )}
            >
              <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/20 group-hover:text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
              {getIcon(el)}
              <span className="flex-1 text-[11px] truncate">{getLabel(el)}</span>
              {/* BG badge */}
              {el.type === 'image' && (el as ImageElement).is_background && (
                <span className="text-[8px] px-1 py-px rounded bg-amber-500/15 text-amber-400 shrink-0 font-medium">BG</span>
              )}
              {/* Hidden badge */}
              {!el.visible && (
                <span className="text-[8px] px-1 py-px rounded bg-white/10 text-muted-foreground/40 shrink-0">hidden</span>
              )}
              {/* Always-visible layer order arrows */}
              <div className="flex items-center shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); if (actualIndex < elements.length - 1) reorderElements(actualIndex, actualIndex + 1) }}
                  disabled={actualIndex === elements.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors disabled:opacity-20 text-muted-foreground/50 hover:text-white"
                  title="Bring Forward"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (actualIndex > 0) reorderElements(actualIndex, actualIndex - 1) }}
                  disabled={actualIndex === 0}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors disabled:opacity-20 text-muted-foreground/50 hover:text-white"
                  title="Send Backward"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              {/* Hover-only: visibility + lock */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }) }}
                  className={cn(
                    'w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors',
                    !el.visible ? 'text-muted-foreground/30' : 'text-muted-foreground/60',
                  )}
                  title={el.visible ? 'Hide' : 'Show'}
                >
                  {el.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }) }}
                  className={cn(
                    'w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors',
                    el.locked ? 'text-yellow-400' : 'text-muted-foreground/60',
                  )}
                  title={el.locked ? 'Unlock' : 'Lock'}
                >
                  {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  )
}

// ─── Album photos panel ───────────────────────────────────────────────────────

function AlbumPhotosPanel({
  albumId,
  albumTitle,
  onBack,
  onAddPhoto,
}: {
  albumId: number
  albumTitle: string
  onBack: () => void
  onAddPhoto: (url: string) => void
}) {
  const [offset, setOffset] = useState(0)
  const [allPhotos, setAllPhotos] = useState<ShutrixPhoto[]>([])
  const loadedOffsets = useRef(new Set<number>())
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isFetching, isError } = useShutrixAlbumPhotos(albumId, offset)
  const mediaCount = data?.media_count ?? 0

  useEffect(() => {
    if (data?.media && !isFetching && !loadedOffsets.current.has(offset)) {
      loadedOffsets.current.add(offset)
      setAllPhotos(prev => {
        if (offset === 0) return data.media
        const seen = new Set(prev.map(p => p.media_id))
        return [...prev, ...data.media.filter(p => !seen.has(p.media_id))]
      })
    }
  }, [data, isFetching, offset])

  const hasMore = mediaCount > 0 && allPhotos.length < mediaCount

  // Intersection Observer for infinite scroll (observe within ScrollArea viewport)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || isFetching) return

    // Find the ScrollArea viewport (Radix UI creates a viewport div)
    const viewport = sentinel.closest('[data-radix-scroll-area-viewport]') as HTMLElement
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          setOffset(o => o + 25)
        }
      },
      { 
        root: viewport,
        rootMargin: '100px',
        threshold: 0.1 
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isFetching, allPhotos.length])

  // After each batch loads, auto-fetch next page if container isn't scrollable yet
  useEffect(() => {
    if (!hasMore || isFetching) return
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight <= el.clientHeight + 50) {
      setOffset(o => o + 25)
    }
  }, [allPhotos.length, hasMore, isFetching])

  const upload = useShutrixAlbumUpload(albumId)
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => upload.mutate(files),
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 50 * 1024 * 1024,
    disabled: upload.isPending,
  })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 shrink-0 border-b border-white/[0.06]">
        <button
          onClick={onBack}
          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-muted-foreground/60 hover:text-white shrink-0"
          title="Back to albums"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-[11px] font-semibold text-white/80 truncate flex-1">{albumTitle}</p>
        {!isLoading && !isError && (
          <span className="text-[9px] text-muted-foreground/40 shrink-0">{mediaCount} photos</span>
        )}
      </div>

      {/* Upload zone */}
      <div
        {...getRootProps()}
        className={cn(
          'mx-2 mt-2 mb-0.5 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer transition-all shrink-0',
          isDragActive
            ? 'border-primary/60 bg-primary/10 text-primary'
            : upload.isPending
            ? 'border-white/10 text-muted-foreground/30 cursor-default'
            : 'border-white/10 hover:border-white/25 hover:bg-white/3 text-muted-foreground/50 hover:text-muted-foreground/80',
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px]">
          {upload.isPending
            ? 'Uploading…'
            : isDragActive
            ? 'Drop to upload'
            : 'Upload to this album'}
        </span>
      </div>

      {/* Photos grid */}
      <ScrollArea className="flex-1">
        {isLoading && offset === 0 ? (
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-12 text-center px-4">
            <ImageOff className="h-7 w-7 text-muted-foreground/20 mb-2" />
            <p className="text-[11px] text-muted-foreground/40">Could not load photos</p>
          </div>
        ) : allPhotos.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center px-4">
            <ImageIcon className="h-7 w-7 text-muted-foreground/20 mb-2" />
            <p className="text-[11px] text-muted-foreground/40">No photos in this album</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 p-2 pb-2">
            {allPhotos.map((photo: ShutrixPhoto) => (
              <div
                key={photo.media_id}
                className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group cursor-grab active:cursor-grabbing bg-white/5"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('assetUrl', photo.images.original)
                  e.dataTransfer.setData('assetId', photo.media_id)
                }}
                onDoubleClick={() => onAddPhoto(photo.images.original)}
              >
                <img
                  src={photo.images.thumb}
                  alt={photo.filename}
                  className="w-full h-full object-cover"
                  draggable={false}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddPhoto(photo.images.original) }}
                    className="w-5 h-5 rounded bg-primary/80 flex items-center justify-center hover:bg-primary transition-colors"
                  >
                    <Plus className="h-3 w-3 text-primary-foreground" />
                  </button>
                </div>
              </div>
            ))}
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="col-span-2 h-8 flex items-center justify-center">
              {isFetching && offset > 0 && (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
              )}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────

type PanelId = 'templates' | 'albums' | 'photos' | 'assets' | 'frames' | 'shapes' | 'text' | 'colors' | 'layers'

const NAV: { id: PanelId; icon: React.ElementType; label: string }[] = [
  { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
  { id: 'albums', icon: BookImage, label: 'Albums' },
  { id: 'photos', icon: ImageIcon, label: 'Photos' },
  { id: 'assets', icon: Flower, label: 'Elements' },
  { id: 'frames', icon: Frame, label: 'Frames' },
  { id: 'shapes', icon: Square, label: 'Shapes' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'colors', icon: Palette, label: 'Colors' },
  { id: 'layers', icon: Layers, label: 'Layers' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function LeftSidebar() {
  const [activePanel, setActivePanel] = useState<PanelId>('frames')
  const [search, setSearch] = useState('')
  const [templateCategory, setTemplateCategory] = useState<AlbumCategory | 'all'>('all')
  const [fontSearch, setFontSearch] = useState('')
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null)

  const { addElement, pages, currentPageIndex, selectedElementIds, updateElement, updatePageBackground, pushHistory, updateCurrentPageElements } = useEditorStore()
  const { data: assetsData } = useAssets({ asset_type: 'photo' })
  const uploadAsset = usePresignUpload()
  const deleteAsset = useDeleteAsset()
  
  // Need to import useShutrixAlbums from hooks
  const { data: shutrixAlbumsData, isLoading: isLoadingShutrix } = useShutrixAlbums()
  const shutrixAlbums = shutrixAlbumsData?.data || []

  const assets = assetsData?.data || []

  const displayLocalTemplates = LOCAL_TEMPLATES.filter(
    (t) =>
      (templateCategory === 'all' || t.category === templateCategory) &&
      (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  )

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
    // If an empty image frame is selected, fill it (Canva-style)
    if (selectedElementIds.length === 1) {
      const sel = page.json_data.elements.find(e => e.id === selectedElementIds[0])
      if (sel?.type === 'image' && !(sel as ImageElement).src) {
        pushHistory()
        updateElement(sel.id, { src: assetUrl } as Partial<CanvasElement>)
        return
      }
    }
    addElement({
      id: generateId(), type: 'image', src: assetUrl,
      x: 100, y: 100, width: 400, height: 300,
      rotation: 0, opacity: 1, locked: false, visible: true,
      fit_mode: 'fill', border_radius: 0,
    })
  }

  const addShape = (shape: ShapeDef) => {
    const page = pages[currentPageIndex]
    if (!page) return
    addElement({
      id: generateId(), type: 'shape',
      shape_type: shape.shape_type,
      x: page.json_data.width / 2 - shape.defaultW / 2,
      y: page.json_data.height / 2 - shape.defaultH / 2,
      width: shape.defaultW, height: shape.defaultH,
      rotation: 0, opacity: 1, locked: false, visible: true,
      fill: shape.fill, stroke: shape.stroke,
      stroke_width: shape.stroke_width,
      corner_radius: shape.corner_radius,
      num_points: shape.num_points,
      inner_radius_ratio: shape.inner_radius_ratio,
    })
  }

  const addFrame = (frame: FrameDef) => {
    const page = pages[currentPageIndex]
    if (!page) return
    addElement({
      id: generateId(), type: 'image',
      src: '',
      mask_shape: frame.mask_shape,
      x: page.json_data.width / 2 - frame.defaultW / 2,
      y: page.json_data.height / 2 - frame.defaultH / 2,
      width: frame.defaultW, height: frame.defaultH,
      rotation: 0, opacity: 1, locked: false, visible: true,
      fit_mode: 'fill', border_radius: 0,
    })
  }

  const addAssetToCanvas = (assetUrl: string) => {
    const page = pages[currentPageIndex]
    if (!page) return
    addElement({
      id: generateId(), type: 'image', src: assetUrl,
      x: page.json_data.width / 2 - 150, y: page.json_data.height / 2 - 150, 
      width: 300, height: 300,
      rotation: 0, opacity: 1, locked: false, visible: true,
      fit_mode: 'fit', border_radius: 0,
    })
  }

  const applyColor = (hex: string) => {
    const page = pages[currentPageIndex]
    if (!page) return
    const selectedId = selectedElementIds[0]
    if (selectedId) {
      const el = page.json_data.elements.find((e) => e.id === selectedId)
      if (!el) return
      if (el.type === 'text') updateElement(selectedId, { color: hex } as never)
      else if (el.type === 'shape') updateElement(selectedId, { fill: hex } as never)
    } else {
      updatePageBackground(hex)
    }
  }

  const addTextPreset = (preset: typeof TEXT_PRESETS[0]) => {
    const page = pages[currentPageIndex]
    if (!page) return
    addElement({
      id: generateId(), type: 'text',
      text: preset.text, font_family: preset.font,
      font_size: preset.size, font_weight: preset.weight,
      font_style: 'normal', text_decoration: 'none',
      text_align: 'center', color: preset.color,
      letter_spacing: 2, line_height: 1.4,
      x: page.json_data.width / 2 - 250,
      y: page.json_data.height / 2 - preset.size / 2,
      width: 500, height: preset.size * 1.8,
      rotation: 0, opacity: 1, locked: false, visible: true,
    })
  }

  const addFontText = (font: string) => {
    const page = pages[currentPageIndex]
    if (!page) return
    addElement({
      id: generateId(), type: 'text', text: 'Click to edit',
      font_family: font, font_size: 48, font_weight: '400',
      font_style: 'normal', text_decoration: 'none',
      text_align: 'center', color: '#ffffff',
      letter_spacing: 1, line_height: 1.4,
      x: page.json_data.width / 2 - 200,
      y: page.json_data.height / 2 - 40,
      width: 400, height: 80,
      rotation: 0, opacity: 1, locked: false, visible: true,
    })
  }

  const applyTemplate = (template: LocalTemplate) => {
    if (!pages[currentPageIndex]) return
    pushHistory()
    updateCurrentPageElements(template.json_data.elements)
    updatePageBackground(template.json_data.background_color)
  }

  const byFrameCategory = (cat: FrameDef['category']) => FRAME_LIBRARY.filter((s) => s.category === cat)
  const byShapeCategory = (cat: ShapeDef['category']) => SHAPE_LIBRARY.filter((s) => s.category === cat)

  const filteredFontCategories = FONT_CATEGORIES.map((cat) => ({
    ...cat,
    fonts: fontSearch
      ? cat.fonts.filter((f) => f.toLowerCase().includes(fontSearch.toLowerCase()))
      : cat.fonts,
  })).filter((cat) => cat.fonts.length > 0)

  return (
    <div className="flex h-full shrink-0">

      {/* ── Icon rail ── */}
      <div className="w-[68px] bg-[#0d0d10] border-r border-white/5 flex flex-col items-center pt-3 pb-4 gap-0.5 shrink-0 overflow-y-auto scrollbar-none">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setActivePanel(id); if (id !== 'albums') setSelectedAlbumId(null) }}
            title={label}
            className={cn(
              'w-14 h-14 flex flex-col items-center justify-center rounded-xl gap-1 transition-all duration-150',
              activePanel === id
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground/40 hover:text-muted-foreground/80 hover:bg-white/5',
            )}
          >
            <Icon className="h-[22px] w-[22px]" />
            <span className="text-[8px] leading-tight font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Content panel ── */}
      <div className="w-[320px] flex flex-col bg-[#111116] border-r border-white/[0.06] overflow-hidden">

        {/* Panel header */}
        <div className="h-9 px-3 flex items-center shrink-0 border-b border-white/[0.06]">
          <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            {NAV.find((n) => n.id === activePanel)?.label}
          </span>
        </div>

        {/* ── Albums panel ── */}
        {activePanel === 'albums' && (
          selectedAlbumId === null ? (
            // ── Album grid ──
            <div className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1">
                {isLoadingShutrix ? (
                  <div className="flex flex-col gap-1.5 p-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="aspect-[3/2] rounded-lg bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : shutrixAlbums.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center px-4">
                    <BookImage className="h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-[11px] text-muted-foreground/40">No albums found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 p-2 pb-4">
                    {shutrixAlbums.map(album => {
                      const coverImg = (album as any).cover_image || album.cover_image_url
                      const albumId = (album as any).id as number
                      return (
                        <button
                          key={albumId}
                          onClick={() => setSelectedAlbumId(albumId)}
                          className="group relative rounded-lg overflow-hidden border border-white/10 hover:border-primary/40 transition-all cursor-pointer bg-[#1a1a20] text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                          <div className="aspect-[3/2] w-full relative">
                            {coverImg ? (
                              <img
                                src={coverImg}
                                alt={album.title}
                                className="w-full h-full object-cover"
                                draggable={false}
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookImage className="h-6 w-6 text-muted-foreground/20" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5 pt-4">
                            <p className="text-[10px] font-medium text-white truncate leading-tight">{album.title}</p>
                          </div>
                          <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          ) : (
            // ── Album detail: photos grid ──
            <AlbumPhotosPanel
              albumId={selectedAlbumId}
              albumTitle={shutrixAlbums.find(a => (a as any).id === selectedAlbumId)?.title ?? ''}
              onBack={() => setSelectedAlbumId(null)}
              onAddPhoto={addPhotoToCanvas}
            />
          )
        )}

        {/* ── Templates panel ── */}
        {activePanel === 'templates' && (
          <div className="flex flex-col flex-1 min-h-0 p-2 gap-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 pl-7 text-xs bg-[#0d0d10] border-white/10" />
              </div>
              <Select value={templateCategory} onValueChange={(v) => setTemplateCategory(v as AlbumCategory | 'all')}>
                <SelectTrigger className="h-7 text-xs bg-[#0d0d10] border-white/10 w-[140px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {['wedding', 'pre_wedding', 'engagement', 'haldi', 'reception', 'cinematic', 'luxury', 'minimal'].map((cat) => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-2 gap-1.5 pr-1">
                {displayLocalTemplates.length === 0 && (
                  <div className="col-span-2 py-10 text-center">
                    <LayoutTemplate className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                    <p className="text-[11px] text-muted-foreground/40">No templates found</p>
                  </div>
                )}
                {displayLocalTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="aspect-[3/2] rounded-lg overflow-hidden border border-white/10 hover:border-primary/40 transition-all relative group bg-[#1a1a20]"
                    title={`Apply "${template.name}"`}
                  >
                    <LocalTemplateThumbnailSvg template={template} />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-3">
                      <p className="text-[9px] text-white/70 truncate text-left leading-tight">{template.name}</p>
                      <p className="text-[8px] text-white/30 capitalize leading-tight">{template.category.replace('_', ' ')}</p>
                    </div>
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[11px] text-white font-semibold bg-primary/80 px-2.5 py-1 rounded-full shadow">Apply</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ── Photos panel ── */}
        {activePanel === 'photos' && (
          <div className="flex flex-col flex-1 min-h-0 p-2 gap-2">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all shrink-0',
                isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/30 hover:bg-white/3',
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-4 w-4 text-muted-foreground/40 mx-auto mb-1" />
              <p className="text-[11px] text-muted-foreground/50">{isDragActive ? 'Drop here' : 'Drop or click to upload'}</p>
              {uploadAsset.isPending && <p className="text-[10px] text-primary mt-1">Uploading...</p>}
            </div>
            <ScrollArea className="flex-1">
              {assets.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <ImageIcon className="h-7 w-7 text-muted-foreground/20 mb-2" />
                  <p className="text-[11px] text-muted-foreground/40">No photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 pr-1">
                  {assets.map((asset) => (
                    <div key={asset.id}
                      className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('assetUrl', asset.url); e.dataTransfer.setData('assetId', String(asset.id)) }}
                      onDoubleClick={() => addPhotoToCanvas(asset.url)}
                    >
                      <img src={asset.url} alt={asset.original_name} className="w-full h-full object-cover" draggable={false} />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); addPhotoToCanvas(asset.url) }}
                            className="w-5 h-5 rounded bg-primary/80 flex items-center justify-center hover:bg-primary transition-colors">
                            <Plus className="h-3 w-3 text-primary-foreground" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteAsset.mutate(String(asset.id)) }}
                            className="w-5 h-5 rounded bg-red-500/80 flex items-center justify-center hover:bg-red-500 transition-colors">
                            <Trash2 className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* ── Elements / Assets panel ── */}
        {activePanel === 'assets' && (
          <ScrollArea className="flex-1">
            <div className="px-2 py-2">
              <SectionLabel>Floral & Botanicals</SectionLabel>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {ASSET_LIBRARY.filter(a => a.category === 'floral').map((asset) => (
                  <div key={asset.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group cursor-grab active:cursor-grabbing bg-white/5"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('assetUrl', asset.url); e.dataTransfer.setData('assetId', asset.id) }}
                    onDoubleClick={() => addAssetToCanvas(asset.url)}
                  >
                    <img src={asset.url} alt={asset.label} className="w-full h-full object-cover" draggable={false} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[9px] text-white font-medium bg-black/60 px-1.5 py-0.5 rounded truncate max-w-[80%]">{asset.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <SectionLabel>Wedding & Ornaments</SectionLabel>
              <div className="grid grid-cols-2 gap-2">
                {ASSET_LIBRARY.filter(a => a.category === 'wedding').map((asset) => (
                  <div key={asset.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group cursor-grab active:cursor-grabbing bg-white/5"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('assetUrl', asset.url); e.dataTransfer.setData('assetId', asset.id) }}
                    onDoubleClick={() => addAssetToCanvas(asset.url)}
                  >
                    <img src={asset.url} alt={asset.label} className="w-full h-full object-cover" draggable={false} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[9px] text-white font-medium bg-black/60 px-1.5 py-0.5 rounded truncate max-w-[80%]">{asset.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* ── Frames panel ── */}
        {activePanel === 'frames' && (
          <ScrollArea className="flex-1">
            <div className="px-2 py-2">
              <SectionLabel>Basic Frames</SectionLabel>
              <div className="grid grid-cols-3 gap-0 mb-4">
                {byFrameCategory('basic').map((f) => <FrameCard key={f.id} frame={f} onClick={() => addFrame(f)} />)}
              </div>

              <SectionLabel>Creative Frames</SectionLabel>
              <div className="grid grid-cols-3 gap-0">
                {byFrameCategory('creative').map((f) => <FrameCard key={f.id} frame={f} onClick={() => addFrame(f)} />)}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* ── Shapes panel ── */}
        {activePanel === 'shapes' && (
          <ScrollArea className="flex-1">
            <div className="px-2 py-2">
              <SectionLabel>Basic</SectionLabel>
              <div className="grid grid-cols-4 gap-0">
                {byShapeCategory('basic').map((s) => <ShapeCard key={s.id} shape={s} onClick={() => addShape(s)} />)}
              </div>

              <SectionLabel>Polygons & Stars</SectionLabel>
              <div className="grid grid-cols-4 gap-0">
                {byShapeCategory('polygons').map((s) => <ShapeCard key={s.id} shape={s} onClick={() => addShape(s)} />)}
              </div>

              <SectionLabel>Lines</SectionLabel>
              <div className="grid grid-cols-3 gap-0">
                {byShapeCategory('lines').map((s) => <ShapeCard key={s.id} shape={s} onClick={() => addShape(s)} />)}
              </div>

              <SectionLabel>Overlays</SectionLabel>
              <div className="grid grid-cols-3 gap-0">
                {byShapeCategory('overlays').map((s) => <ShapeCard key={s.id} shape={s} onClick={() => addShape(s)} />)}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* ── Text panel ── */}
        {activePanel === 'text' && (
          <ScrollArea className="flex-1">
            <div className="px-2 py-2">
              <SectionLabel>Presets</SectionLabel>
              <div className="space-y-1 mb-4">
                {TEXT_PRESETS.map((preset) => (
                  <button key={preset.label}
                    onClick={() => addTextPreset(preset)}
                    className="w-full px-2.5 py-2 rounded-xl border border-white/8 hover:border-primary/40 bg-[#0d0d10] text-left transition-all hover:bg-white/3"
                  >
                    <p className="truncate leading-snug"
                      style={{ fontFamily: preset.font, color: preset.color, fontSize: Math.min(preset.size * 0.28, 16), fontWeight: preset.weight }}>
                      {preset.text}
                    </p>
                    <p className="text-[9px] text-muted-foreground/40 mt-0.5">{preset.label} · {preset.font}</p>
                  </button>
                ))}
              </div>

              <SectionLabel>Font Browser</SectionLabel>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
                <input
                  placeholder="Search fonts..."
                  value={fontSearch}
                  onChange={(e) => setFontSearch(e.target.value)}
                  className="w-full h-7 pl-6 pr-2 text-xs bg-[#0d0d10] border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              {filteredFontCategories.map((cat) => (
                <div key={cat.label} className="mb-3">
                  <p className="text-[8.5px] font-semibold text-muted-foreground/35 uppercase tracking-widest mb-1">{cat.label}</p>
                  <div className="space-y-0.5">
                    {(cat.fonts as readonly string[]).map((font) => (
                      <button key={font}
                        onClick={() => addFontText(font)}
                        className="w-full px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition-all group flex items-center justify-between"
                      >
                        <span className="text-sm text-foreground/70 group-hover:text-foreground transition-colors truncate" style={{ fontFamily: font }}>
                          {font}
                        </span>
                        <span className="text-[8px] text-muted-foreground/30 ml-1 shrink-0 group-hover:text-muted-foreground/60">+ add</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* ── Colors panel ── */}
        {activePanel === 'colors' && (
          <ScrollArea className="flex-1">
            <div className="px-2 py-2">
              <p className="text-[10px] text-muted-foreground/40 mb-3 leading-relaxed">
                Apply to selected element or page background.
              </p>

              <div className="flex items-center gap-2.5 mb-4 p-2.5 rounded-xl border border-white/8 bg-[#0d0d10]">
                <input type="color" defaultValue="#c9a84c" onChange={(e) => applyColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground/80">Custom color</p>
                  <p className="text-[9px] text-muted-foreground/40">Pick any shade</p>
                </div>
              </div>

              {COLOR_GROUPS.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="text-[8.5px] font-semibold text-muted-foreground/35 uppercase tracking-widest mb-1.5">{group.label}</p>
                  <div className="grid grid-cols-8 gap-1">
                    {group.swatches.map((color) => (
                      <button key={color} onClick={() => applyColor(color)} title={color}
                        className="w-6 h-6 rounded-md border border-white/10 hover:scale-110 hover:border-primary/50 transition-all"
                        style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* ── Layers panel ── */}
        {activePanel === 'layers' && <LayersPanel />}

      </div>
    </div>
  )
}
