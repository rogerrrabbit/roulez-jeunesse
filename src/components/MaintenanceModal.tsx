import { useState, useEffect } from 'react'
import { maintenanceService, MAINTENANCE_TYPES } from '../lib/maintenance.service'
import { maintenanceScheduleService } from '../lib/maintenance-schedule.service'
import { vehicleService } from '../lib/vehicles.service'
import type { 
  Vehicle, 
  MaintenanceRecord, 
  MaintenanceRecordInsert,
  MaintenanceSchedule 
} from '../lib/database.types'
import { 
  Wrench, 
  X,
  Loader2,
  Gauge,
  Euro,
  CalendarCheck
} from 'lucide-react'

interface MaintenanceModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  vehicles: Vehicle[]
  userId: string
  editingRecord?: MaintenanceRecord | null
  // Pour lier à un calendrier d'entretien
  linkedSchedule?: MaintenanceSchedule | null
  // Véhicule pré-sélectionné
  preselectedVehicleId?: string
}

export function MaintenanceModal({
  isOpen,
  onClose,
  onSaved,
  vehicles,
  userId,
  editingRecord = null,
  linkedSchedule = null,
  preselectedVehicleId = ''
}: MaintenanceModalProps) {
  const [saving, setSaving] = useState(false)
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

  // Initialiser le formulaire quand la modale s'ouvre
  useEffect(() => {
    if (!isOpen) return

    if (editingRecord) {
      // Mode édition
      setForm({
        vehicle_id: editingRecord.vehicle_id,
        type: editingRecord.type,
        description: editingRecord.description,
        date: editingRecord.date,
        mileage: editingRecord.mileage,
        cost: editingRecord.cost,
        garage_name: editingRecord.garage_name || '',
        garage_address: editingRecord.garage_address || '',
        notes: editingRecord.notes || ''
      })
    } else if (linkedSchedule) {
      // Mode création depuis un calendrier
      const vehicle = vehicles.find(v => v.id === linkedSchedule.vehicle_id)
      setForm({
        vehicle_id: linkedSchedule.vehicle_id,
        type: linkedSchedule.maintenance_type,
        description: linkedSchedule.name,
        date: new Date().toISOString().split('T')[0],
        mileage: vehicle?.current_mileage || 0,
        cost: 0,
        garage_name: '',
        garage_address: '',
        notes: linkedSchedule.notes || ''
      })
    } else {
      // Mode création normal
      const vehicleId = preselectedVehicleId || vehicles[0]?.id || ''
      const vehicle = vehicles.find(v => v.id === vehicleId)
      setForm({
        vehicle_id: vehicleId,
        type: 'oil_change',
        description: '',
        date: new Date().toISOString().split('T')[0],
        mileage: vehicle?.current_mileage || 0,
        cost: 0,
        garage_name: '',
        garage_address: '',
        notes: ''
      })
    }
  }, [isOpen, editingRecord, linkedSchedule, preselectedVehicleId, vehicles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    try {
      if (editingRecord) {
        // Mode édition
        await maintenanceService.update(editingRecord.id, form)
      } else {
        // Mode création
        await maintenanceService.create({
          ...form as MaintenanceRecordInsert,
          user_id: userId
        })

        // Si lié à un calendrier, mettre à jour le calendrier
        if (linkedSchedule) {
          await maintenanceScheduleService.markAsDone(
            linkedSchedule.id,
            form.date!,
            form.mileage!
          )
        }
      }

      // Mettre à jour le kilométrage du véhicule si nécessaire
      const vehicle = vehicles.find(v => v.id === form.vehicle_id)
      if (vehicle && form.mileage && form.mileage > vehicle.current_mileage) {
        await vehicleService.updateMileage(vehicle.id, form.mileage)
      }

      onSaved()
      onClose()
    } catch (error) {
      console.error('Error saving maintenance:', error)
    } finally {
      setSaving(false)
    }
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Wrench className="w-5 h-5 text-green-600" />
              {editingRecord ? 'Modifier l\'entretien' : 'Nouvel entretien'}
            </h2>
            {linkedSchedule && (
              <p className="text-sm text-gray-500 mt-1">
                {getVehicleName(linkedSchedule.vehicle_id)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info du calendrier lié */}
          {linkedSchedule && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <CalendarCheck className="w-4 h-4 inline mr-1" />
                Cet entretien mettra automatiquement à jour le calendrier <strong>"{linkedSchedule.name}"</strong>
              </p>
            </div>
          )}

          <div>
            <label className="label">Véhicule *</label>
            <select
              className="input"
              value={form.vehicle_id}
              onChange={(e) => {
                const newVehicle = vehicles.find(v => v.id === e.target.value)
                setForm({ 
                  ...form, 
                  vehicle_id: e.target.value,
                  mileage: newVehicle?.current_mileage || form.mileage
                })
              }}
              required
              disabled={!!linkedSchedule}
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
              placeholder="Ex: Vidange huile moteur 5W40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Kilométrage *</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  className="input pl-10"
                  value={form.mileage}
                  onChange={(e) => setForm({ ...form, mileage: parseInt(e.target.value) || 0 })}
                  required
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="label">Coût *</label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  className="input pl-10"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Garage</label>
              <input
                type="text"
                className="input"
                value={form.garage_name || ''}
                onChange={(e) => setForm({ ...form, garage_name: e.target.value })}
                placeholder="Nom du garage"
              />
            </div>
            <div>
              <label className="label">Adresse</label>
              <input
                type="text"
                className="input"
                value={form.garage_address || ''}
                onChange={(e) => setForm({ ...form, garage_address: e.target.value })}
                placeholder="Ville ou adresse"
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={2}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Détails, pièces utilisées..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
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
  )
}
