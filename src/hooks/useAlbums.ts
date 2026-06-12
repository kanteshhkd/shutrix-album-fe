import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import apiClient, { getApiError } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import type {
  Album,
  Page,
  PaginatedResponse,
  AlbumCategory,
  AlbumSize,
} from '@/types'

interface AlbumsParams {
  page?: number
  per_page?: number
  search?: string
  category?: AlbumCategory
}

export function useAlbums(params?: AlbumsParams) {
  return useQuery({
    queryKey: ['albums', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Album>>('/albums', { params })
      return res.data
    },
    staleTime: 1000 * 30,
  })
}

export function useAlbum(id: string | null) {
  return useQuery({
    queryKey: ['album', id],
    queryFn: async () => {
      const res = await apiClient.get<{ album: Album; pages: Page[] }>(`/albums/${id}`)
      return res.data.album
    },
    enabled: !!id,
    staleTime: 1000 * 60,
  })
}

export function useAlbumPages(albumId: string | null) {
  return useQuery({
    queryKey: ['albumPages', albumId],
    queryFn: async () => {
      const res = await apiClient.get<{ pages: Page[] }>(`/albums/${albumId}/pages`)
      return res.data.pages
    },
    enabled: !!albumId,
    staleTime: 0,
  })
}

export function useCreateAlbum() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (data: {
      title: string
      category: AlbumCategory
      size: AlbumSize
      template_id?: string
    }) => {
      const res = await apiClient.post<{ message: string; album: Album }>('/albums', data)
      return res.data.album
    },
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      addToast({ title: 'Album created', description: album.title, variant: 'success' })
    },
    onError: (error) => {
      addToast({ title: 'Failed to create album', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useCreateAlbumFromTemplate() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (data: {
      title: string
      category: AlbumCategory
      size: AlbumSize
      template_id: string
    }) => {
      const res = await apiClient.post<{ message: string; album: Album }>('/albums/from-template', data)
      return res.data.album
    },
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      addToast({ title: 'Album created from template', description: album.title, variant: 'success' })
    },
    onError: (error) => {
      addToast({ title: 'Failed to create album', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Album> & { id: string }) => {
      const res = await apiClient.put<{ message: string; album: Album }>(`/albums/${id}`, data)
      return res.data.album
    },
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      queryClient.setQueryData(['album', album.id], album)
    },
    onError: (error) => {
      addToast({ title: 'Failed to update album', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/albums/${id}`)
      return id
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      queryClient.removeQueries({ queryKey: ['album', id] })
      addToast({ title: 'Album deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ title: 'Failed to delete album', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useDuplicateAlbum() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ message: string; album: Album }>(`/albums/${id}/duplicate`)
      return res.data.album
    },
    onSuccess: (album) => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
      addToast({ title: 'Album duplicated', description: album.title, variant: 'success' })
    },
    onError: (error) => {
      addToast({ title: 'Failed to duplicate album', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useUpdatePage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      albumId,
      pageId,
      data,
    }: {
      albumId: string
      pageId: string
      data: Partial<Page>
    }) => {
      const res = await apiClient.put<{ message: string; page: Page }>(
        `/albums/${albumId}/pages/${pageId}`,
        data
      )
      return res.data.page
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ['albumPages', page.album_id] })
    },
  })
}

export function useShutrixAlbums() {
  return useQuery({
    queryKey: ['shutrixAlbums'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Album>>('/albums/shutrix')
      return res.data
    },
    staleTime: 1000 * 30,
  })
}

export interface ShutrixPhoto {
  media_id: string
  fid: string
  filename: string
  mime_type: string
  size: number
  images: {
    thumb: string
    medium: string
    large: string
    original: string
  }
}

export function useShutrixAlbumPhotos(albumId: number | null, offset = 0, limit = 25) {
  return useQuery({
    queryKey: ['shutrixAlbumPhotos', albumId, offset, limit],
    queryFn: async () => {
      const res = await apiClient.get(
        `/albums/${albumId}/shutrix-details`,
        { params: { offset, limit } },
      )
      // Shape: { data: { album_id, title, media_count, media: [...] } }
      const d = res.data?.data
      return {
        media: (d?.media ?? []) as ShutrixPhoto[],
        media_count: (d?.media_count ?? 0) as number,
      }
    },
    enabled: albumId !== null,
    staleTime: 1000 * 30,
  })
}

interface ShutrixPresignVariant {
  size: string
  key: string
  uploadId: string
  parts: Array<{ partNumber: number; url: string }>
}

// Resize an image file and encode as WebP.
// maxDim = null keeps the original dimensions.
function resizeToWebP(file: File, maxDim: number | null, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (maxDim && (w > maxDim || h > maxDim)) {
        if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim }
        else { w = Math.round(w * maxDim / h); h = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No 2D context'))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/webp',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed')) }
    img.src = objectUrl
  })
}

export function useShutrixAlbumUpload(albumId: number | null) {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (files: File[]) => {
      const results = []
      for (const file of files) {
        // Convert to WebP at each required size in parallel
        const [thumbBlob, mediumBlob, largeBlob, originalBlob] = await Promise.all([
          resizeToWebP(file, 800),    // thumb  800×800 max
          resizeToWebP(file, 1200),   // medium 1200×1200 max
          resizeToWebP(file, 1600),   // large  1600×1600 max
          resizeToWebP(file, null),   // original — full resolution
        ])

        const blobMap: Record<string, Blob> = {
          thumb: thumbBlob,
          medium: mediumBlob,
          large: largeBlob,
          original: originalBlob,
        }

        // 1. Presign — get per-variant S3 upload URLs
        const presignRes = await apiClient.post(
          `/albums/${albumId}/upload-to-shutrix/presign`,
          { filename: file.name, filemime: 'image/webp', size: file.size },
        )
        const variants: ShutrixPresignVariant[] = presignRes.data?.variants ?? []

        // 2. PUT each WebP blob to its S3 URL and collect ETags
        const uploadedVariants = await Promise.all(
          variants.map(async (variant) => {
            const blob = blobMap[variant.size] ?? originalBlob
            const part = variant.parts[0]
            const res = await axios.put(part.url, blob, {
              headers: { 'Content-Type': 'image/webp' },
            })
            const etag = (res.headers['etag'] as string | undefined)?.replace(/"/g, '') ?? ''
            return {
              size: variant.size,
              key: variant.key,
              uploadId: variant.uploadId,
              parts: [{ partNumber: 1, etag, bytes: blob.size }],
            }
          }),
        )

        // 3. Confirm upload
        const webpName = file.name.replace(/\.[^.]+$/, '.webp')
        const confirmRes = await apiClient.post(
          `/albums/${albumId}/upload-to-shutrix/confirm`,
          {
            filename: webpName,
            filemime: 'image/webp',
            size: originalBlob.size,
            variants: uploadedVariants,
          },
        )
        results.push(confirmRes.data?.data ?? confirmRes.data)
      }
      return results
    },
    onSuccess: (_data, files) => {
      queryClient.invalidateQueries({ queryKey: ['shutrixAlbumPhotos', albumId] })
      addToast({
        title: `${files.length} photo${files.length > 1 ? 's' : ''} uploaded`,
        variant: 'success',
      })
    },
    onError: (error) => {
      addToast({ title: 'Upload failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

