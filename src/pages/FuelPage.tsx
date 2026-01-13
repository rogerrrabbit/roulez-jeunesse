import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { fuelService, FUEL_TYPES } from '../lib/fuel.service'
import type { Vehicle, FuelLog, FuelLogInsert } from '../lib/database.types'
import { 
  Fuel, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Loader2,
  Calendar,
  Gauge,
  Euro,
  Filter,
  Car,
  TrendingUp,
  Droplet
} from 'lucide-react'

export function FuelPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterVehicle, setFilterVehicle] = useState<string>('')
  const [stats, setStats] = useState({
    avgConsumption: 0,
    totalLiters: 0,
    totalCost: 0,
    avgPricePerLiter: 0
  })

  const [form, setForm] = useState<Partial<FuelLogInsert>>({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    mileage: 0,
    liters: 0,
    price_per_liter: 0,
    total_cost: 0,
    fuel_type: 'sp95',
    station_name: '',
    is_full_tank: true,
    notes: ''
  })

  useEffect(() => {
    if (user) loadData()
  }, [user])

  useEffect(() => {
    if (filterVehicle) {
      loadStats(filterVehicle)
    } else {
      setStats({ avgConsumption: 0, totalLiters: 0, totalCost: 0, avgPricePerLiter: 0 })
    }
  }, [filterVehicle, logs])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [vehiclesData, logsData] = await Promise.all([
        vehicleService.getAll(user.id),
        fuelService.getAll(user.id)
      ])
      setVehicles(vehiclesData)
      setLogs(logsData)
      
      if (vehiclesData.length > 0 && !form.vehicle_id) {
        const vehicle = vehiclesData[0]
        setForm(f => ({ 
          ...f, 
          vehicle_id: vehicle.id,
          mileage: vehicle.current_mileage,
          fuel_type: vehicle.fuel_type
        }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (vehicleId: string) => {
    try {
      const statsData = await fuelService.getConsumptionStats(vehicleId)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const openModal = (log?: FuelLog) => {
    if (log) {
      setEditingLog(log)
      setForm({
        vehicle_id: log.vehicle_id,
        date: log.date,
        mileage: log.mileage,
        liters: log.liters,
        price_per_liter: log.price_per_liter,
        total_cost: log.total_cost,
        fuel_type: log.fuel_type,
        station_name: log.station_name || '',
        is_full_tank: log.is_full_tank,
        notes: log.notes || ''
      })
    } else {
      setEditingLog(null)
      const selectedVehicle = vehicles.find(v => v.id === filterVehicle) || vehicles[0]
      setForm({
        vehicle_id: filterVehicle || vehicles[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        mileage: selectedVehicle?.current_mileage || 0,
        liters: 0,
        price_per_liter: 0,
        total_cost: 0,
        fuel_type: selectedVehicle?.fuel_type || 'sp95',
        station_name: '',
        is_full_tank: true,
        notes: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingLog(null)
  }

  const handleLitersChange = (liters: number) => {
    const total = liters * (form.price_per_liter || 0)
    setForm({ ...form, liters, total_cost: Math.round(total * 100) / 100 })
  }

  const handlePriceChange = (price: number) => {
    const total = (form.liters || 0) * price
    setForm({ ...form, price_per_liter: price, total_cost: Math.round(total * 100) / 100 })
  }

  const handleTotalChange = (total: number) => {
    const price = form.liters && form.liters > 0 ? total / form.liters : 0
    setForm({ ...form, total_cost: total, price_per_liter: Math.round(price * 1000) / 1000 })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      if (editingLog) {
        await fuelService.update(editingLog.id, form)
      } else {
        await fuelService.create({
          ...form as FuelLogInsert,
          user_id: user.id
        })
      }
      
      // Update vehicle mileage
      const vehicle = vehicles.find(v => v.id === form.vehicle_id)
      if (vehicle && form.mileage && form.mileage > vehicle.current_mileage) {
        await vehicleService.updateMileage(vehicle.id, form.mileage)
      }
      
      await loadData()
      closeModal()
    } catch (error) {
      console.error('Error saving log:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce plein ?')) return
    
    try {
      await fuelService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting log:', error)
    }
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'
  }

  const getFuelTypeLabel = (value: string) => {
    return FUEL_TYPES.find(f => f.value === value)?.label || value
  }

  const filteredLogs = filterVehicle 
    ? logs.filter(l => l.vehicle_id === filterVehicle)
    : logs

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="card text-center py-12">
        <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Aucun véhicule enregistré
        </h3>
        <p className="text-gray-500 mb-6">
          Ajoutez d'abord un véhicule pour enregistrer vos pleins.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carburant</h1>
          <p className="text-gray-500">Suivez vos pleins et votre consommation</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input pl-9 pr-8 py-2"
              value={filterVehicle}
              onChange={(e) => setFilterVehicle(e.target.value)}
            >
              <option value="">Tous les véhicules</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {filterVehicle && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-100">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Consommation moy.</p>
              <p className="text-xl font-bold">
                {stats.avgConsumption > 0 ? `${stats.avgConsumption.toFixed(1)} L/100km` : '-'}
              </p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100">
              <Droplet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total litres</p>
              <p className="text-xl font-bold">{stats.totalLiters.toFixed(1)} L</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100">
              <Euro className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total dépensé</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Fuel className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Prix moyen/L</p>
              <p className="text-xl font-bold">
                {stats.avgPricePerLiter > 0 ? `${stats.avgPricePerLiter.toFixed(3)} €` : '-'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Logs list */}
      {filteredLogs.length === 0 ? (
        <div className="card text-center py-12">
          <Fuel className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun plein enregistré
          </h3>
          <p className="text-gray-500 mb-6">
            Enregistrez vos pleins pour suivre votre consommation.
          </p>
          <button onClick={() => openModal()} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un plein
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <div key={log.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-orange-100">
                    <Fuel className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge badge-info">{getFuelTypeLabel(log.fuel_type)}</span>
                      <span className="text-sm text-gray-500">
                        {getVehicleName(log.vehicle_id)}
                      </span>
                      {log.is_full_tank && (
                        <span className="badge badge-success">Plein complet</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mt-1">
                      {log.liters.toFixed(2)} L à {log.price_per_liter.toFixed(3)} €/L
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(log.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        {log.mileage.toLocaleString()} km
                      </span>
                      <span className="flex items-center gap-1 font-medium text-gray-900">
                        <Euro className="w-4 h-4" />
                        {formatCurrency(log.total_cost)}
                      </span>
                    </div>
                    {log.station_name && (
                      <p className="text-sm text-gray-500 mt-1">
                        ⛽ {log.station_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <button
                    onClick={() => openModal(log)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="btn btn-danger flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingLog ? 'Modifier le plein' : 'Nouveau plein'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Véhicule *</label>
                <select
                  className="input"
                  value={form.vehicle_id}
                  onChange={(e) => {
                    const vehicle = vehicles.find(v => v.id === e.target.value)
                    setForm({ 
                      ...form, 
                      vehicle_id: e.target.value,
                      mileage: vehicle?.current_mileage || form.mileage,
                      fuel_type: vehicle?.fuel_type || form.fuel_type
                    })
                  }}
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.license_plate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Kilométrage *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.mileage}
                    onChange={(e) => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type de carburant *</label>
                  <select
                    className="input"
                    value={form.fuel_type}
                    onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                    required
                  >
                    {FUEL_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Litres *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.liters || ''}
                    onChange={(e) => handleLitersChange(parseFloat(e.target.value) || 0)}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Prix/litre (€) *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.price_per_liter || ''}
                    onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                    required
                    min="0"
                    step="0.001"
                  />
                </div>
                <div>
                  <label className="label">Total (€) *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.total_cost || ''}
                    onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="label">Station</label>
                <input
                  type="text"
                  className="input"
                  value={form.station_name || ''}
                  onChange={(e) => setForm({ ...form, station_name: e.target.value })}
                  placeholder="Nom de la station"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_full_tank}
                    onChange={(e) => setForm({ ...form, is_full_tank: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Plein complet (nécessaire pour calculer la consommation)</span>
                </label>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingLog ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
