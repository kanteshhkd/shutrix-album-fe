import { create } from 'zustand'
import type { Page, CanvasElement } from '@/types'
import { deepClone } from '@/lib/utils'

const MAX_HISTORY = 50

export interface HistoryEntry {
  pages: Page[]
  currentPageIndex: number
}

export type EditorTool = 'select' | 'pan' | 'text'

interface EditorState {
  albumId: string | null
  pages: Page[]
  currentPageIndex: number
  selectedElementIds: string[]
  zoom: number
  panX: number
  panY: number
  tool: EditorTool
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  history: HistoryEntry[]
  historyIndex: number

  // Setters
  setAlbumId: (id: string) => void
  setPages: (pages: Page[]) => void
  setCurrentPage: (index: number) => void
  updateCurrentPageElements: (elements: CanvasElement[]) => void
  updatePageBackground: (color: string) => void
  selectElement: (id: string, multiSelect?: boolean) => void
  deselectAll: () => void
  addElement: (element: CanvasElement) => void
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  deleteSelectedElements: () => void
  duplicateSelectedElements: () => void
  addPage: () => void
  deletePage: (index: number) => void
  duplicatePage: (index: number) => void
  reorderPages: (fromIndex: number, toIndex: number) => void
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  setTool: (tool: EditorTool) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  setDirty: (isDirty: boolean) => void
  setSaving: (isSaving: boolean) => void
  setLastSavedAt: (date: Date) => void
  reset: () => void
}

const defaultPage = (): Omit<Page, 'id' | 'album_id' | 'created_at' | 'updated_at'> => ({
  page_number: 1,
  json_data: {
    width: 3600,
    height: 1200,
    background_color: '#1a1a1a',
    elements: [],
  },
})

export const useEditorStore = create<EditorState>((set, get) => ({
  albumId: null,
  pages: [],
  currentPageIndex: 0,
  selectedElementIds: [],
  zoom: 1,
  panX: 0,
  panY: 0,
  tool: 'select',
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  history: [],
  historyIndex: -1,

  setAlbumId: (id) => set({ albumId: id }),

  setPages: (pages) => {
    set({ pages, currentPageIndex: 0, selectedElementIds: [] })
    // Init history
    const entry: HistoryEntry = { pages: deepClone(pages), currentPageIndex: 0 }
    set({ history: [entry], historyIndex: 0 })
  },

  setCurrentPage: (index) => {
    const { pages } = get()
    if (index >= 0 && index < pages.length) {
      set({ currentPageIndex: index, selectedElementIds: [] })
    }
  },

  updateCurrentPageElements: (elements) => {
    const { pages, currentPageIndex } = get()
    const updated = deepClone(pages)
    if (updated[currentPageIndex]) {
      updated[currentPageIndex].json_data.elements = elements
    }
    set({ pages: updated, isDirty: true })
  },

  updatePageBackground: (color) => {
    const { pages, currentPageIndex } = get()
    const updated = deepClone(pages)
    if (updated[currentPageIndex]) {
      updated[currentPageIndex].json_data.background_color = color
    }
    set({ pages: updated, isDirty: true })
  },

  selectElement: (id, multiSelect = false) => {
    const { selectedElementIds } = get()
    if (multiSelect) {
      if (selectedElementIds.includes(id)) {
        set({ selectedElementIds: selectedElementIds.filter((eid) => eid !== id) })
      } else {
        set({ selectedElementIds: [...selectedElementIds, id] })
      }
    } else {
      set({ selectedElementIds: [id] })
    }
  },

  deselectAll: () => set({ selectedElementIds: [] }),

  addElement: (element) => {
    const { pages, currentPageIndex } = get()
    const updated = deepClone(pages)
    if (updated[currentPageIndex]) {
      updated[currentPageIndex].json_data.elements.push(element)
    }
    set({ pages: updated, isDirty: true, selectedElementIds: [element.id] })
  },

  updateElement: (id, updates) => {
    const { pages, currentPageIndex } = get()
    const updated = deepClone(pages)
    if (updated[currentPageIndex]) {
      const elements = updated[currentPageIndex].json_data.elements
      const idx = elements.findIndex((el) => el.id === id)
      if (idx !== -1) {
        Object.assign(elements[idx], updates)
      }
    }
    set({ pages: updated, isDirty: true })
  },

  deleteSelectedElements: () => {
    const { pages, currentPageIndex, selectedElementIds } = get()
    if (!selectedElementIds.length) return
    get().pushHistory()
    const updated = deepClone(pages)
    if (updated[currentPageIndex]) {
      updated[currentPageIndex].json_data.elements = updated[
        currentPageIndex
      ].json_data.elements.filter((el) => !selectedElementIds.includes(el.id))
    }
    set({ pages: updated, selectedElementIds: [], isDirty: true })
  },

  duplicateSelectedElements: () => {
    const { pages, currentPageIndex, selectedElementIds } = get()
    if (!selectedElementIds.length) return
    const updated = deepClone(pages)
    const page = updated[currentPageIndex]
    if (!page) return
    const newIds: string[] = []
    const newElements: CanvasElement[] = []
    page.json_data.elements.forEach((el) => {
      if (selectedElementIds.includes(el.id)) {
        const clone = deepClone(el)
        clone.id = Math.random().toString(36).substring(2, 11)
        clone.x += 20
        clone.y += 20
        newIds.push(clone.id)
        newElements.push(clone)
      }
    })
    page.json_data.elements.push(...newElements)
    set({ pages: updated, selectedElementIds: newIds, isDirty: true })
  },

  addPage: () => {
    const { pages } = get()
    const album_id = get().albumId || ''
    const newPage: Page = {
      id: `temp_${Math.random().toString(36).substring(2, 11)}`,
      album_id,
      page_number: pages.length + 1,
      json_data: {
        width: pages[0]?.json_data.width || 3600,
        height: pages[0]?.json_data.height || 1200,
        background_color: '#1a1a1a',
        elements: [],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const updated = [...pages, newPage]
    set({ pages: updated, currentPageIndex: updated.length - 1, isDirty: true })
  },

  deletePage: (index) => {
    const { pages, currentPageIndex } = get()
    if (pages.length <= 1) return
    const updated = pages.filter((_, i) => i !== index)
    const newIndex = Math.min(currentPageIndex, updated.length - 1)
    set({ pages: updated, currentPageIndex: newIndex, isDirty: true })
  },

  duplicatePage: (index) => {
    const { pages } = get()
    const page = pages[index]
    if (!page) return
    const clone = deepClone(page)
    clone.id = `temp_${Math.random().toString(36).substring(2, 11)}`
    clone.page_number = index + 2
    const updated = [
      ...pages.slice(0, index + 1),
      clone,
      ...pages.slice(index + 1),
    ]
    set({ pages: updated, currentPageIndex: index + 1, isDirty: true })
  },

  reorderPages: (fromIndex, toIndex) => {
    const { pages } = get()
    const updated = deepClone(pages)
    const [moved] = updated.splice(fromIndex, 1)
    updated.splice(toIndex, 0, moved)
    updated.forEach((p, i) => (p.page_number = i + 1))
    set({ pages: updated, currentPageIndex: toIndex, isDirty: true })
  },

  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 4) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  setTool: (tool) => set({ tool }),

  pushHistory: () => {
    const { pages, currentPageIndex, history, historyIndex } = get()
    const entry: HistoryEntry = {
      pages: deepClone(pages),
      currentPageIndex,
    }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(entry)
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    const entry = history[newIndex]
    if (!entry) return
    set({
      pages: deepClone(entry.pages),
      currentPageIndex: entry.currentPageIndex,
      historyIndex: newIndex,
      selectedElementIds: [],
      isDirty: true,
    })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    const entry = history[newIndex]
    if (!entry) return
    set({
      pages: deepClone(entry.pages),
      currentPageIndex: entry.currentPageIndex,
      historyIndex: newIndex,
      selectedElementIds: [],
      isDirty: true,
    })
  },

  setDirty: (isDirty) => set({ isDirty }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),

  reset: () =>
    set({
      albumId: null,
      pages: [],
      currentPageIndex: 0,
      selectedElementIds: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      tool: 'select',
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      history: [],
      historyIndex: -1,
    }),
}))
