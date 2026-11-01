import { supabase } from '../supabase.js'
import bcrypt from 'bcryptjs'

export class UsersApiController {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role_id, username, full_name, phone, avatar_url, category, units, status, created_at, roles(name, label)')
        .order('role_id', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async getOwners() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role_id, username, full_name, phone, avatar_url, category, units, status, created_at, roles(name, label)')
        .neq('role_id', 0)
        .order('role_id', { ascending: true })
        .order('full_name', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role_id, username, full_name, phone, avatar_url, category, units, status, created_at, roles(name, label)')
        .eq('id', id)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch {
      return { success: false, data: null }
    }
  }

  async create(payload) {
    try {
      const password = payload.password || '@JorgyPisonets#123'
      const passwordHash = bcrypt.hashSync(password, 12)

      const { data, error } = await supabase
        .from('users')
        .insert({
          role_id: payload.role_id ?? 1,
          username: payload.username.trim().toLowerCase(),
          password_hash: passwordHash,
          full_name: payload.full_name || payload.name,
          phone: payload.phone || null,
          category: payload.category || 'Standard Pisonet',
          units: payload.units || '1 Unit',
          status: payload.status || 'Pending',
          avatar_url: payload.avatar_url || payload.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          ...(payload.created_at || payload.dateCreated ? { created_at: new Date(payload.created_at || payload.dateCreated).toISOString() } : {})
        })
        .select('id, role_id, username, full_name, phone, avatar_url, category, units, status, created_at')
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async update(id, updates) {
    try {
      const allowedCols = ['role_id', 'username', 'password_hash', 'full_name', 'phone', 'avatar_url', 'category', 'units', 'status', 'created_at']
      const safeUpdates = {}

      for (const [key, val] of Object.entries(updates)) {
        if (key === 'password' && val) {
          safeUpdates.password_hash = bcrypt.hashSync(val, 12)
        } else if (key === 'name' && val !== undefined) {
          safeUpdates.full_name = val
        } else if (key === 'avatar' && val !== undefined) {
          safeUpdates.avatar_url = val
        } else if (key === 'dateCreated' && val !== undefined) {
          safeUpdates.created_at = new Date(val).toISOString()
        } else if (allowedCols.includes(key) && val !== undefined) {
          safeUpdates[key] = val
        }
      }

      const { data, error } = await supabase
        .from('users')
        .update(safeUpdates)
        .eq('id', id)
        .select('id, role_id, username, full_name, phone, avatar_url, category, units, status, created_at, updated_at')
        .single()

      if (error) {
        console.error('[UsersApi] Update error:', error)
        throw error
      }
      return { success: true, data }
    } catch (err) {
      console.error('[UsersApi] Update failed:', err)
      return { success: false, error: err.message }
    }
  }

  async verifyPassword(id, plainPassword) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, password_hash')
        .eq('id', id)
        .single()

      if (error || !user || !user.password_hash) {
        return { success: false, error: 'User record not found.' }
      }

      const isMatch = bcrypt.compareSync(plainPassword, user.password_hash)
      return { success: isMatch }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async delete(id) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

export const usersApi = new UsersApiController()

