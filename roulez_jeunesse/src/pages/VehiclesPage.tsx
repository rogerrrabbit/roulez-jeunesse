import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { FUEL_TYPES } from '../lib/fuel.service'
import type { Vehicle, VehicleInsert } from '../lib/database.types'
import { 
  Car, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Loader2,
  Gauge,
  Calendar,
  Fuel
} from 'lucide-react'

export function VehiclesPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<Partial<VehicleInsert>>({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vin: '',
    fuel_type: 'sp95',
    current_mileage: 0,
    purchase_date: '',
    purchase_price: undefined,
    notes: ''
  })

  useEffect(() => {
    if (user) loadVehicles()
  }, [user])

  const loadVehicles = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await vehicleService.getAll(user.id)
      setVehicles(data)
    } catch (error) {
      console.error('Error loading vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle)
      setForm({
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        license_plate: vehicle.license_plate,
        vin: vehicle.vin || '',
        fuel_type: vehicle.fuel_type,
        current_mileage: vehicle.current_mileage,
        purchase_date: vehicle.purchase_date || '',
        purchase_price: vehicle.purchase_price || undefined,
        notes: vehicle.notes || ''
      })
    } else {
      setEditingVehicle(null)
      setForm({
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        license_plate: '',
        vin: '',
        fuel_type: 'sp95',
        current_mileage: 0,
        purchase_date: '',
        purchase_price: undefined,
        notes: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingVehicle(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      if (editingVehicle) {
        await vehicleService.update(editingVehicle.id, form)
      } else {
        await vehicleService.create({
          ...form as VehicleInsert,
          user_id: user.id
        })
      }
      await loadVehicles()
      closeModal()
    } catch (error) {
      console.error('Error saving vehicle:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce véhicule ?')) return
    
    try {
      await vehicleService.delete(id)
      await loadVehicles()
    } catch (error) {
      console.error('Error deleting vehicle:', error)
    }
  }

  const getFuelTypeLabel = (value: string) => {
    return FUEL_TYPES.find(f => f.value === value)?.label || value
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes véhicules</h1>
          <p className="text-gray-500">Gérez vos véhicules et leur kilométrage</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un véhicule
        </button>
      </div>

      {/* Vehicles grid */}
      {vehicles.length === 0 ? (
        <div className="card text-center py-12">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun véhicule
          </h3>
          <p className="text-gray-500 mb-6">
            Ajoutez votre premier véhicule pour commencer à suivre son entretien.
          </p>
          <button onClick={() => openModal()} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un véhicule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{vehicle.brand} {vehicle.model}</h3>
                    <p className="text-gray-500">{vehicle.year}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(vehicle)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {vehicle.license_plate}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Gauge className="w-4 h-4" />
                  <span>{vehicle.current_mileage.toLocaleString()} km</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <Fuel className="w-4 h-4" />
                  <span>{getFuelTypeLabel(vehicle.fuel_type)}</span>
                </div>

                {vehicle.purchase_date && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Acheté le {new Date(vehicle.purchase_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  to={`/vehicles/${vehicle.id}`}
                  className="btn btn-secondary w-full text-center"
                >
                  Voir les détails
                </Link>
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
                {editingVehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Marque *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    required
                    placeholder="Renault"
                  />
                </div>
                <div>
                  <label className="label">Modèle *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    required
                    placeholder="Clio"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Année *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                    required
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                <div>
                  <label className="label">Immatriculation *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.license_plate}
                    onChange={(e) => setForm({ ...form, license_plate: e.target.value.toUpperCase() })}
                    required
                    placeholder="AB-123-CD"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Carburant *</label>
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
                  <label className="label">Kilométrage actuel *</label>
                  <input
                    type="number"
                    className="input"
                    value={form.current_mileage}
                    onChange={(e) => setForm({ ...form, current_mileage: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="label">Numéro VIN</label>
                <input
                  type="text"
                  className="input"
                  value={form.vin || ''}
                  onChange={(e) => setForm({ ...form, vin: e.target.value })}
                  placeholder="Optionnel"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date d'achat</label>
                  <input
                    type="date"
                    className="input"
                    value={form.purchase_date || ''}
                    onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Prix d'achat (€)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.purchase_price || ''}
                    onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || undefined })}
                    min="0"
                    step="0.01"
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
                  {editingVehicle ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
