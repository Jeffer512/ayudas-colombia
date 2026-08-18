import '@testing-library/jest-dom/vitest'

class MemoryStorage {
  private readonly data = new Map<string, string>()

  get length() {
    return this.data.size
  }
  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null
  }
  getItem(key: string) {
    return this.data.get(String(key)) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(String(key), String(value))
  }
  removeItem(key: string) {
    this.data.delete(String(key))
  }
  clear() {
    this.data.clear()
  }
}

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  writable: true,
  value: new MemoryStorage(),
})