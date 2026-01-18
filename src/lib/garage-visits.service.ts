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
   * @param existingRecordIds - IDs des entretiens existants à rattacher à cette visite
   */
  async createWithItems(
    visit: GarageVisitInsert, 
    items: Omit<MaintenanceRecordInsert, 'visit_id' | 'date' | 'mileage' | 'garage_name' | 'garage_address'>[],
    existingRecordIds: string[] = []
  ): Promise<GarageVisitWithItems> {
    // Créer la visite
    const { data: createdVisit, error: visitError } = await supabase
      .from('garage_visits')
      .insert(visit)
      .select()
      .single()
    
    if (visitError) throw visitError

    let allItems: any[] = []

    // Créer les nouvelles prestations liées à la visite
    if (items.length > 0) {
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
      allItems = createdItems || []
    }

    // Rattacher les entretiens existants à cette visite
    if (existingRecordIds.length > 0) {
      const { error: attachError } = await supabase
        .from('maintenance_records')
        .update({
          visit_id: createdVisit.id,
          date: visit.date,
          mileage: visit.mileage,
          garage_name: visit.garage_name,
          garage_address: visit.garage_address,
          updated_at: new Date().toISOString()
        })
        .in('id', existingRecordIds)
      
      if (attachError) throw attachError

      // Récupérer les entretiens rattachés
      const { data: attachedItems, error: fetchError } = await supabase
        .from('maintenance_records')
        .select('*')
        .in('id', existingRecordIds)
      
      if (fetchError) throw fetchError
      allItems = [...allItems, ...(attachedItems || [])]
    }

    return {
      ...createdVisit,
      items: allItems
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

  /**
   * Met à jour une visite avec ses prestations
   * @param id - ID de la visite à modifier
   * @param visit - Données mises à jour de la visite
   * @param newItems - Nouvelles prestations à créer
   * @param existingItemIds - IDs des prestations existantes à conserver (les autres seront détachées)
   * @param attachRecordIds - IDs des entretiens existants à rattacher à cette visite
   */
  async updateWithItems(
    id: string,
    visit: GarageVisitUpdate,
    newItems: Omit<MaintenanceRecordInsert, 'visit_id' | 'date' | 'mileage' | 'garage_name' | 'garage_address'>[],
    existingItemIds: string[],
    attachRecordIds: string[] = []
  ): Promise<GarageVisitWithItems> {
    // Mettre à jour la visite
    const { data: updatedVisit, error: visitError } = await supabase
      .from('garage_visits')
      .update({ ...visit, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (visitError) throw visitError

    // Récupérer les items actuellement liés à cette visite
    const { data: currentItems } = await supabase
      .from('maintenance_records')
      .select('id')
      .eq('visit_id', id)
    
    const currentItemIds = (currentItems || []).map(item => item.id)
    
    // Détacher les items qui ne sont plus dans la liste (visit_id = null)
    const itemsToDetach = currentItemIds.filter(itemId => !existingItemIds.includes(itemId))
    if (itemsToDetach.length > 0) {
      await supabase
        .from('maintenance_records')
        .update({ visit_id: null, updated_at: new Date().toISOString() })
        .in('id', itemsToDetach)
    }

    // Mettre à jour les items conservés avec les nouvelles infos de la visite
    if (existingItemIds.length > 0) {
      await supabase
        .from('maintenance_records')
        .update({
          date: visit.date,
          mileage: visit.mileage,
          garage_name: visit.garage_name,
          garage_address: visit.garage_address,
          updated_at: new Date().toISOString()
        })
        .in('id', existingItemIds)
    }

    // Créer les nouvelles prestations
    if (newItems.length > 0) {
      const maintenanceRecords = newItems.map(item => ({
        ...item,
        visit_id: id,
        date: visit.date,
        mileage: visit.mileage,
        garage_name: visit.garage_name,
        garage_address: visit.garage_address
      }))

      const { error: itemsError } = await supabase
        .from('maintenance_records')
        .insert(maintenanceRecords)
        .select()
      
      if (itemsError) throw itemsError
    }

    // Rattacher les entretiens existants (qui n'étaient pas déjà liés)
    if (attachRecordIds.length > 0) {
      await supabase
        .from('maintenance_records')
        .update({
          visit_id: id,
          date: visit.date,
          mileage: visit.mileage,
          garage_name: visit.garage_name,
          garage_address: visit.garage_address,
          updated_at: new Date().toISOString()
        })
        .in('id', attachRecordIds)
    }

    // Récupérer tous les items finaux
    const { data: finalItems, error: fetchError } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('visit_id', id)
    
    if (fetchError) throw fetchError

    return {
      ...updatedVisit,
      items: finalItems || []
    }
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
