import { supabase } from '../supabase.js'

export class RequestsApiController {
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*, users!requests_owner_id_fkey(id, full_name, avatar_url, category, units)')
        .order('request_date', { ascending: false })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async getByOwner(ownerId) {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*, users!requests_owner_id_fkey(id, full_name, avatar_url, category, units)')
        .eq('owner_id', ownerId)
        .order('request_date', { ascending: false })

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
        category: payload.category || 'Personal Withdrawal',
        amount: Number(payload.amount || 0),
        status: payload.status || 'Pending',
        request_date: payload.request_date || payload.date || new Date().toISOString().split('T')[0],
        note: payload.note || '',
        signature_url: payload.signature_url || null,
        receipt_photo_url: payload.receipt_photo_url || null,
        pool_value: payload.pool_value !== undefined ? Number(payload.pool_value) : null,
        policy_label: payload.policy_label || 'Standard Owner Allowance',
        policy_check: payload.policy_check || 'Within limit'
      }

      if (payload.ref_code) {
        record.ref_code = payload.ref_code
      }

      const { data, error } = await supabase
        .from('requests')
        .insert(record)
        .select('*, users!requests_owner_id_fkey(id, full_name, avatar_url, category, units)')
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
        .from('requests')
        .update(updates)
        .eq('id', id)
        .select('*, users!requests_owner_id_fkey(id, full_name, avatar_url, category, units)')
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async updateStatus(id, status, adminNote = null, reviewedBy = null) {
    try {
      const updates = { status }
      if (adminNote !== null) updates.admin_note = adminNote
      if (reviewedBy !== null) updates.reviewed_by = reviewedBy

      const { data, error } = await supabase
        .from('requests')
        .update(updates)
        .eq('id', id)
        .select('*, users!requests_owner_id_fkey(id, full_name, avatar_url, category, units)')
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
        .from('requests')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Critical Pool Calculation Logic:
   * Net Balance = Gross Habwa - Bill Deductions - Approved Requests (ONLY Approved subtracts; Pending does NOT)
   */
  async calculateOwnerPool(ownerId) {
    try {
      // 1. Gross Habwa Harvest
      const { data: habwaData } = await supabase
        .from('habwa_logs')
        .select('amount')
        .eq('owner_id', ownerId)

      const grossHabwa = (habwaData || []).reduce((acc, h) => acc + Number(h.amount || 0), 0)

      // 2. Bills Deductions (Find all bills that include ownerId in breakdown or owner_ids)
      const { data: billsData } = await supabase
        .from('bills')
        .select('detailed_breakdown, owner_ids, total_amount')
        .contains('owner_ids', [ownerId])

      let totalBillShare = 0
      ;(billsData || []).forEach((b) => {
        const breakdown = Array.isArray(b.detailed_breakdown) ? b.detailed_breakdown : []
        const ownerItem = breakdown.find((item) => item.owner_id === ownerId)
        if (ownerItem && ownerItem.shareAmount) {
          totalBillShare += Number(ownerItem.shareAmount)
        } else if (b.owner_ids && b.owner_ids.length > 0) {
          totalBillShare += Number(b.total_amount || 0) / b.owner_ids.length
        }
      })

      // 3. Approved Requests ONLY (Pending requests DO NOT subtract)
      const { data: approvedRequests } = await supabase
        .from('requests')
        .select('amount')
        .eq('owner_id', ownerId)
        .eq('status', 'Approved')

      const approvedDeductions = (approvedRequests || []).reduce((acc, r) => acc + Number(r.amount || 0), 0)

      const netPool = Math.max(0, grossHabwa - totalBillShare - approvedDeductions)
      return {
        grossHabwa,
        totalBillShare,
        approvedDeductions,
        netPool: Number(netPool.toFixed(2)),
        netBalance: Number(netPool.toFixed(2))
      }
    } catch {
      return { grossHabwa: 0, totalBillShare: 0, approvedDeductions: 0, netPool: 0, netBalance: 0 }
    }
  }

  subscribeToOwnerRequests(ownerId, onUpdate) {
    const channelName = `realtime-requests-${ownerId || 'portal'}-${Date.now()}`
    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        (payload) => {
          // If event is DELETE, payload.new is null and payload.old may only have id unless full replica identity is set.
          // Trigger onUpdate to re-evaluate loadFromSupabase()
          if (!ownerId || payload.eventType === 'DELETE' || payload.new?.owner_id === ownerId || payload.old?.owner_id === ownerId) {
            onUpdate(payload)
          }
        }
      )
      .subscribe()
  }

  // ==========================================
  // Request Categories Management (Supabase DB)
  // ==========================================
  async getCategories() {
    try {
      const { data, error } = await supabase
        .from('request_categories')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      return { success: false, error: err.message, data: [] }
    }
  }

  async addCategory(name, createdBy = null) {
    try {
      const trimmed = (name || '').trim()
      if (!trimmed) throw new Error('Category name cannot be empty')

      const { data, error } = await supabase
        .from('request_categories')
        .insert({
          name: trimmed,
          ...(createdBy ? { created_by: createdBy } : {})
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async updateCategory(idOrOldName, newName) {
    try {
      const trimmed = (newName || '').trim()
      if (!trimmed) throw new Error('Category name cannot be empty')

      const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrOldName)
      let query = supabase.from('request_categories').update({ name: trimmed, updated_at: new Date().toISOString() })

      if (isUuid) {
        query = query.eq('id', idOrOldName)
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
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(idOrName)
      let query = supabase.from('request_categories').delete()

      if (isUuid) {
        query = query.eq('id', idOrName)
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
      .channel('realtime-request-categories')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'request_categories'
        },
        (payload) => onUpdate(payload)
      )
      .subscribe()
  }

  subscribeToAllRequests(onInsertOrUpdate) {
    const channelName = `realtime-admin-requests-${Date.now()}`
    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests'
        },
        (payload) => onInsertOrUpdate(payload)
      )
      .subscribe()
  }
}

export const requestsApi = new RequestsApiController()
