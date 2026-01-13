export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string
          user_id: string
          brand: string
          model: string
          year: number
          license_plate: string
          vin: string | null
          fuel_type: string
          current_mileage: number
          purchase_date: string | null
          purchase_price: number | null
          image_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          brand: string
          model: string
          year: number
          license_plate: string
          vin?: string | null
          fuel_type: string
          current_mileage: number
          purchase_date?: string | null
          purchase_price?: number | null
          image_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          brand?: string
          model?: string
          year?: number
          license_plate?: string
          vin?: string | null
          fuel_type?: string
          current_mileage?: number
          purchase_date?: string | null
          purchase_price?: number | null
          image_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      maintenance_records: {
        Row: {
          id: string
          vehicle_id: string
          user_id: string
          type: string
          description: string
          date: string
          mileage: number
          cost: number
          garage_name: string | null
          garage_address: string | null
          invoice_url: string | null
          notes: string | null
          visit_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          user_id: string
          type: string
          description: string
          date: string
          mileage: number
          cost: number
          garage_name?: string | null
          garage_address?: string | null
          invoice_url?: string | null
          notes?: string | null
          visit_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          user_id?: string
          type?: string
          description?: string
          date?: string
          mileage?: number
          cost?: number
          garage_name?: string | null
          garage_address?: string | null
          invoice_url?: string | null
          notes?: string | null
          visit_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reminders: {
        Row: {
          id: string
          vehicle_id: string
          user_id: string
          title: string
          description: string | null
          due_date: string | null
          due_mileage: number | null
          is_completed: boolean
          priority: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          user_id: string
          title: string
          description?: string | null
          due_date?: string | null
          due_mileage?: number | null
          is_completed?: boolean
          priority?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          due_mileage?: number | null
          is_completed?: boolean
          priority?: string
          created_at?: string
          updated_at?: string
        }
      }
      fuel_logs: {
        Row: {
          id: string
          vehicle_id: string
          user_id: string
          date: string
          mileage: number
          liters: number
          price_per_liter: number
          total_cost: number
          fuel_type: string
          station_name: string | null
          is_full_tank: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          user_id: string
          date: string
          mileage: number
          liters: number
          price_per_liter: number
          total_cost: number
          fuel_type: string
          station_name?: string | null
          is_full_tank?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          user_id?: string
          date?: string
          mileage?: number
          liters?: number
          price_per_liter?: number
          total_cost?: number
          fuel_type?: string
          station_name?: string | null
          is_full_tank?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      garage_visits: {
        Row: {
          id: string
          vehicle_id: string
          user_id: string
          date: string
          mileage: number
          garage_name: string | null
          garage_address: string | null
          total_cost: number
          invoice_number: string | null
          invoice_url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          user_id: string
          date: string
          mileage: number
          garage_name?: string | null
          garage_address?: string | null
          total_cost?: number
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          user_id?: string
          date?: string
          mileage?: number
          garage_name?: string | null
          garage_address?: string | null
          total_cost?: number
          invoice_number?: string | null
          invoice_url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      maintenance_schedules: {
        Row: {
          id: string
          vehicle_id: string
          user_id: string
          maintenance_type: string
          name: string
          interval_km: number | null
          interval_months: number | null
          last_done_date: string | null
          last_done_mileage: number | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          user_id: string
          maintenance_type: string
          name: string
          interval_km?: number | null
          interval_months?: number | null
          last_done_date?: string | null
          last_done_mileage?: number | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          user_id?: string
          maintenance_type?: string
          name?: string
          interval_km?: number | null
          interval_months?: number | null
          last_done_date?: string | null
          last_done_mileage?: number | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Types utilitaires
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']

export type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row']
export type MaintenanceRecordInsert = Database['public']['Tables']['maintenance_records']['Insert']
export type MaintenanceRecordUpdate = Database['public']['Tables']['maintenance_records']['Update']

export type Reminder = Database['public']['Tables']['reminders']['Row']
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']
export type ReminderUpdate = Database['public']['Tables']['reminders']['Update']

export type FuelLog = Database['public']['Tables']['fuel_logs']['Row']
export type FuelLogInsert = Database['public']['Tables']['fuel_logs']['Insert']
export type FuelLogUpdate = Database['public']['Tables']['fuel_logs']['Update']

export type GarageVisit = Database['public']['Tables']['garage_visits']['Row']
export type GarageVisitInsert = Database['public']['Tables']['garage_visits']['Insert']
export type GarageVisitUpdate = Database['public']['Tables']['garage_visits']['Update']

export type MaintenanceSchedule = Database['public']['Tables']['maintenance_schedules']['Row']
export type MaintenanceScheduleInsert = Database['public']['Tables']['maintenance_schedules']['Insert']
export type MaintenanceScheduleUpdate = Database['public']['Tables']['maintenance_schedules']['Update']

// Type pour une visite avec ses prestations
export interface GarageVisitWithItems extends GarageVisit {
  items: MaintenanceRecord[]
}

// Type pour le statut d'un entretien planifié
export interface MaintenanceStatus {
  schedule: MaintenanceSchedule
  status: 'ok' | 'due_soon' | 'overdue'
  nextDueDate: string | null
  nextDueMileage: number | null
  daysUntilDue: number | null
  kmUntilDue: number | null
  lastRecord: MaintenanceRecord | null
}
