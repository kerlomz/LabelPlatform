import { create } from 'zustand'
import type { User } from '../types'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  loadAuth: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null, isAuthenticated: false })
  },

  loadAuth: () => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ user, token, isAuthenticated: true })
      } catch (e) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
  },
}))
