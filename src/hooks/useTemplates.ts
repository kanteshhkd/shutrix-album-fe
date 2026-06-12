import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api'
import type { Template, ApiResponse, PaginatedResponse, AlbumCategory, AlbumSize, TemplatePurchaseOrder } from '@/types'

export interface CreateTemplatePayload {
  name: string
  category: AlbumCategory
  size: AlbumSize
  is_premium: boolean
  is_active?: boolean
  credit_cost: number
  pages_count: number
  json_data: object
  tags?: string[]
  thumbnail_url?: string
  preview_images?: string[]
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

export interface UpdateTemplatePayload {
  name?: string
  category?: AlbumCategory
  size?: AlbumSize
  is_premium?: boolean
  is_active?: boolean
  credit_cost?: number
  pages_count?: number
  json_data?: object
  tags?: string[]
  thumbnail_url?: string | null
  preview_images?: string[]
}

export function useAdminUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) => {
      const res = await apiClient.patch<{ message: string; template: Template }>(
        `/admin/templates/${id}`,
        payload
      )
      return res.data.template
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      qc.invalidateQueries({ queryKey: ['template', updated.id] })
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

export function usePurchaseTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string): Promise<TemplatePurchaseOrder> => {
      const res = await apiClient.post(`/templates/${templateId}/purchase`)
      return res.data?.data ?? res.data
    },
    onSuccess: () => {
      // Invalidate purchased templates cache
      qc.invalidateQueries({ queryKey: ['templates', 'purchased'] })
    },
  })
}

export function usePurchaseTemplateWithCredits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (templateId: string) => {
      const res = await apiClient.post(`/templates/${templateId}/purchase`)
      return res.data?.data ?? res.data
    },
    onSuccess: () => {
      // Invalidate purchased templates cache
      qc.invalidateQueries({ queryKey: ['templates', 'purchased'] })
      qc.invalidateQueries({ queryKey: ['user'] }) // to update user credits if applicable
    },
  })
}

export function usePurchasedTemplates(params?: TemplatesParams, options?: { enabled?: boolean }) {
  const cleanParams = { ...params }
  if (cleanParams.category === 'all') delete cleanParams.category

  return useQuery({
    queryKey: ['templates', 'purchased', cleanParams],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Template>>('/templates/purchased', {
        params: { ...cleanParams, include_data: true },
      })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled !== false,
  })
}
