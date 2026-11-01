import { supabase } from '../supabase.js'
import bcrypt from 'bcryptjs'
import { storageManager } from '../../scripts/modules/storage.js'

export class AuthApiController {
  async login(credentials, maybePassword) {
    try {
      let username, password
      if (typeof credentials === 'object' && credentials !== null) {
        username = credentials.username
        password = credentials.password
      } else {
        username = credentials
        password = maybePassword
      }

      const cleanUsername = (username || '').trim().toLowerCase()
      if (!cleanUsername || !password) {
        return { success: false, error: 'Username and password are required.' }
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*, roles(*)')
        .ilike('username', cleanUsername)
        .maybeSingle()

      if (error || !user) {
        return { success: false, field: 'username', error: 'Username is incorrect.' }
      }

      if (user.status === 'Declined') {
        return { success: false, field: 'username', error: 'Your account has been declined by the administrator.' }
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash)
      if (!isMatch) {
        return { success: false, field: 'password', error: 'Password is incorrect.' }
      }

      // Store safe session payload (never store password_hash)
      const safeUser = {
        id: user.id,
        role_id: user.role_id,
        username: user.username,
        full_name: user.full_name,
        name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        category: user.category,
        units: user.units,
        status: user.status
      }

      storageManager.session.setSession(safeUser)
      return { success: true, user: safeUser }
    } catch {
      return { success: false, error: 'An unexpected authentication error occurred.' }
    }
  }

  async register({ username, password, fullName, phone = '', category = 'Standard Pisonet', units = 'Unit 1 & 2' }) {
    try {
      const cleanUsername = (username || '').trim().toLowerCase()
      if (!cleanUsername || !password || !fullName) {
        return { success: false, error: 'All required fields must be filled.' }
      }

      // Check if username already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('username', cleanUsername)
        .maybeSingle()

      if (existing) {
        return { success: false, error: 'Username is already taken.' }
      }

      const passwordHash = bcrypt.hashSync(password, 12)

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          role_id: 1, // Owner role
          username: cleanUsername,
          password_hash: passwordHash,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          category: category.trim(),
          units: units.trim(),
          status: 'Pending',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        })
        .select('id, role_id, username, full_name, phone, category, units, status, created_at')
        .single()

      if (error || !newUser) {
        return { success: false, error: error?.message || 'Failed to register account.' }
      }

      return { success: true, user: newUser }
    } catch {
      return { success: false, error: 'Failed to process registration.' }
    }
  }

  logout(reason = null) {
    storageManager.clearAllSessionData()
    if (reason) {
      sessionStorage.setItem('jn_auth_error', reason)
    }
    window.location.href = '/index.html'
  }

  getCurrentSession() {
    return storageManager.getCurrentUser()
  }

  // START: Auth Guard Helpers
  isAuthenticated() {
    const user = storageManager.getCurrentUser()
    const rawRole = storageManager.session.getRole()
    const rawUser = storageManager.session.getUser()
    return Boolean(user && user.id && rawRole !== null && rawUser)
  }

  validateRouteAccess(currentPath = window.location.pathname) {
    const isProtected = currentPath.includes('/frontend/pages') || currentPath.includes('/frontend/users')
    if (!isProtected) {
      return { allowed: true }
    }

    if (!this.isAuthenticated()) {
      return {
        allowed: false,
        redirectTo: '/index.html',
        reason: 'Please log in to your account to access JorgyNets.'
      }
    }

    const user = storageManager.getCurrentUser()
    const isAdmin = user.isAdmin
    const isOwner = user.isOwner

    // If an owner tries to access admin-only /frontend/pages/, route to user portal
    if (isOwner && currentPath.includes('/frontend/pages')) {
      const targetUserPath = currentPath.replace('/frontend/pages/', '/frontend/users/')
      return {
        allowed: false,
        redirectTo: targetUserPath,
        reason: null
      }
    }

    // If an admin tries to access client-specific /frontend/users/, route to admin portal
    if (isAdmin && currentPath.includes('/frontend/users')) {
      const targetAdminPath = currentPath.replace('/frontend/users/', '/frontend/pages/')
      return {
        allowed: false,
        redirectTo: targetAdminPath,
        reason: null
      }
    }

    return { allowed: true }
  }

  enforceAuthGuard() {
    const validation = this.validateRouteAccess()
    if (!validation.allowed) {
      if (validation.reason) {
        sessionStorage.setItem('jn_auth_error', validation.reason)
      }
      window.location.replace(validation.redirectTo)
      return false
    }
    return true
  }
}

export const authApi = new AuthApiController()

