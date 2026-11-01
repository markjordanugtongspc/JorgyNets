/**
 * OOP Storage Architecture for JorgyNets
 * Provides BaseStorageController with specialized subcontrollers:
 * - SessionStorageController
 * - LocalStorageController
 * - CookieStorageController
 * - CacheStorageController
 * - DatabaseStorageCoordinator
 */

export class BaseStorageController {
  constructor(namespace = 'jn_') {
    this.namespace = namespace
  }

  prefixKey(key) {
    return `${this.namespace}${key}`
  }

  set(key, value) {
    throw new Error('Method "set" must be implemented by subclass')
  }

  get(key, defaultValue = null) {
    throw new Error('Method "get" must be implemented by subclass')
  }

  remove(key) {
    throw new Error('Method "remove" must be implemented by subclass')
  }

  clear() {
    throw new Error('Method "clear" must be implemented by subclass')
  }
}

export class SessionStorageController extends BaseStorageController {
  constructor() {
    super('jn_session_')
  }

  set(key, value) {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value)
      sessionStorage.setItem(this.prefixKey(key), serialized)
      return true
    } catch {
      return false
    }
  }

  get(key, defaultValue = null) {
    try {
      const raw = sessionStorage.getItem(this.prefixKey(key))
      if (raw === null) return defaultValue
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    } catch {
      return defaultValue
    }
  }

  remove(key) {
    try {
      sessionStorage.removeItem(this.prefixKey(key))
      return true
    } catch {
      return false
    }
  }

  clear() {
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(this.namespace)) {
          sessionStorage.removeItem(k)
        }
      })
      // Also clear legacy keys without namespace prefix if any
      sessionStorage.removeItem('jn_session_role')
      sessionStorage.removeItem('jn_session_user')
      sessionStorage.removeItem('jn_session_user_id')
      sessionStorage.removeItem('jn_session_username')
      sessionStorage.removeItem('jn_session_units')
      sessionStorage.removeItem('jn_session_avatar')
      return true
    } catch {
      return false
    }
  }

  // Convenience getters for auth session state
  getRole() {
    return this.get('role') || sessionStorage.getItem('jn_session_role') || null
  }

  getUser() {
    return this.get('user') || sessionStorage.getItem('jn_session_user') || null
  }

  getUserId() {
    return this.get('user_id') || sessionStorage.getItem('jn_session_user_id') || null
  }

  getUsername() {
    return this.get('username') || sessionStorage.getItem('jn_session_username') || null
  }

  setSession(user) {
    if (!user) return
    const roleStr = String(user.role_id ?? (user.role === 'admin' ? 0 : 1))
    this.set('role', roleStr)
    this.set('user', user.full_name || user.name)
    this.set('user_id', user.id)
    this.set('username', user.username)
    this.set('units', user.units || '')
    this.set('avatar', user.avatar_url || user.avatar || '')

    // Legacy compatibility for existing scripts
    sessionStorage.setItem('jn_session_role', roleStr)
    sessionStorage.setItem('jn_session_user', user.full_name || user.name)
    sessionStorage.setItem('jn_session_user_id', user.id)
    sessionStorage.setItem('jn_session_username', user.username)
  }
}

export class LocalStorageController extends BaseStorageController {
  constructor() {
    super('jn_local_')
  }

  set(key, value) {
    try {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value)
      localStorage.setItem(this.prefixKey(key), serialized)
      return true
    } catch {
      return false
    }
  }

  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(this.prefixKey(key))
      if (raw === null) return defaultValue
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    } catch {
      return defaultValue
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this.prefixKey(key))
      return true
    } catch {
      return false
    }
  }

  clear() {
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(this.namespace)) {
          localStorage.removeItem(k)
        }
      })
      return true
    } catch {
      return false
    }
  }
}

export class CookieStorageController extends BaseStorageController {
  constructor() {
    super('jn_ck_')
  }

  set(key, value, days = 7) {
    try {
      const d = new Date()
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
      const expires = `expires=${d.toUTCString()}`
      const val = encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : String(value))
      document.cookie = `${this.prefixKey(key)}=${val};${expires};path=/;SameSite=Strict;Secure`
      return true
    } catch {
      return false
    }
  }

  get(key, defaultValue = null) {
    try {
      const name = `${this.prefixKey(key)}=`
      const decoded = decodeURIComponent(document.cookie)
      const parts = decoded.split(';')
      for (let i = 0; i < parts.length; i++) {
        let c = parts[i].trim()
        if (c.indexOf(name) === 0) {
          const val = c.substring(name.length)
          try {
            return JSON.parse(val)
          } catch {
            return val
          }
        }
      }
      return defaultValue
    } catch {
      return defaultValue
    }
  }

  remove(key) {
    try {
      document.cookie = `${this.prefixKey(key)}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;Secure`
      return true
    } catch {
      return false
    }
  }

  clear() {
    try {
      const decoded = decodeURIComponent(document.cookie)
      const parts = decoded.split(';')
      parts.forEach((p) => {
        const eqIdx = p.indexOf('=')
        const key = eqIdx > -1 ? p.substr(0, eqIdx).trim() : p.trim()
        if (key.startsWith(this.namespace)) {
          document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict;Secure`
        }
      })
      return true
    } catch {
      return false
    }
  }
}

export class CacheStorageController extends BaseStorageController {
  constructor(defaultTtlMs = 60000) {
    super('jn_mem_')
    this.memoryCache = new Map()
    this.defaultTtl = defaultTtlMs
  }

  set(key, value, ttlMs = this.defaultTtl) {
    const expiresAt = Date.now() + ttlMs
    this.memoryCache.set(this.prefixKey(key), { value, expiresAt })
    return true
  }

  get(key, defaultValue = null) {
    const item = this.memoryCache.get(this.prefixKey(key))
    if (!item) return defaultValue
    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(this.prefixKey(key))
      return defaultValue
    }
    return item.value
  }

  remove(key) {
    return this.memoryCache.delete(this.prefixKey(key))
  }

  clear() {
    this.memoryCache.clear()
    return true
  }
}

export class DatabaseStorageCoordinator {
  constructor() {
    this.session = new SessionStorageController()
    this.local = new LocalStorageController()
    this.cookie = new CookieStorageController()
    this.cache = new CacheStorageController()
  }

  // Quick lookup helper for active authenticated user
  getCurrentUser() {
    return {
      id: this.session.getUserId(),
      username: this.session.getUsername(),
      fullName: this.session.getUser(),
      roleId: Number(this.session.getRole() ?? -1),
      isAdmin: this.session.getRole() === '0',
      isOwner: this.session.getRole() !== null && this.session.getRole() !== '0'
    }
  }

  clearAllSessionData() {
    this.session.clear()
    this.cache.clear()
  }
}

export const storageManager = new DatabaseStorageCoordinator()
