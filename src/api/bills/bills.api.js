import { supabase } from '../supabase.js'

export class BillsApiController {
  // ==========================================
  // Bills Categories Management (Supabase DB)
  // ==========================================
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('bills_categories')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      return { success: false, error: err.message, data: [] }
    }
  }

  async addCategory(name, color = 'blue') {
    try {
      const trimmed = (name || '').trim()
      if (!trimmed) throw new Error('Category name cannot be empty')

      // Assign smart default color based on category name if default blue is given
      let tagColor = color
      const upper = trimmed.toUpperCase()
      if (upper.includes('PLDT') || upper.includes('INTERNET') || upper.includes('FIBR') || upper.includes('CONVERGE')) {
        tagColor = 'blue'
      } else if (upper.includes('LIGHT') || upper.includes('ELECTRIC') || upper.includes('VECO') || upper.includes('POWER')) {
        tagColor = 'amber'
      } else if (upper.includes('PERIPHERAL') || upper.includes('MOUSE') || upper.includes('KEYBOARD') || upper.includes('HARDWARE')) {
        tagColor = 'purple'
      } else if (upper.includes('CLEAN') || upper.includes('CHUTE') || upper.includes('REPAIR')) {
        tagColor = 'emerald'
      } else if (upper.includes('WATER')) {
        tagColor = 'sky'
      } else if (upper.includes('MAINTENANCE') || upper.includes('STORE')) {
        tagColor = 'rose'
      }

      const { data, error } = await supabase
        .from('bills_categories')
        .insert({
          name: trimmed,
          color: tagColor
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async updateCategory(idOrOldName, newName, newColor = null) {
    try {
      const trimmed = (newName || '').trim()
      if (!trimmed) throw new Error('Category name cannot be empty')

      const updates = { name: trimmed, updated_at: new Date().toISOString() }
      if (newColor) updates.color = newColor

      const isNumericId = typeof idOrOldName === 'number' || /^\d+$/.test(idOrOldName)
      let query = supabase.from('bills_categories').update(updates)

      if (isNumericId) {
        query = query.eq('id', Number(idOrOldName))
      } else {
        query = query.eq('name', idOrOldName)
      }

      const { data, error } = await query.select().single()
      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async deleteCategory(idOrName) {
    try {
      const isNumericId = typeof idOrName === 'number' || /^\d+$/.test(idOrName)
      let query = supabase.from('bills_categories').delete()

      if (isNumericId) {
        query = query.eq('id', Number(idOrName))
      } else {
        query = query.eq('name', idOrName)
      }

      const { error } = await query
      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  subscribeToCategories(onUpdate) {
    return supabase
      .channel('realtime-bills-categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills_categories'
        },
        (payload) => onUpdate(payload)
      )
      .subscribe()
  }

  // ==========================================
  // Helper: Resolve Category Foreign Key ID
  // ==========================================
  async resolveCategoryId(categoryInput) {
    if (typeof categoryInput === 'number') return categoryInput
    if (typeof categoryInput === 'string' && /^\d+$/.test(categoryInput)) {
      return parseInt(categoryInput, 10)
    }

    const trimmed = (categoryInput || 'General Operational Expense').trim()
    
    // Check if category exists by name
    const { data: existing } = await supabase
      .from('bills_categories')
      .select('id')
      .ilike('name', trimmed)
      .limit(1)

    if (existing && existing.length > 0) {
      return existing[0].id
    }

    // Auto-create category in bills_categories if not found
    const createRes = await this.addCategory(trimmed)
    if (createRes.success && createRes.data) {
      return createRes.data.id
    }

    return 0
  }

  // ==========================================
  // Bills CRUD Operations
  // ==========================================
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, bills_categories(*)')
        .order('bill_date', { ascending: false })

      if (error) throw error

      // Transform rows to expose normalized category label and color
      const normalized = (data || []).map((b) => ({
        ...b,
        category_id: b.category,
        category: b.bills_categories?.name || 'General Bill',
        category_color: b.bills_categories?.color || 'blue'
      }))

      return { success: true, data: normalized }
    } catch {
      return { success: false, data: [] }
    }
  }

  async getByOwner(ownerId) {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*, bills_categories(*)')
        .contains('owner_ids', [ownerId])
        .order('bill_date', { ascending: false })

      if (error) throw error

      const normalized = (data || []).map((b) => ({
        ...b,
        category_id: b.category,
        category: b.bills_categories?.name || 'General Bill',
        category_color: b.bills_categories?.color || 'blue'
      }))

      return { success: true, data: normalized }
    } catch {
      return { success: false, data: [] }
    }
  }

  async create(payload) {
    try {
      const categoryId = await this.resolveCategoryId(payload.category)

      const record = {
        category: categoryId,
        description: payload.description || payload.desc || 'Operational Expense Allocation',
        owner_ids: Array.isArray(payload.owner_ids) ? payload.owner_ids : [],
        total_amount: Number(payload.total_amount ?? payload.amount ?? 0),
        detailed_breakdown: payload.detailed_breakdown || payload.detailedBreakdown || [],
        attendant: payload.attendant || 'Admin Leo',
        status: payload.status || 'Audited',
        bill_date: payload.bill_date || payload.date || new Date().toISOString().split('T')[0],
        notes: payload.notes || ''
      }

      if (payload.ref_code || payload.refCode) {
        record.ref_code = payload.ref_code || payload.refCode
      } else {
        // Auto-increment bill ref if not provided
        const { count } = await supabase.from('bills').select('*', { count: 'exact', head: true })
        const nextNum = (count || 0) + 1
        record.ref_code = `bil-${nextNum.toString().padStart(4, '0')}`
      }

      const { data, error } = await supabase
        .from('bills')
        .insert(record)
        .select('*, bills_categories(*)')
        .single()

      if (error) throw error

      const result = {
        ...data,
        category_id: data.category,
        category: data.bills_categories?.name || payload.category || 'General Bill',
        category_color: data.bills_categories?.color || 'blue'
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async update(id, updates) {
    try {
      const cleanUpdates = { ...updates }

      if (cleanUpdates.category !== undefined) {
        cleanUpdates.category = await this.resolveCategoryId(cleanUpdates.category)
      }
      cleanUpdates.updated_at = new Date().toISOString()

      const isNumericId = typeof id === 'number' || /^\d+$/.test(id)
      let query = supabase.from('bills').update(cleanUpdates)

      if (isNumericId) {
        query = query.eq('id', Number(id))
      } else {
        query = query.eq('ref_code', id)
      }

      const { data, error } = await query
        .select('*, bills_categories(*)')
        .single()

      if (error) throw error

      const result = {
        ...data,
        category_id: data.category,
        category: data.bills_categories?.name || 'General Bill',
        category_color: data.bills_categories?.color || 'blue'
      }

      return { success: true, data: result }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async delete(id) {
    try {
      const idStr = String(id).trim()

      // 1. Primary: Execute secure database function that wipes the bill, removes referencing notifications/logs, and restarts sequence when empty
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('delete_bill_and_cleanup', { p_id: idStr })
        if (!rpcErr && rpcData?.success) {
          return { success: true, remaining: rpcData.remaining }
        }
      } catch (rpcEx) {
        console.warn('[BillsApi] RPC delete_bill_and_cleanup fallback:', rpcEx)
      }

      // 2. Direct fallback query
      const isNumericId = typeof id === 'number' || /^\d+$/.test(id)
      let query = supabase.from('bills').delete()

      if (isNumericId) {
        query = query.eq('id', Number(id))
      } else {
        query = query.eq('ref_code', id)
      }

      const { error } = await query
      if (error) throw error

      // Clean notifications referencing this bill
      try {
        await supabase
          .from('notifications')
          .delete()
          .or(`ref_table.eq.bills,ref_table.eq.bill`)
          .or(`ref_id.eq.${idStr}`)
      } catch {}

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}

export const billsApi = new BillsApiController()
