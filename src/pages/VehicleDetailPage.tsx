import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { maintenanceService } from '../lib/maintenance.service'
import { reminderService } from '../lib/reminders.service'
import { fuelService } from '../lib/fuel.service'
import type { Vehicle, MaintenanceRecord, Reminder, FuelLog } from '../lib/database.types'
import { FUEL_TYPES } from '../lib/fuel.service'
import { MAINTENANCE_TYPES } from '../lib/maintenance.service'
import { 
  Car, 
  ArrowLeft, 
  Gauge, 
  Fuel, 
  Calendar, 
  Euro, 
  Wrench,
  Bell,
  TrendingUp,
  Edit
} from 'lucide-react'

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([])
  const [fuelStats, setFuelStats] = useState({
    avgConsumption: 0,
    totalLiters: 0,
    totalCost: 0,
    avgPricePerLiter: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'maintenance' | 'fuel' | 'reminders'>('maintenance')

  useEffect(() => {
    if (user && id) loadData()
  }, [user, id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [vehicleData, maintenanceData, remindersData, fuelData, fuelStatsData] = await Promise.all([
        vehicleService.getById(id),
        maintenanceService.getByVehicle(id),
        reminderService.getByVehicle(id),
        fuelService.getByVehicle(id),
        fuelService.getConsumptionStats(id)
      ])
      
      setVehicle(vehicleData)
      setMaintenance(maintenanceData)
      setReminders(remindersData)
      setFuelLogs(fuelData)
      setFuelStats(fuelStatsData)
    } catch (error) {
      console.error('Error loading vehicle data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getFuelTypeLabel = (value: string) => {
    return FUEL_TYPES.find(f => f.value === value)?.label || value
  }

  const getMaintenanceTypeLabel = (value: string) => {
    return MAINTENANCE_TYPES.find(t => t.value === value)?.label || value
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const totalMaintenanceCost = maintenance.reduce((sum, m) => sum + m.cost, 0)
  const totalFuelCost = fuelLogs.reduce((sum, f) => sum + f.total_cost, 0)
  const totalCost = totalMaintenanceCost + totalFuelCost + (vehicle?.purchase_price || 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="card text-center py-12">
        <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Véhicule non trouvé
        </h3>
        <Link to="/vehicles" className="btn btn-primary mt-4">
          Retour aux véhicules
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/vehicles" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {vehicle.brand} {vehicle.model}
          </h1>
          <p className="text-gray-500">{vehicle.year} • {vehicle.license_plate}</p>
        </div>
        <Link to="/vehicles" className="btn btn-secondary flex items-center gap-2">
          <Edit className="w-4 h-4" />
          Modifier
        </Link>
      </div>

      {/* Vehicle info */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100">
            <Gauge className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Kilométrage</p>
            <p className="text-xl font-bold">{vehicle.current_mileage.toLocaleString()} km</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-orange-100">
            <Fuel className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Carburant</p>
            <p className="text-xl font-bold">{getFuelTypeLabel(vehicle.fuel_type)}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Consommation moy.</p>
            <p className="text-xl font-bold">
              {fuelStats.avgConsumption > 0 
                ? `${fuelStats.avgConsumption.toFixed(1)} L/100km` 
                : '-'}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-purple-100">
            <Euro className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Coût total</p>
            <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
          </div>
        </div>
      </div>

      {/* Additional info */}
      {(vehicle.vin || vehicle.purchase_date || vehicle.notes) && (
        <div className="card">
          <h3 className="font-semibold mb-4">Informations complémentaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {vehicle.vin && (
              <div>
                <span className="text-gray-500">VIN :</span>
                <span className="ml-2 font-mono">{vehicle.vin}</span>
              </div>
            )}
            {vehicle.purchase_date && (
              <div>
                <span className="text-gray-500">Date d'achat :</span>
                <span className="ml-2">{formatDate(vehicle.purchase_date)}</span>
              </div>
            )}
            {vehicle.purchase_price && (
              <div>
                <span className="text-gray-500">Prix d'achat :</span>
                <span className="ml-2">{formatCurrency(vehicle.purchase_price)}</span>
              </div>
            )}
            {vehicle.notes && (
              <div className="md:col-span-2">
                <span className="text-gray-500">Notes :</span>
                <p className="mt-1">{vehicle.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'maintenance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wrench className="w-4 h-4 inline mr-2" />
            Entretiens ({maintenance.length})
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'fuel'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Fuel className="w-4 h-4 inline mr-2" />
            Carburant ({fuelLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reminders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Rappels ({reminders.filter(r => !r.is_completed).length})
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          {maintenance.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun entretien enregistré</p>
              <Link to="/maintenance" className="btn btn-primary mt-4">
                Ajouter un entretien
              </Link>
            </div>
          ) : (
            maintenance.map((record) => (
              <div key={record.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">
                        {getMaintenanceTypeLabel(record.type)}
                      </span>
                    </div>
                    <h4 className="font-semibold mt-1">{record.description}</h4>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(record.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        {record.mileage.toLocaleString()} km
                      </span>
                    </div>
                    {record.garage_name && (
                      <p className="text-sm text-gray-500 mt-1">🔧 {record.garage_name}</p>
                    )}
                  </div>
                  <span className="font-semibold text-lg">{formatCurrency(record.cost)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="space-y-4">
          {fuelLogs.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              <Fuel className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun plein enregistré</p>
              <Link to="/fuel" className="btn btn-primary mt-4">
                Ajouter un plein
              </Link>
            </div>
          ) : (
            fuelLogs.map((log) => (
              <div key={log.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">
                        {getFuelTypeLabel(log.fuel_type)}
                      </span>
                      {log.is_full_tank && (
                        <span className="badge badge-success">Plein complet</span>
                      )}
                    </div>
                    <h4 className="font-semibold mt-1">
                      {log.liters.toFixed(2)} L à {log.price_per_liter.toFixed(3)} €/L
                    </h4>
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(log.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        {log.mileage.toLocaleString()} km
                      </span>
                    </div>
                    {log.station_name && (
                      <p className="text-sm text-gray-500 mt-1">⛽ {log.station_name}</p>
                    )}
                  </div>
                  <span className="font-semibold text-lg">{formatCurrency(log.total_cost)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="card text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun rappel</p>
              <Link to="/reminders" className="btn btn-primary mt-4">
                Créer un rappel
              </Link>
            </div>
          ) : (
            reminders.map((reminder) => (
              <div 
                key={reminder.id} 
                className={`card ${reminder.is_completed ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    reminder.is_completed ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <Bell className={`w-5 h-5 ${
                      reminder.is_completed ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      reminder.is_completed ? 'line-through text-gray-500' : ''
                    }`}>
                      {reminder.title}
                    </h4>
                    {reminder.description && (
                      <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                      {reminder.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(reminder.due_date)}
                        </span>
                      )}
                      {reminder.due_mileage && (
                        <span className="flex items-center gap-1">
                          <Gauge className="w-4 h-4" />
                          {reminder.due_mileage.toLocaleString()} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
