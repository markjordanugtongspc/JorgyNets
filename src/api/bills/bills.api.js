import { supabase } from '../supabase.js'

export class BillsApiController {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('bill_date', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async getByOwner(ownerId) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .contains('owner_ids', [ownerId])
        .order('bill_date', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async create(payload) {
    try {
      const record = {
        category: payload.category || 'General Operational Expense',
        description: payload.description || payload.desc || 'Operational Expense Allocation',
        owner_ids: Array.isArray(payload.owner_ids) ? payload.owner_ids : [],
        total_amount: Number(payload.total_amount ?? payload.amount ?? 0),
        detailed_breakdown: payload.detailed_breakdown || payload.detailedBreakdown || [],
        attendant: payload.attendant || 'Admin Leo',
        status: payload.status || 'Audited',
        bill_date: payload.bill_date || payload.date || new Date().toISOString().split('T')[0],
        notes: payload.notes || ''
      }

      if (payload.ref_code || payload.id) {
        record.ref_code = payload.ref_code || payload.id
      } else {
        // Auto-increment bill ref if not provided
        record.ref_code = `bil-${Date.now().toString().slice(-4)}`
      }

      const { data, error } = await supabase
        .from('bills')
        .insert(record)
        .select('*')
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
        .from('bills')
        .update(updates)
        .eq('id', id)
        .select('*')
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
        .from('bills')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

export const billsApi = new BillsApiController()
