import { supabase } from './supabase'
import type { Reminder, ReminderInsert, ReminderUpdate } from './database.types'

export const reminderService = {
  async getAll(userId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async getByVehicle(vehicleId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('due_date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async getPending(userId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('due_date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async getUpcoming(userId: string, days: number = 30): Promise<Reminder[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async create(reminder: ReminderInsert): Promise<Reminder> {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminder)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: ReminderUpdate): Promise<Reminder> {
    const { data, error } = await supabase
      .from('reminders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async markComplete(id: string): Promise<Reminder> {
    return this.update(id, { is_completed: true })
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const REMINDER_PRIORITIES = [
  { value: 'low', label: 'Basse', color: 'badge-info' },
  { value: 'medium', label: 'Moyenne', color: 'badge-warning' },
  { value: 'high', label: 'Haute', color: 'badge-danger' }
]
