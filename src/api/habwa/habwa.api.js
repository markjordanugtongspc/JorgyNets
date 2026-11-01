import { supabase } from '../supabase.js'

export class HabwaApiController {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('habwa_logs')
        .select('*, users(id, full_name, avatar_url, category, units)')
        .order('harvested_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async getByOwner(ownerId) {
    try {
      const { data, error } = await supabase
        .from('habwa_logs')
        .select('*, users(id, full_name, avatar_url, category, units)')
        .eq('owner_id', ownerId)
        .order('harvested_at', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async create(payload) {
    try {
      const record = {
        owner_id: payload.owner_id,
        description: payload.description || payload.desc || 'Coin Box Habwa Collection',
        category: payload.category || 'Dual Coin Slot',
        amount: Number(payload.amount || 0),
        coins_breakdown: payload.coins_breakdown || payload.coins || '',
        attendant: payload.attendant || 'Admin Leo',
        status: payload.status || 'Audited',
        harvested_at: payload.harvested_at || payload.date || new Date().toISOString()
      }

      if (payload.ref_code) {
        record.ref_code = payload.ref_code
      }

      const { data, error } = await supabase
        .from('habwa_logs')
        .insert(record)
        .select('*, users(id, full_name, avatar_url, category, units)')
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('habwa_logs')
        .update(updates)
        .eq('id', id)
        .select('*, users(id, full_name, avatar_url, category, units)')
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async delete(id) {
    try {
      const { error } = await supabase
        .from('habwa_logs')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

export const habwaApi = new HabwaApiController()
