import { supabase } from './supabase'
import { maintenanceService } from './maintenance.service'
import type { 
  MaintenanceSchedule, 
  MaintenanceScheduleInsert, 
  MaintenanceScheduleUpdate,
  MaintenanceStatus,
  Vehicle,
  MaintenanceRecord
} from './database.types'

export const maintenanceScheduleService = {
  async getAll(userId: string): Promise<MaintenanceSchedule[]> {
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('maintenance_type', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async getByVehicle(vehicleId: string): Promise<MaintenanceSchedule[]> {
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('is_active', true)
      .order('maintenance_type', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<MaintenanceSchedule | null> {
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async create(schedule: MaintenanceScheduleInsert): Promise<MaintenanceSchedule> {
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .insert(schedule)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: MaintenanceScheduleUpdate): Promise<MaintenanceSchedule> {
    const { data, error } = await supabase
      .from('maintenance_schedules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_schedules')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  /**
   * Marque un entretien comme effectué
   */
  async markAsDone(id: string, date: string, mileage: number): Promise<MaintenanceSchedule> {
    return this.update(id, {
      last_done_date: date,
      last_done_mileage: mileage
    })
  },

  /**
   * Calcule le statut d'un calendrier d'entretien
   * lastRecord: optionnel, dernier entretien de ce type depuis maintenance_records
   * Si fourni, il est utilisé en priorité sur les champs last_done_* du schedule
   */
  calculateStatus(
    schedule: MaintenanceSchedule, 
    vehicle: Vehicle, 
    lastRecord?: MaintenanceRecord | null
  ): MaintenanceStatus {
    const today = new Date()
    const currentMileage = vehicle.current_mileage
    
    let nextDueDate: string | null = null
    let nextDueMileage: number | null = null
    let daysUntilDue: number | null = null
    let kmUntilDue: number | null = null
    let status: 'ok' | 'due_soon' | 'overdue' = 'ok'

    // Utiliser les données du lastRecord si disponible, sinon les champs du schedule
    let lastDoneDate = lastRecord?.date || schedule.last_done_date
    let lastDoneMileage = lastRecord?.mileage ?? schedule.last_done_mileage

    // Si jamais fait, utiliser la date de mise en service / achat du véhicule
    // et 0 km comme point de départ pour le calcul
    const neverDone = lastDoneDate === null && lastDoneMileage === null
    if (neverDone) {
      // Pour la date : utiliser purchase_date ou le 1er janvier de l'année du véhicule
      if (vehicle.purchase_date) {
        lastDoneDate = vehicle.purchase_date
      } else if (vehicle.year) {
        lastDoneDate = `${vehicle.year}-01-01`
      }
      // Pour le kilométrage : partir de 0
      lastDoneMileage = 0
    }

    // Calcul par kilométrage
    if (schedule.interval_km && lastDoneMileage !== null) {
      nextDueMileage = lastDoneMileage + schedule.interval_km
      kmUntilDue = nextDueMileage - currentMileage
      
      if (kmUntilDue <= 0) {
        status = 'overdue'
      } else if (kmUntilDue <= schedule.interval_km * 0.1) { // 10% avant échéance
        status = 'due_soon'
      }
    }

    // Calcul par date
    if (schedule.interval_months && lastDoneDate) {
      const lastDate = new Date(lastDoneDate)
      const dueDate = new Date(lastDate)
      dueDate.setMonth(dueDate.getMonth() + schedule.interval_months)
      nextDueDate = dueDate.toISOString().split('T')[0]
      
      const timeDiff = dueDate.getTime() - today.getTime()
      daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
      
      if (daysUntilDue <= 0) {
        status = 'overdue'
      } else if (daysUntilDue <= 30) { // 30 jours avant échéance
        if (status !== 'overdue') status = 'due_soon'
      }
    }

    return {
      schedule,
      status,
      nextDueDate,
      nextDueMileage,
      daysUntilDue,
      kmUntilDue,
      lastRecord: lastRecord || null
    }
  },

  /**
   * Obtient le statut de tous les entretiens d'un véhicule
   * Récupère automatiquement les derniers entretiens depuis maintenance_records
   */
  async getVehicleMaintenanceStatus(vehicle: Vehicle): Promise<MaintenanceStatus[]> {
    const [schedules, lastRecordsByType] = await Promise.all([
      this.getByVehicle(vehicle.id),
      maintenanceService.getLastByTypeForVehicle(vehicle.id)
    ])
    
    return schedules.map(schedule => {
      const lastRecord = lastRecordsByType[schedule.maintenance_type] || null
      return this.calculateStatus(schedule, vehicle, lastRecord)
    })
  },

  /**
   * Crée les calendriers d'entretien par défaut pour un nouveau véhicule
   */
  async createDefaultSchedules(vehicleId: string, userId: string): Promise<MaintenanceSchedule[]> {
    const defaults = DEFAULT_MAINTENANCE_SCHEDULES.map(schedule => ({
      ...schedule,
      vehicle_id: vehicleId,
      user_id: userId
    }))

    const { data, error } = await supabase
      .from('maintenance_schedules')
      .insert(defaults)
      .select()
    
    if (error) throw error
    return data || []
  }
}

// Calendriers d'entretien par défaut (valeurs courantes)
export const DEFAULT_MAINTENANCE_SCHEDULES: Omit<MaintenanceScheduleInsert, 'vehicle_id' | 'user_id'>[] = [
  {
    maintenance_type: 'oil_change',
    name: 'Vidange huile moteur + filtre',
    interval_km: 15000,
    interval_months: 12,
    notes: 'Inclut le remplacement du filtre à huile'
  },
  {
    maintenance_type: 'air_filter',
    name: 'Filtre à air',
    interval_km: 30000,
    interval_months: 24,
    notes: 'À vérifier plus souvent en environnement poussiéreux'
  },
  {
    maintenance_type: 'cabin_filter',
    name: 'Filtre habitacle',
    interval_km: 20000,
    interval_months: 12,
    notes: 'Filtre pollen / climatisation'
  },
  {
    maintenance_type: 'brake_pads_front',
    name: 'Plaquettes de frein avant',
    interval_km: 30000,
    interval_months: null,
    notes: 'Vérifier l\'usure régulièrement'
  },
  {
    maintenance_type: 'brake_pads_rear',
    name: 'Plaquettes de frein arrière',
    interval_km: 50000,
    interval_months: null,
    notes: 'Usure plus lente que les plaquettes avant'
  },
  {
    maintenance_type: 'brake_fluid',
    name: 'Liquide de frein',
    interval_km: null,
    interval_months: 24,
    notes: 'Remplacement tous les 2 ans - hygroscopique'
  },
  {
    maintenance_type: 'coolant',
    name: 'Liquide de refroidissement',
    interval_km: 60000,
    interval_months: 48,
    notes: 'Vérifier le niveau régulièrement'
  },
  {
    maintenance_type: 'timing_belt',
    name: 'Courroie de distribution',
    interval_km: 120000,
    interval_months: 60,
    notes: 'Critique - À ne pas dépasser. Inclure pompe à eau si recommandé'
  },
  {
    maintenance_type: 'spark_plugs',
    name: 'Bougies d\'allumage',
    interval_km: 60000,
    interval_months: null,
    notes: 'Moteurs essence uniquement'
  },
  {
    maintenance_type: 'tire_rotation',
    name: 'Rotation des pneus',
    interval_km: 10000,
    interval_months: null,
    notes: 'Pour usure uniforme'
  },
  {
    maintenance_type: 'inspection',
    name: 'Contrôle technique',
    interval_km: null,
    interval_months: 24,
    notes: 'Obligatoire - Véhicules de plus de 4 ans'
  },
  {
    maintenance_type: 'ac_service',
    name: 'Entretien climatisation',
    interval_km: null,
    interval_months: 24,
    notes: 'Vérification et recharge si nécessaire'
  }
]

// Labels pour les statuts
export const MAINTENANCE_STATUS_LABELS = {
  ok: { label: 'À jour', color: 'badge-success', icon: '✓' },
  due_soon: { label: 'À faire bientôt', color: 'badge-warning', icon: '⚠' },
  overdue: { label: 'En retard', color: 'badge-danger', icon: '✗' }
}
