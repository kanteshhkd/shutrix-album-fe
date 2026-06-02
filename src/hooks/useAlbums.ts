import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient, { getApiError } from '@/lib/api'
import { useUIStore } from '@/store/uiStore'
import type {
  Album,
  Page,
  ApiResponse,
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
