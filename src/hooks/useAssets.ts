import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { getApiError } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import type { Asset, ApiResponse, PaginatedResponse, AssetType } from '@/types'

interface AssetsParams {
  page?: number
  per_page?: number
  asset_type?: AssetType
}

export function useAssets(params?: AssetsParams) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Asset>>('/assets', { params })
      return res.data
    },
    staleTime: 1000 * 30,
  })
}

export function useUploadAsset() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((file) => formData.append('files', file))
      const res = await apiClient.post<ApiResponse<Asset[]>>('/assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data.data
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
