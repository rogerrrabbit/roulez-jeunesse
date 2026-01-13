import { supabase } from './supabase'
import type { MaintenanceRecord, MaintenanceRecordInsert, MaintenanceRecordUpdate } from './database.types'

export const maintenanceService = {
  async getAll(userId: string): Promise<MaintenanceRecord[]> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getByVehicle(vehicleId: string): Promise<MaintenanceRecord[]> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<MaintenanceRecord | null> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async create(record: MaintenanceRecordInsert): Promise<MaintenanceRecord> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert(record)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: MaintenanceRecordUpdate): Promise<MaintenanceRecord> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async getTotalCost(vehicleId: string): Promise<number> {
    const records = await this.getByVehicle(vehicleId)
    return records.reduce((total, record) => total + record.cost, 0)
  }
}

export const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Vidange' },
  { value: 'tire_change', label: 'Changement de pneus' },
  { value: 'brake_service', label: 'Freins' },
  { value: 'battery', label: 'Batterie' },
  { value: 'timing_belt', label: 'Courroie de distribution' },
  { value: 'filters', label: 'Filtres' },
  { value: 'spark_plugs', label: 'Bougies' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'exhaust', label: 'Échappement' },
  { value: 'clutch', label: 'Embrayage' },
  { value: 'gearbox', label: 'Boîte de vitesses' },
  { value: 'cooling', label: 'Refroidissement' },
  { value: 'electrical', label: 'Électrique' },
  { value: 'bodywork', label: 'Carrosserie' },
  { value: 'inspection', label: 'Contrôle technique' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'other', label: 'Autre' }
]
