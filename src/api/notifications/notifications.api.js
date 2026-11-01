import { supabase } from '../supabase.js'

export class NotificationsApiController {
  async getByUser(userId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch {
      return { success: false, data: [] }
    }
  }

  async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return { success: true, count: count || 0 }
    } catch {
      return { success: false, count: 0 }
    }
  }

  async markAsRead(id) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async create(payload) {
    try {
      const record = {
        user_id: payload.user_id,
        type: payload.type || 'request',
        title: payload.title,
        message: payload.message,
        ref_id: payload.ref_id || null,
        ref_table: payload.ref_table || null,
        is_read: false
      }
      const { data, error } = await supabase
        .from('notifications')
        .insert(record)
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async markAllAsRead(userId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  subscribeToUserNotifications(userId, onNotification) {
    return supabase
      .channel(`realtime-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => onNotification(payload)
      )
      .subscribe()
  }
}

export const notificationsApi = new NotificationsApiController()
