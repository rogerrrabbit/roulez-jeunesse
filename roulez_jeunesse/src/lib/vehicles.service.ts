import { supabase } from './supabase'
import type { Vehicle, VehicleInsert, VehicleUpdate } from './database.types'

export const vehicleService = {
  async getAll(userId: string): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async create(vehicle: VehicleInsert): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicle)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: VehicleUpdate): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async updateMileage(id: string, mileage: number): Promise<Vehicle> {
    return this.update(id, { current_mileage: mileage })
  }
}
