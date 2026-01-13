import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { maintenanceService, MAINTENANCE_TYPES } from '../lib/maintenance.service'
import type { Vehicle, MaintenanceRecord, MaintenanceRecordInsert } from '../lib/database.types'
import { 
  Wrench, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Loader2,
  Calendar,
  Gauge,
  Euro,
  Filter,
  Car
} from 'lucide-react'

export function MaintenancePage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterVehicle, setFilterVehicle] = useState<string>('')

  const [form, setForm] = useState<Partial<MaintenanceRecordInsert>>({
    vehicle_id: '',
    type: 'oil_change',
    description: '',
    date: new Date().toISOString().split('T')[0],
    mileage: 0,
    cost: 0,
    garage_name: '',
    garage_address: '',
    notes: ''
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [vehiclesData, recordsData] = await Promise.all([
        vehicleService.getAll(user.id),
        maintenanceService.getAll(user.id)
      ])
      setVehicles(vehiclesData)
      setRecords(recordsData)
      
      if (vehiclesData.length > 0 && !form.vehicle_id) {
        setForm(f => ({ ...f, vehicle_id: vehiclesData[0].id }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (record?: MaintenanceRecord) => {
    if (record) {
      setEditingRecord(record)
      setForm({
        vehicle_id: record.vehicle_id,
        type: record.type,
        description: record.description,
        date: record.date,
        mileage: record.mileage,
        cost: record.cost,
        garage_name: record.garage_name || '',
        garage_address: record.garage_address || '',
        notes: record.notes || ''
      })
    } else {
      setEditingRecord(null)
      const selectedVehicle = vehicles.find(v => v.id === filterVehicle) || vehicles[0]
      setForm({
        vehicle_id: filterVehicle || vehicles[0]?.id || '',
        type: 'oil_change',
        description: '',
        date: new Date().toISOString().split('T')[0],
        mileage: selectedVehicle?.current_mileage || 0,
        cost: 0,
        garage_name: '',
        garage_address: '',
        notes: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingRecord(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      if (editingRecord) {
        await maintenanceService.update(editingRecord.id, form)
      } else {
        await maintenanceService.create({
          ...form as MaintenanceRecordInsert,
          user_id: user.id
        })
      }
      
      // Update vehicle mileage if this is the highest
      const vehicle = vehicles.find(v => v.id === form.vehicle_id)
      if (vehicle && form.mileage && form.mileage > vehicle.current_mileage) {
        await vehicleService.updateMileage(vehicle.id, form.mileage)
      }
      
      await loadData()
      closeModal()
    } catch (error) {
      console.error('Error saving record:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet entretien ?')) return
    
    try {
      await maintenanceService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting record:', error)
    }
  }

  const getTypeLabel = (value: string) => {
    return MAINTENANCE_TYPES.find(t => t.value === value)?.label || value
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'
  }

  const filteredRecords = filterVehicle 
    ? records.filter(r => r.vehicle_id === filterVehicle)
    : records

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
          Ajoutez d'abord un véhicule pour enregistrer des entretiens.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entretiens</h1>
          <p className="text-gray-500">Historique de tous vos entretiens</p>
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

      {/* Records list */}
      {filteredRecords.length === 0 ? (
        <div className="card text-center py-12">
          <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun entretien
          </h3>
          <p className="text-gray-500 mb-6">
            Enregistrez votre premier entretien pour suivre l'historique de votre véhicule.
          </p>
          <button onClick={() => openModal()} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un entretien
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-green-100">
                    <Wrench className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge badge-info">{getTypeLabel(record.type)}</span>
                      <span className="text-sm text-gray-500">
                        {getVehicleName(record.vehicle_id)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mt-1">{record.description}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(record.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        {record.mileage.toLocaleString()} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Euro className="w-4 h-4" />
                        {formatCurrency(record.cost)}
                      </span>
                    </div>
                    {record.garage_name && (
                      <p className="text-sm text-gray-500 mt-1">
                        🔧 {record.garage_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <button
                    onClick={() => openModal(record)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
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
                {editingRecord ? 'Modifier l\'entretien' : 'Nouvel entretien'}
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
                      mileage: vehicle?.current_mileage || form.mileage 
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
                  <label className="label">Type d'entretien *</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    required
                  >
                    {MAINTENANCE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
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
              </div>

              <div>
                <label className="label">Description *</label>
                <input
                  type="text"
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  placeholder="Ex: Vidange huile + filtre"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="label">Coût (€) *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nom du garage</label>
                  <input
                    type="text"
                    className="input"
                    value={form.garage_name || ''}
                    onChange={(e) => setForm({ ...form, garage_name: e.target.value })}
                    placeholder="Optionnel"
                  />
                </div>
                <div>
                  <label className="label">Adresse du garage</label>
                  <input
                    type="text"
                    className="input"
                    value={form.garage_address || ''}
                    onChange={(e) => setForm({ ...form, garage_address: e.target.value })}
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={3}
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
                  {editingRecord ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
