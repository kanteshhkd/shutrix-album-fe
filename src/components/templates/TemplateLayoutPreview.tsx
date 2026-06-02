import type { TemplateJsonData, TemplateRawElement } from '@/types'

interface Props {
  jsonData: TemplateJsonData
  className?: string
}

const PREVIEW_W = 660
const PREVIEW_H = 220

function renderElement(el: TemplateRawElement, scaleX: number, scaleY: number) {
  const x = (el.x ?? 0) * scaleX
  const y = (el.y ?? 0) * scaleY
  const w = Math.max(0, (el.width ?? 0) * scaleX)
  const h = Math.max(0, (el.height ?? 0) * scaleY)
  if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h)) return null
  const opacity = el.opacity ?? 1
  const rx = el.cornerRadius ? Math.min(el.cornerRadius * scaleX, w / 2, h / 2) : 0

  if (el.type === 'rect') {
    return (
      <rect
        key={el.id}
        x={x}
        y={y}
        width={w}
        height={h}
        fill={el.fill ?? '#cccccc'}
        opacity={opacity}
        rx={rx}
      />
    )
  }

  if (el.type === 'image') {
    return (
      <g key={el.id} opacity={opacity}>
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={el.placeholder ? '#2a2a2e' : (el.fill ?? '#2a2a2e')}
          rx={rx}
        />
        {el.placeholder && (
          <>
            <line x1={x} y1={y} x2={x + w} y2={y + h} stroke="#3a3a3e" strokeWidth={1} />
            <line x1={x + w} y1={y} x2={x} y2={y + h} stroke="#3a3a3e" strokeWidth={1} />
          </>
        )}
      </g>
    )
  }

  if (el.type === 'ellipse') {
    return (
      <ellipse
        key={el.id}
        cx={x + w / 2}
        cy={y + h / 2}
        rx={w / 2}
        ry={h / 2}
        fill={el.fill ?? '#cccccc'}
        opacity={opacity}
      />
    )
  }

  if (el.type === 'text') {
    return (
      <text
        key={el.id}
        x={x + w / 2}
        y={y + h / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={el.color ?? '#ffffff'}
        fontSize={Math.max(6, (el.fontSize ?? 48) * scaleX)}
        fontFamily={el.fontFamily ?? 'serif'}
        opacity={opacity}
      >
        {el.text ?? ''}
      </text>
    )
  }

  return null
}

export function TemplateLayoutPreview({ jsonData, className }: Props) {
  const page = jsonData.pages?.[0]
  if (!page) return null

  const srcW = jsonData.width || 3600
  const srcH = jsonData.height || 1200
  const scaleX = PREVIEW_W / srcW
  const scaleY = PREVIEW_H / srcH

  return (
    <svg
      viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
      width="100%"
      height="100%"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={PREVIEW_W} height={PREVIEW_H} fill={page.background ?? '#ffffff'} />
      {page.elements.map((el) => renderElement(el, scaleX, scaleY))}
    </svg>
  )
}
