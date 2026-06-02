'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PlusCircle, LayoutTemplate, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateAlbum, useCreateAlbumFromTemplate } from '@/hooks/useAlbums'
import { useTemplates } from '@/hooks/useTemplates'
import { ALBUM_CATEGORIES, ALBUM_SIZES } from '@/lib/utils'
import type { AlbumCategory, AlbumSize } from '@/types'
import { cn } from '@/lib/utils'

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  size: z.string().min(1, 'Please select a size'),
})

type FormData = z.infer<typeof schema>

interface CreateAlbumModalProps {
  open: boolean
  onClose: () => void
}

export function CreateAlbumModal({ open, onClose }: CreateAlbumModalProps) {
  const [mode, setMode] = useState<'blank' | 'template'>('blank')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const router = useRouter()
  const createAlbum = useCreateAlbum()
  const createFromTemplate = useCreateAlbumFromTemplate()
  const { data: templates } = useTemplates({ per_page: 12 })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'wedding', size: '12x36' },
  })

  const onSubmit = async (data: FormData) => {
    const payload = {
      title: data.title,
      category: data.category as AlbumCategory,
      size: data.size as AlbumSize,
    }

    let album
    if (mode === 'template' && selectedTemplate) {
      album = await createFromTemplate.mutateAsync({ ...payload, template_id: selectedTemplate })
    } else {
      album = await createAlbum.mutateAsync(payload)
    }

    if (album) {
      onClose()
      router.push(`/editor/${album.id}`)
    }
  }

  const isPending = createAlbum.isPending || createFromTemplate.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create New Album</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Album details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Album Title</Label>
              <Input id="title" placeholder="Rahul & Priya Wedding 2024" {...register('title')} />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={watch('category')}
                  onValueChange={(v) => setValue('category', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALBUM_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Album Size</Label>
                <Select
                  value={watch('size')}
                  onValueChange={(v) => setValue('size', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALBUM_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Mode selection */}
          <div className="space-y-3">
            <Label>Start with</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('blank')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-sm font-medium',
                  mode === 'blank'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                )}
              >
                <FileText className="h-8 w-8" />
                Blank Canvas
              </button>
              <button
                type="button"
                onClick={() => setMode('template')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-sm font-medium',
                  mode === 'template'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                )}
              >
                <LayoutTemplate className="h-8 w-8" />
                From Template
              </button>
            </div>
          </div>

          {/* Template mini-browser */}
          {mode === 'template' && (
            <div className="space-y-3">
              <Label>Choose Template</Label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                {templates?.data.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      'relative aspect-[3/1] rounded-lg overflow-hidden border-2 transition-all',
                      selectedTemplate === template.id
                        ? 'border-primary shadow-lg shadow-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    {template.thumbnail_url ? (
                      <img src={template.thumbnail_url} alt={template.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-overlay flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{template.name}</span>
                      </div>
                    )}
                    {template.is_premium && (
                      <div className="absolute top-1 right-1 bg-gold/90 text-primary-foreground text-xs px-1 rounded">
                        PRO
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              className="flex-1"
              disabled={isPending || (mode === 'template' && !selectedTemplate)}
            >
              {isPending ? 'Creating...' : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Album
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
