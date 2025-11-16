/**
 * 快捷键管理器
 * 集中管理所有快捷键，支持冲突检测和动态绑定
 */

import type { HotkeyConfig } from './types'

export class HotkeyManager {
  private hotkeys: Map<string, HotkeyConfig> = new Map()
  private enabled = true

  constructor() {
    this.setupGlobalListener()
  }

  /**
   * 注册快捷键
   */
  register(config: HotkeyConfig): void {
    const key = this.formatKey(config)

    if (this.hotkeys.has(key)) {
      console.warn(`Hotkey ${key} already registered, will be overwritten`)
    }

    this.hotkeys.set(key, config)
  }

  /**
   * 批量注册快捷键
   */
  registerBatch(configs: HotkeyConfig[]): void {
    configs.forEach(config => this.register(config))
  }

  /**
   * 注销快捷键
   */
  unregister(key: string): void {
    this.hotkeys.delete(key)
  }

  /**
   * 启用/禁用快捷键
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * 获取所有快捷键
   */
  getAll(): HotkeyConfig[] {
    return Array.from(this.hotkeys.values())
  }

  /**
   * 按类别获取快捷键
   */
  getByCategory(category: string): HotkeyConfig[] {
    return this.getAll().filter(h => h.category === category)
  }

  /**
   * 格式化快捷键
   */
  private formatKey(config: HotkeyConfig): string {
    const parts: string[] = []
    if (config.ctrl) parts.push('Ctrl')
    if (config.shift) parts.push('Shift')
    if (config.alt) parts.push('Alt')
    parts.push(config.key.toUpperCase())
    return parts.join('+')
  }

  /**
   * 检查按键匹配
   */
  private matchKey(e: KeyboardEvent, config: HotkeyConfig): boolean {
    const keyMatch = e.key.toUpperCase() === config.key.toUpperCase()
    const ctrlMatch = !!config.ctrl === (e.ctrlKey || e.metaKey)
    const shiftMatch = !!config.shift === e.shiftKey
    const altMatch = !!config.alt === e.altKey

    return keyMatch && ctrlMatch && shiftMatch && altMatch
  }

  /**
   * 全局键盘监听
   */
  private setupGlobalListener(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.enabled) return

      // 忽略输入框内的快捷键
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      for (const config of this.hotkeys.values()) {
        if (this.matchKey(e, config)) {
          e.preventDefault()
          e.stopPropagation()
          config.action()
          break
        }
      }
    })
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.hotkeys.clear()
  }
}

// 单例实例
export const hotkeyManager = new HotkeyManager()

/**
 * React Hook for hotkeys
 */
export function useHotkeys(configs: HotkeyConfig[], deps: any[] = []) {
  React.useEffect(() => {
    configs.forEach(config => hotkeyManager.register(config))
    return () => {
      configs.forEach(config => {
        const key = config.ctrl ? 'Ctrl+' : '' +
                    config.shift ? 'Shift+' : '' +
                    config.alt ? 'Alt+' : '' +
                    config.key.toUpperCase()
        hotkeyManager.unregister(key)
      })
    }
  }, deps)
}
