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
  },

  /**
   * Récupère le dernier entretien effectué pour un type et un véhicule donnés
   */
  async getLastByType(vehicleId: string, maintenanceType: string): Promise<MaintenanceRecord | null> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('type', maintenanceType)
      .order('date', { ascending: false })
      .order('mileage', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (error) throw error
    return data
  },

  /**
   * Récupère les derniers entretiens par type pour un véhicule (optimisé pour charger tous les types en une requête)
   */
  async getLastByTypeForVehicle(vehicleId: string): Promise<Record<string, MaintenanceRecord>> {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
      .order('mileage', { ascending: false })
    
    if (error) throw error
    
    // Grouper par type et garder seulement le plus récent
    const lastByType: Record<string, MaintenanceRecord> = {}
    for (const record of data || []) {
      if (!lastByType[record.type]) {
        lastByType[record.type] = record
      }
    }
    return lastByType
  }
}

export const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Vidange' },
  { value: 'oil_filter', label: 'Filtre à huile' },
  { value: 'air_filter', label: 'Filtre à air' },
  { value: 'cabin_filter', label: 'Filtre habitacle' },
  { value: 'fuel_filter', label: 'Filtre à carburant' },
  { value: 'tire_change', label: 'Changement de pneus' },
  { value: 'tire_rotation', label: 'Rotation des pneus' },
  { value: 'wheel_alignment', label: 'Géométrie / Parallélisme' },
  { value: 'wheel_balancing', label: 'Équilibrage des roues' },
  { value: 'brake_pads_front', label: 'Plaquettes de frein avant' },
  { value: 'brake_pads_rear', label: 'Plaquettes de frein arrière' },
  { value: 'brake_discs_front', label: 'Disques de frein avant' },
  { value: 'brake_discs_rear', label: 'Disques de frein arrière' },
  { value: 'brake_fluid', label: 'Liquide de frein' },
  { value: 'brake_service', label: 'Freins (autre)' },
  { value: 'battery', label: 'Batterie' },
  { value: 'timing_belt', label: 'Courroie de distribution' },
  { value: 'accessory_belt', label: 'Courroie d\'accessoire' },
  { value: 'spark_plugs', label: 'Bougies d\'allumage' },
  { value: 'glow_plugs', label: 'Bougies de préchauffage' },
  { value: 'coolant', label: 'Liquide de refroidissement' },
  { value: 'coolant_hoses', label: 'Durites de refroidissement' },
  { value: 'radiator', label: 'Radiateur' },
  { value: 'thermostat', label: 'Thermostat' },
  { value: 'water_pump', label: 'Pompe à eau' },
  { value: 'power_steering_fluid', label: 'Liquide de direction assistée' },
  { value: 'transmission_fluid', label: 'Huile de boîte de vitesses' },
  { value: 'clutch', label: 'Embrayage' },
  { value: 'gearbox', label: 'Boîte de vitesses' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'shock_absorbers', label: 'Amortisseurs' },
  { value: 'springs', label: 'Ressorts' },
  { value: 'ball_joints', label: 'Rotules' },
  { value: 'tie_rods', label: 'Biellettes de direction' },
  { value: 'exhaust', label: 'Échappement' },
  { value: 'catalytic_converter', label: 'Catalyseur' },
  { value: 'dpf_cleaning', label: 'Nettoyage FAP' },
  { value: 'egr_valve', label: 'Vanne EGR' },
  { value: 'ac_service', label: 'Climatisation' },
  { value: 'ac_recharge', label: 'Recharge clim' },
  { value: 'wiper_blades', label: 'Balais d\'essuie-glace' },
  { value: 'headlight_bulbs', label: 'Ampoules phares' },
  { value: 'electrical', label: 'Électrique (autre)' },
  { value: 'bodywork', label: 'Carrosserie' },
  { value: 'windshield', label: 'Pare-brise' },
  { value: 'inspection', label: 'Contrôle technique' },
  { value: 'pre_inspection', label: 'Pré-contrôle technique' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'other', label: 'Autre' }
]
