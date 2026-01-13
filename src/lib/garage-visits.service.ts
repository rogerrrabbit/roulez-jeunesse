import { supabase } from './supabase'
import type { 
  GarageVisit, 
  GarageVisitInsert, 
  GarageVisitUpdate, 
  GarageVisitWithItems,
  MaintenanceRecordInsert 
} from './database.types'

export const garageVisitService = {
  async getAll(userId: string): Promise<GarageVisit[]> {
    const { data, error } = await supabase
      .from('garage_visits')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getByVehicle(vehicleId: string): Promise<GarageVisit[]> {
    const { data, error } = await supabase
      .from('garage_visits')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<GarageVisit | null> {
    const { data, error } = await supabase
      .from('garage_visits')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async getWithItems(id: string): Promise<GarageVisitWithItems | null> {
    const { data: visit, error: visitError } = await supabase
      .from('garage_visits')
      .select('*')
      .eq('id', id)
      .single()
    
    if (visitError) throw visitError
    if (!visit) return null

    const { data: items, error: itemsError } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('visit_id', id)
      .order('created_at', { ascending: true })
    
    if (itemsError) throw itemsError

    return {
      ...visit,
      items: items || []
    }
  },

  async getAllWithItems(userId: string): Promise<GarageVisitWithItems[]> {
    const { data: visits, error: visitsError } = await supabase
      .from('garage_visits')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    if (visitsError) throw visitsError
    if (!visits || visits.length === 0) return []

    const visitIds = visits.map(v => v.id)
    const { data: items, error: itemsError } = await supabase
      .from('maintenance_records')
      .select('*')
      .in('visit_id', visitIds)
    
    if (itemsError) throw itemsError

    return visits.map(visit => ({
      ...visit,
      items: (items || []).filter(item => item.visit_id === visit.id)
    }))
  },

  async create(visit: GarageVisitInsert): Promise<GarageVisit> {
    const { data, error } = await supabase
      .from('garage_visits')
      .insert(visit)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  /**
   * Crée une visite avec plusieurs prestations en une seule opération
   */
  async createWithItems(
    visit: GarageVisitInsert, 
    items: Omit<MaintenanceRecordInsert, 'visit_id' | 'date' | 'mileage' | 'garage_name' | 'garage_address'>[]
  ): Promise<GarageVisitWithItems> {
    // Créer la visite
    const { data: createdVisit, error: visitError } = await supabase
      .from('garage_visits')
      .insert(visit)
      .select()
      .single()
    
    if (visitError) throw visitError

    // Créer les prestations liées à la visite
    const maintenanceRecords = items.map(item => ({
      ...item,
      visit_id: createdVisit.id,
      date: visit.date,
      mileage: visit.mileage,
      garage_name: visit.garage_name,
      garage_address: visit.garage_address
    }))

    const { data: createdItems, error: itemsError } = await supabase
      .from('maintenance_records')
      .insert(maintenanceRecords)
      .select()
    
    if (itemsError) throw itemsError

    return {
      ...createdVisit,
      items: createdItems || []
    }
  },

  async update(id: string, updates: GarageVisitUpdate): Promise<GarageVisit> {
    const { data, error } = await supabase
      .from('garage_visits')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    // Les maintenance_records liés auront visit_id mis à NULL (ON DELETE SET NULL)
    const { error } = await supabase
      .from('garage_visits')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async deleteWithItems(id: string): Promise<void> {
    // D'abord supprimer les maintenance_records liés
    await supabase
      .from('maintenance_records')
      .delete()
      .eq('visit_id', id)
    
    // Puis supprimer la visite
    const { error } = await supabase
      .from('garage_visits')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
