import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { maintenanceService } from '../lib/maintenance.service'
import { reminderService } from '../lib/reminders.service'
import { fuelService } from '../lib/fuel.service'
import { maintenanceScheduleService, MAINTENANCE_STATUS_LABELS } from '../lib/maintenance-schedule.service'
import type { Vehicle, MaintenanceRecord, Reminder, FuelLog, MaintenanceStatus } from '../lib/database.types'
import { 
  Car, 
  Wrench, 
  Bell, 
  Fuel,
  Calendar,
  AlertCircle,
  Plus,
  ArrowRight,
  Euro,
  AlertTriangle,
  Check,
  Clock,
  CalendarCheck
} from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRecord[]>([])
  const [upcomingReminders, setUpcomingReminders] = useState<Reminder[]>([])
  const [recentFuel, setRecentFuel] = useState<FuelLog[]>([])
  const [maintenanceStatuses, setMaintenanceStatuses] = useState<MaintenanceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalMaintenance: 0,
    totalSpent: 0,
    pendingReminders: 0,
    overdueSchedules: 0,
    dueSoonSchedules: 0
  })

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [vehiclesData, maintenanceData, remindersData, fuelData] = await Promise.all([
        vehicleService.getAll(user.id),
        maintenanceService.getAll(user.id),
        reminderService.getUpcoming(user.id, 30),
        fuelService.getAll(user.id)
      ])

      setVehicles(vehiclesData)
      setRecentMaintenance(maintenanceData.slice(0, 5))
      setUpcomingReminders(remindersData.slice(0, 5))
      setRecentFuel(fuelData.slice(0, 5))

      // Calculer les statuts d'entretien pour tous les véhicules
      // Utilise getVehicleMaintenanceStatus qui charge automatiquement les lastRecords
      const allStatuses: MaintenanceStatus[] = []
      for (const vehicle of vehiclesData) {
        const vehicleStatuses = await maintenanceScheduleService.getVehicleMaintenanceStatus(vehicle)
        allStatuses.push(...vehicleStatuses)
      }
      
      // Trier: overdue d'abord, puis due_soon
      allStatuses.sort((a, b) => {
        const order = { overdue: 0, due_soon: 1, ok: 2 }
        return order[a.status] - order[b.status]
      })
      
      // Garder seulement les entretiens à faire (overdue + due_soon)
      const urgentStatuses = allStatuses.filter(s => s.status !== 'ok').slice(0, 5)
      setMaintenanceStatuses(urgentStatuses)

      const totalMaintenanceCost = maintenanceData.reduce((sum, m) => sum + m.cost, 0)
      const totalFuelCost = fuelData.reduce((sum, f) => sum + f.total_cost, 0)

      setStats({
        totalVehicles: vehiclesData.length,
        totalMaintenance: maintenanceData.length,
        totalSpent: totalMaintenanceCost + totalFuelCost,
        pendingReminders: remindersData.filter(r => !r.is_completed).length,
        overdueSchedules: allStatuses.filter(s => s.status === 'overdue').length,
        dueSoonSchedules: allStatuses.filter(s => s.status === 'due_soon').length
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'
  }

  const getStatusIcon = (status: 'ok' | 'due_soon' | 'overdue') => {
    switch (status) {
      case 'ok': return <Check className="w-4 h-4 text-green-600" />
      case 'due_soon': return <Clock className="w-4 h-4 text-yellow-600" />
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-blue-100">
            <Car className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Véhicules</p>
            <p className="text-2xl font-bold">{stats.totalVehicles}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-green-100">
            <Wrench className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Entretiens</p>
            <p className="text-2xl font-bold">{stats.totalMaintenance}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-lg bg-yellow-100">
            <Bell className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Rappels à venir</p>
            <p className="text-2xl font-bold">{stats.pendingReminders}</p>
          </div>
        </div>

        {(stats.overdueSchedules > 0 || stats.dueSoonSchedules > 0) && (
          <div className={`card flex items-center gap-4 ${stats.overdueSchedules > 0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
            <div className={`p-3 rounded-lg ${stats.overdueSchedules > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <CalendarCheck className={`w-6 h-6 ${stats.overdueSchedules > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Entretiens à prévoir</p>
              <div className="flex gap-2 items-center">
                {stats.overdueSchedules > 0 && (
                  <span className="text-lg font-bold text-red-600">{stats.overdueSchedules} en retard</span>
                )}
                {stats.dueSoonSchedules > 0 && (
                  <span className={`text-lg font-bold ${stats.overdueSchedules > 0 ? 'text-yellow-600' : ''}`}>
                    {stats.overdueSchedules > 0 ? ' • ' : ''}{stats.dueSoonSchedules} bientôt
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {stats.overdueSchedules === 0 && stats.dueSoonSchedules === 0 && (
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Euro className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total dépensé</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalSpent)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      {vehicles.length === 0 ? (
        <div className="card text-center py-12">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Bienvenue dans Roulez Jeunesse !
          </h3>
          <p className="text-gray-500 mb-6">
            Commencez par ajouter votre premier véhicule pour suivre son entretien.
          </p>
          <Link to="/vehicles" className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un véhicule
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Maintenance urgente */}
          {maintenanceStatuses.length > 0 && (
            <div className="card lg:col-span-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold">Entretiens à prévoir</h2>
                </div>
                <Link to="/schedules" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  Voir calendrier <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {maintenanceStatuses.map(({ schedule, status, daysUntilDue, kmUntilDue }) => {
                  const statusConfig = MAINTENANCE_STATUS_LABELS[status]
                  return (
                    <div 
                      key={schedule.id}
                      className={`p-4 rounded-lg border ${
                        status === 'overdue' 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-white border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`badge ${statusConfig.color} text-xs`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                        {getStatusIcon(status)}
                      </div>
                      <h3 className="font-medium mb-1">{schedule.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{getVehicleName(schedule.vehicle_id)}</p>
                      <div className="text-xs text-gray-600 space-y-1">
                        {daysUntilDue !== null && (
                          <p className={daysUntilDue <= 0 ? 'text-red-600 font-medium' : ''}>
                            {daysUntilDue <= 0 
                              ? `${Math.abs(daysUntilDue)} jours de retard`
                              : `Dans ${daysUntilDue} jours`
                            }
                          </p>
                        )}
                        {kmUntilDue !== null && (
                          <p className={kmUntilDue <= 0 ? 'text-red-600 font-medium' : ''}>
                            {kmUntilDue <= 0 
                              ? `${Math.abs(kmUntilDue).toLocaleString()} km de retard`
                              : `Dans ${kmUntilDue.toLocaleString()} km`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Vehicles */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Mes véhicules</h2>
              <Link to="/vehicles" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {vehicles.slice(0, 3).map((vehicle) => (
                <Link
                  key={vehicle.id}
                  to={`/vehicles/${vehicle.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Car className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    <p className="text-sm text-gray-500">
                      {vehicle.license_plate} • {vehicle.current_mileage.toLocaleString()} km
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming reminders */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Rappels à venir</h2>
              <Link to="/reminders" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {upcomingReminders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun rappel à venir</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-100"
                  >
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{reminder.title}</p>
                      {reminder.due_date && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(reminder.due_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent maintenance */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Derniers entretiens</h2>
              <Link to="/maintenance" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {recentMaintenance.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun entretien enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMaintenance.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Wrench className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{record.description}</p>
                        <p className="text-sm text-gray-500">{formatDate(record.date)}</p>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(record.cost)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent fuel */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Derniers pleins</h2>
              <Link to="/fuel" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {recentFuel.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Fuel className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun plein enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentFuel.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <Fuel className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{log.liters.toFixed(1)} L</p>
                        <p className="text-sm text-gray-500">{formatDate(log.date)}</p>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(log.total_cost)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
