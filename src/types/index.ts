// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'user' | 'admin'
  is_verified: boolean
  created_at: string
  updated_at: string
  subscription?: Subscription
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  confirm_password: string
}

// ─── Subscription & Plans ─────────────────────────────────────────────────────

export type PlanId = 'free' | 'starter' | 'pro'

export interface Plan {
  id: PlanId
  name: string
  price_monthly: number
  price_yearly: number
  features: string[]
  limits: {
    albums: number | null
    exports_per_month: number | null
    storage_gb: number
    premium_templates: boolean
    watermark: boolean
    priority_exports: boolean
  }
  razorpay_plan_id?: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: PlanId
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'
  current_period_start: string
  current_period_end: string
  razorpay_subscription_id?: string
  created_at: string
  updated_at: string
  plan: Plan
}

// ─── Album & Pages ────────────────────────────────────────────────────────────

export type AlbumCategory =
  | 'wedding'
  | 'pre_wedding'
  | 'engagement'
  | 'haldi'
  | 'mehndi'
  | 'reception'
  | 'cinematic'
  | 'luxury'
  | 'minimal'

export type AlbumSize = '12x36' | '12x30' | '10x24'

export type AlbumStatus = 'draft' | 'published' | 'archived'

export interface Album {
  id: string
  user_id: string
  title: string
  category: AlbumCategory
  size: AlbumSize
  status: AlbumStatus
  cover_image_url?: string
  page_count: number
  template_id?: string
  created_at: string
  updated_at: string
  pages?: Page[]
}

export interface Page {
  id: string
  album_id: string
  page_number: number
  page_order?: number
  background?: string
  json_data: PageData
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

export interface PageData {
  width: number
  height: number
  background_color: string
  elements: CanvasElement[]
}

// ─── Canvas Elements ──────────────────────────────────────────────────────────

export type ElementType = 'image' | 'text' | 'shape' | 'frame'

export interface ElementShadow {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface ElementBorder {
  enabled: boolean
  width: number
  color: string
}

export interface BaseElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
}

export interface ImageElement extends BaseElement {
  type: 'image'
  src: string
  asset_id?: string
  fit_mode: 'fit' | 'fill' | 'crop'
  crop?: {
    x: number
    y: number
    width: number
    height: number
  }
  border_radius: number
  shadow?: ElementShadow
  border?: ElementBorder
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  font_family: string
  font_size: number
  font_weight: string
  font_style: 'normal' | 'italic'
  text_decoration: 'none' | 'underline'
  text_align: 'left' | 'center' | 'right'
  color: string
  letter_spacing: number
  line_height: number
  shadow?: ElementShadow
}

export interface ShapeElement extends BaseElement {
  type: 'shape'
  shape_type: 'rect' | 'ellipse' | 'line'
  fill: string
  stroke: string
  stroke_width: number
  corner_radius?: number
}

export interface FrameElement extends BaseElement {
  type: 'frame'
  frame_asset_url: string
  frame_asset_id?: string
}

export type CanvasElement = ImageElement | TextElement | ShapeElement | FrameElement

// ─── Templates ────────────────────────────────────────────────────────────────

export interface TemplateRawElement {
  id: string
  type: 'rect' | 'image' | 'text' | 'ellipse'
  x: number
  y: number
  width: number
  height: number
  fill?: string
  opacity?: number
  cornerRadius?: number
  placeholder?: boolean
  placeholderText?: string
  text?: string
  fontSize?: number
  fontFamily?: string
  color?: string
}

export interface TemplateRawPage {
  background: string
  elements: TemplateRawElement[]
}

export interface TemplateJsonData {
  version: string
  width: number
  height: number
  pages: TemplateRawPage[]
}

export interface Template {
  id: string
  name: string
  category: AlbumCategory
  size: AlbumSize
  thumbnail_url?: string
  preview_images: string[]
  is_premium: boolean
  price?: number
  page_count: number
  pages?: TemplatePage[]
  json_data?: TemplateJsonData
  created_at: string
}

export interface TemplatePage {
  id: string
  template_id: string
  page_number: number
  json_data: PageData
  thumbnail_url?: string
}

// ─── Assets ───────────────────────────────────────────────────────────────────

export type AssetType = 'photo' | 'frame' | 'element' | 'texture'

export interface Asset {
  id: string
  user_id: string
  file_name: string
  file_url: string
  thumbnail_url?: string
  file_size: number
  mime_type: string
  asset_type: AssetType
  width?: number
  height?: number
  created_at: string
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export type ExportType = 'jpg' | 'pdf'
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Export {
  id: string
  album_id: string
  user_id: string
  export_type: ExportType
  size: AlbumSize
  dpi: number
  status: ExportStatus
  download_url?: string
  file_size?: number
  error_message?: string
  payment_id?: string
  created_at: string
  updated_at: string
  album?: Pick<Album, 'id' | 'title' | 'category'>
}

export interface CreateExportRequest {
  album_id: string
  export_type: ExportType
  size: AlbumSize
  dpi: 300
  payment_id?: string
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  created_at: number
}

export interface CreateOrderRequest {
  amount: number
  currency: string
  purpose: 'export' | 'subscription'
  album_id?: string
  export_type?: ExportType
  plan_id?: PlanId
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  purpose: 'export' | 'subscription'
  album_id?: string
  export_type?: ExportType
  plan_id?: PlanId
}

export interface Payment {
  id: string
  user_id: string
  razorpay_order_id: string
  razorpay_payment_id?: string
  amount: number
  currency: string
  status: 'created' | 'paid' | 'failed'
  purpose: 'export' | 'subscription'
  created_at: string
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    per_page: number
    last_page: number
  }
  success: boolean
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status_code: number
}

// ─── Razorpay ─────────────────────────────────────────────────────────────────

export interface RazorpayOptions {
  key: string
  amount?: number
  currency?: string
  name: string
  description?: string
  order_id?: string
  subscription_id?: string
  handler: (response: RazorpayResponse) => void
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string
  }
  modal?: {
    ondismiss?: () => void
  }
}

export interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void }
  }
}
