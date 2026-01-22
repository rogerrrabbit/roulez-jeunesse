import { supabase } from './supabase'
import type { FuelLog, FuelLogInsert, FuelLogUpdate } from './database.types'

export const fuelService = {
  async getAll(userId: string): Promise<FuelLog[]> {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getByVehicle(vehicleId: string): Promise<FuelLog[]> {
    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async create(log: FuelLogInsert): Promise<FuelLog> {
    const { data, error } = await supabase
      .from('fuel_logs')
      .insert(log)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: FuelLogUpdate): Promise<FuelLog> {
    const { data, error } = await supabase
      .from('fuel_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('fuel_logs')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async getConsumptionStats(vehicleId: string): Promise<{
    avgConsumption: number
    totalLiters: number
    totalCost: number
    avgPricePerLiter: number
  }> {
    const logs = await this.getByVehicle(vehicleId)
    
    if (logs.length < 2) {
      return {
        avgConsumption: 0,
        totalLiters: logs.reduce((sum, l) => sum + l.liters, 0),
        totalCost: logs.reduce((sum, l) => sum + l.total_cost, 0),
        avgPricePerLiter: logs.length > 0 
          ? logs.reduce((sum, l) => sum + l.price_per_liter, 0) / logs.length 
          : 0
      }
    }

    // Calcul de consommation moyenne (L/100km)
    const fullTankLogs = logs.filter(l => l.is_full_tank)
    let totalConsumption = 0
    let consumptionCount = 0

    for (let i = 0; i < fullTankLogs.length - 1; i++) {
      const current = fullTankLogs[i]
      const previous = fullTankLogs[i + 1]
      const distance = current.mileage - previous.mileage
      
      if (distance > 0) {
        const consumption = (current.liters / distance) * 100
        totalConsumption += consumption
        consumptionCount++
      }
    }

    return {
      avgConsumption: consumptionCount > 0 ? totalConsumption / consumptionCount : 0,
      totalLiters: logs.reduce((sum, l) => sum + l.liters, 0),
      totalCost: logs.reduce((sum, l) => sum + l.total_cost, 0),
      avgPricePerLiter: logs.reduce((sum, l) => sum + l.price_per_liter, 0) / logs.length
    }
  }
}

export const FUEL_TYPES = [
  { value: 'sp95', label: 'SP95' },
  { value: 'sp98', label: 'SP98' },
  { value: 'sp95_e10', label: 'SP95-E10' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'e85', label: 'E85' },
  { value: 'gpl', label: 'GPL' },
  { value: 'electric', label: 'Électrique' },
  { value: 'hybrid', label: 'Hybride' }
]
