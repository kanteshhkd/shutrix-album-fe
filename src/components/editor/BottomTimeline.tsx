'use client'

import { useState } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, Trash2, Copy, MoreHorizontal } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function BottomTimeline() {
  const {
    pages,
    currentPageIndex,
    setCurrentPage,
    addPage,
    deletePage,
    duplicatePage,
    reorderPages,
  } = useEditorStore()

  const [contextMenuPage, setContextMenuPage] = useState<number | null>(null)

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const fromIndex = result.source.index
    const toIndex = result.destination.index
    if (fromIndex === toIndex) return
    reorderPages(fromIndex, toIndex)
  }

  return (
    <div className="h-[104px] bg-surface-elevated border-t border-border flex items-center px-3 gap-2 overflow-x-auto scrollbar-thin shrink-0">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="timeline" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex items-center gap-2"
            >
              {pages.map((page, index) => (
                <Draggable key={String(page.id)} draggableId={String(page.id)} index={index}>
                  {(drag, snapshot) => (
                    <div
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      {...drag.dragHandleProps}
                      className={cn(
                        'relative group flex flex-col items-center gap-1 cursor-pointer select-none',
                        snapshot.isDragging && 'z-50'
                      )}
                      onClick={() => setCurrentPage(index)}
                    >
                      {/* Thumbnail */}
                      <div
                        className={cn(
                          'w-[120px] h-[80px] rounded-md overflow-hidden border-2 transition-all relative',
                          currentPageIndex === index
                            ? 'border-primary shadow-lg shadow-primary/20'
                            : 'border-border hover:border-primary/50',
                          snapshot.isDragging && 'shadow-2xl scale-105'
                        )}
                        style={{
                          backgroundColor: page.json_data.background_color || '#1a1a1a',
                        }}
                      >
                        {/* Mini representation of the page */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground/50 font-mono">
                            {index + 1}
                          </span>
                        </div>

                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-foreground hover:bg-muted/80"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => duplicatePage(index)}>
                                <Copy className="h-3.5 w-3.5 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deletePage(index)}
                                disabled={pages.length <= 1}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Page number */}
                      <span className={cn(
                        'text-[10px] font-medium tabular-nums',
                        currentPageIndex === index ? 'text-primary' : 'text-muted-foreground'
                      )}>
                        {index + 1}
                      </span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add page button */}
      <button
        onClick={addPage}
        className="flex flex-col items-center justify-center w-[120px] h-[80px] rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all text-muted-foreground hover:text-foreground shrink-0"
      >
        <Plus className="h-5 w-5 mb-1" />
        <span className="text-[10px]">Add Page</span>
      </button>
    </div>
  )
}
