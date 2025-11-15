import { create } from 'zustand'
import { Annotation, AnnotationType } from '../types'

interface AnnotationStore {
  // 当前标注
  currentAnnotation: Annotation | null
  setCurrentAnnotation: (annotation: Annotation | null) => void
  updateCurrentAnnotation: (updates: Partial<Annotation>) => void

  // 标注类型
  annotationType: AnnotationType
  setAnnotationType: (type: AnnotationType) => void

  // 图片
  currentImage: string | null
  setCurrentImage: (image: string | null) => void

  // 历史记录(用于撤销/重做)
  history: Annotation[]
  historyIndex: number
  addToHistory: (annotation: Annotation) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // 重置
  reset: () => void
}

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  currentAnnotation: null,
  annotationType: AnnotationType.TEXT,
  currentImage: null,
  history: [],
  historyIndex: -1,

  setCurrentAnnotation: (annotation) => set({ currentAnnotation: annotation }),

  updateCurrentAnnotation: (updates) =>
    set((state) => ({
      currentAnnotation: state.currentAnnotation
        ? { ...state.currentAnnotation, ...updates }
        : null
    })),

  setAnnotationType: (type) => set({ annotationType: type }),

  setCurrentImage: (image) => set({ currentImage: image }),

  addToHistory: (annotation) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(annotation)
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
        currentAnnotation: annotation
      }
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1
        return {
          historyIndex: newIndex,
          currentAnnotation: state.history[newIndex]
        }
      }
      return state
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1
        return {
          historyIndex: newIndex,
          currentAnnotation: state.history[newIndex]
        }
      }
      return state
    }),

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  reset: () =>
    set({
      currentAnnotation: null,
      currentImage: null,
      history: [],
      historyIndex: -1
    })
}))
