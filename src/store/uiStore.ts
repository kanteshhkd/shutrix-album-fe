import { create } from 'zustand'

interface Modal {
  id: string
  props?: Record<string, unknown>
}

interface UIState {
  sidebarOpen: boolean
  activeModal: Modal | null
  toasts: Toast[]

  openSidebar: () => void
  closeSidebar: () => void
  toggleSidebar: () => void

  openModal: (id: string, props?: Record<string, unknown>) => void
  closeModal: () => void

  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  toasts: [],

  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  openModal: (id, props) => set({ activeModal: { id, props } }),
  closeModal: () => set({ activeModal: null }),

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 11)
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
