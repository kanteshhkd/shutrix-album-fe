import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function debounce<T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const ALBUM_CATEGORIES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'pre_wedding', label: 'Pre Wedding' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'haldi', label: 'Haldi' },
  { value: 'mehndi', label: 'Mehndi' },
  { value: 'reception', label: 'Reception' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'minimal', label: 'Minimal' },
] as const

export const ALBUM_SIZES = [
  { value: '12x36', label: '12×36 inches' },
  { value: '12x30', label: '12×30 inches' },
  { value: '10x24', label: '10×24 inches' },
] as const

export const ALBUM_SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '12x36': { width: 3600, height: 1200 },
  '12x30': { width: 3000, height: 1200 },
  '10x24': { width: 2400, height: 1000 },
}

export const WEDDING_FONTS = [
  // Script & Calligraphy
  'Great Vibes',
  'Dancing Script',
  'Pinyon Script',
  'Alex Brush',
  'Allura',
  'Satisfy',
  'Sacramento',
  'Kaushan Script',
  'Rouge Script',
  'Pacifico',
  // Serif
  'Playfair Display',
  'Cormorant Garamond',
  'Cinzel',
  'EB Garamond',
  'Libre Baskerville',
  'Lora',
  'Crimson Text',
  'Gilda Display',
  'Bodoni Moda',
  'Cardo',
  // Sans-serif
  'Raleway',
  'Montserrat',
  'Josefin Sans',
  'Nunito',
  'Poppins',
  'Lato',
  'Inter',
  'Work Sans',
  'Quicksand',
  'Open Sans',
  // Display
  'Abril Fatface',
  'Bebas Neue',
  'Oswald',
  'Righteous',
  // System
  'Georgia',
  'Times New Roman',
  'Arial',
] as const

export const FONT_CATEGORIES = [
  { label: 'Script & Calligraphy', fonts: ['Great Vibes', 'Dancing Script', 'Pinyon Script', 'Alex Brush', 'Allura', 'Satisfy', 'Sacramento', 'Kaushan Script', 'Rouge Script', 'Pacifico'] },
  { label: 'Serif', fonts: ['Playfair Display', 'Cormorant Garamond', 'Cinzel', 'EB Garamond', 'Libre Baskerville', 'Lora', 'Crimson Text', 'Bodoni Moda', 'Cardo'] },
  { label: 'Sans-serif', fonts: ['Raleway', 'Montserrat', 'Josefin Sans', 'Nunito', 'Poppins', 'Lato', 'Inter', 'Work Sans', 'Quicksand', 'Open Sans'] },
  { label: 'Display', fonts: ['Abril Fatface', 'Bebas Neue', 'Oswald', 'Righteous', 'Gilda Display'] },
] as const

export const FONT_WEIGHTS = [
  { value: '100', label: 'Thin' },
  { value: '200', label: 'Extra Light' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'SemiBold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' },
] as const
