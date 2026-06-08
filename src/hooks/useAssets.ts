import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import apiClient, { getApiError } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import type { Asset, PaginatedResponse, AssetType } from '@/types'

interface AssetsParams {
  page?: number
  per_page?: number
  folder?: string
  search?: string
  mime_type?: string
  asset_type?: AssetType
}

export function useAssets(params?: AssetsParams) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const res = await apiClient.get('/assets', { params })
      // API may return paginated wrapper or plain array
      return (res.data as PaginatedResponse<Asset>)?.data !== undefined
        ? (res.data as PaginatedResponse<Asset>)
        : { data: res.data as Asset[], meta: { total: 0, page: 1, per_page: 30, last_page: 1 }, success: true }
    },
    staleTime: 1000 * 30,
  })
}

// ─── Direct upload (POST /assets/upload, multipart) ──────────────────────────

interface UploadAssetOptions {
  folder?: string
}

export function useUploadAsset(options?: UploadAssetOptions) {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()
  const folder = options?.folder ?? 'photos'

  return useMutation({
    mutationFn: async (files: File[]) => {
      const results: Asset[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)
        const res = await apiClient.post('/assets/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        results.push(res.data?.data ?? res.data)
      }
      return results
    },
    onSuccess: (assets) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      addToast({
        title: `${assets.length} photo${assets.length > 1 ? 's' : ''} uploaded`,
        variant: 'success',
      })
    },
    onError: (error) => {
      addToast({ title: 'Upload failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

// ─── Presign upload (presign → PUT to S3 × 3 → confirm) ─────────────────────

interface PresignVariant {
  upload_url: string
  s3_key: string
  headers: Record<string, string>
}

interface PresignResponse {
  expires_at: string
  original: PresignVariant
  thumb: PresignVariant
  large: PresignVariant
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (!file.type.startsWith('image/')) return { width: 0, height: 0 }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ width: 0, height: 0 }) }
    img.src = url
  })
}

async function s3Put(uploadUrl: string, file: File, contentType: string): Promise<string> {
  const res = await axios.put(uploadUrl, file, { headers: { 'Content-Type': contentType } })
  return (res.headers['etag'] as string | undefined)?.replace(/"/g, '') ?? ''
}

async function presignAndUpload(file: File): Promise<Asset> {
  // 1. POST /assets/presign
  const presignRes = await apiClient.post('/assets/presign', {
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  })
  const p: PresignResponse = presignRes.data?.data ?? presignRes.data

  if (!p?.original?.upload_url) {
    console.error('[presign] Unexpected response shape:', presignRes.data)
    throw new Error('Presign response missing original.upload_url')
  }

  // 2. Upload to all 3 presigned URLs using each variant's signed Content-Type
  const [{ width, height }, originalEtag, thumbEtag, largeEtag] = await Promise.all([
    getImageDimensions(file),
    s3Put(p.original.upload_url, file, p.original.headers['Content-Type'] ?? file.type),
    s3Put(p.thumb.upload_url,    file, p.thumb.headers['Content-Type']    ?? file.type),
    s3Put(p.large.upload_url,    file, p.large.headers['Content-Type']    ?? file.type),
  ])

  // 3. POST /assets/confirm
  const confirmRes = await apiClient.post('/assets/confirm', {
    filename: file.name,
    filemime: file.type,
    file_size: file.size,
    width,
    height,
    multipart: {
      status: 'complete',
      variants: [
        { size: 'original', key: p.original.s3_key, bytes: file.size, parts: [{ partNumber: 1, etag: originalEtag }] },
        { size: 'thumb',    key: p.thumb.s3_key,    bytes: file.size, parts: [{ partNumber: 1, etag: thumbEtag }] },
        { size: 'large',    key: p.large.s3_key,    bytes: file.size, parts: [{ partNumber: 1, etag: largeEtag }] },
      ],
    },
  })
  return confirmRes.data?.data ?? confirmRes.data
}

export function usePresignUpload(options?: { silent?: boolean }) {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (files: File[]) => {
      const results = await Promise.all(files.map(presignAndUpload))
      return results
    },
    onSuccess: (assets) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      if (!options?.silent) {
        addToast({
          title: `${assets.length} photo${assets.length > 1 ? 's' : ''} uploaded`,
          variant: 'success',
        })
      }
    },
    onError: (error) => {
      if (!options?.silent) {
        addToast({ title: 'Upload failed', description: getApiError(error), variant: 'destructive' })
      }
    },
  })
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/assets/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      addToast({ title: 'Photo deleted', variant: 'success' })
    },
    onError: (error) => {
      addToast({ title: 'Failed to delete photo', description: getApiError(error), variant: 'destructive' })
    },
  })
}
