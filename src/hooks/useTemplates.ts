import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import type { Template, ApiResponse, PaginatedResponse, AlbumCategory, AlbumSize } from '@/types'

export interface CreateTemplatePayload {
  name: string
  category: AlbumCategory
  size: AlbumSize
  is_premium: boolean
  price?: number
  pages_count: number
  json_data: object
}

interface TemplatesParams {
  page?: number
  per_page?: number
  category?: AlbumCategory | 'all'
  search?: string
  is_premium?: boolean
}

export function useTemplates(params?: TemplatesParams) {
  const cleanParams = { ...params }
  if (cleanParams.category === 'all') delete cleanParams.category

  return useQuery({
    queryKey: ['templates', cleanParams],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Template>>('/templates', {
        params: { ...cleanParams, include_data: true },
      })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Template>>(`/templates/${id}`)
      return res.data.data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAdminCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      const res = await apiClient.post<{ message: string; template: Template }>(
        '/admin/templates',
        payload
      )
      return res.data.template
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}

export function useAdminDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/templates/${id}`)
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] })
    },
  })
}
