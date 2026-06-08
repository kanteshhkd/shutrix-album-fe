import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { getApiError } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import type { Export, ApiResponse, PaginatedResponse, CreateExportRequest } from '@/types'

export interface ExportDownloadResponse {
  download_url: string
  expires_at?: string
}

export function useExports(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ['exports', params],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Export>>('/exports', { params })
      return res.data
    },
    staleTime: 1000 * 30,
    refetchInterval: (query) => {
      // Poll if any exports are pending/processing
      const data = query.state.data
      if (!data) return false
      const hasPending = data.data.some(
        (e) => e.status === 'pending' || e.status === 'processing'
      )
      return hasPending ? 5000 : false
    },
  })
}

export function useCreateExport() {
  const queryClient = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (data: CreateExportRequest) => {
      const res = await apiClient.post<ApiResponse<Export>>('/exports', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] })
      addToast({
        title: 'Export queued',
        description: "We'll notify you when your export is ready",
        variant: 'success',
      })
    },
    onError: (error) => {
      addToast({ title: 'Export failed', description: getApiError(error), variant: 'destructive' })
    },
  })
}

export function useExportStatus(exportId: string | null) {
  return useQuery({
    queryKey: ['export', exportId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Export>>(`/exports/${exportId}`)
      return res.data.data
    },
    enabled: !!exportId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'pending' || status === 'processing') return 3000
      return false
    },
  })
}

export function useExportDownload() {
  return useMutation({
    mutationFn: async (exportId: string): Promise<ExportDownloadResponse> => {
      const res = await apiClient.get<ApiResponse<ExportDownloadResponse>>(`/exports/${exportId}/download`)
      return res.data.data ?? res.data
    },
  })
}
