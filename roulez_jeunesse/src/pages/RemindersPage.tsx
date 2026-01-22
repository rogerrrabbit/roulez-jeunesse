import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { reminderService, REMINDER_PRIORITIES } from '../lib/reminders.service'
import type { Vehicle, Reminder, ReminderInsert } from '../lib/database.types'
import { 
  Bell, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Loader2,
  Calendar,
  Gauge,
  Check,
  Filter,
  Car,
  AlertTriangle
} from 'lucide-react'

export function RemindersPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterVehicle, setFilterVehicle] = useState<string>('')
  const [showCompleted, setShowCompleted] = useState(false)

  const [form, setForm] = useState<Partial<ReminderInsert>>({
    vehicle_id: '',
    title: '',
    description: '',
    due_date: '',
    due_mileage: undefined,
    priority: 'medium'
  })

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [vehiclesData, remindersData] = await Promise.all([
        vehicleService.getAll(user.id),
        reminderService.getAll(user.id)
      ])
      setVehicles(vehiclesData)
      setReminders(remindersData)
      
      if (vehiclesData.length > 0 && !form.vehicle_id) {
        setForm(f => ({ ...f, vehicle_id: vehiclesData[0].id }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminder(reminder)
      setForm({
        vehicle_id: reminder.vehicle_id,
        title: reminder.title,
        description: reminder.description || '',
        due_date: reminder.due_date || '',
        due_mileage: reminder.due_mileage || undefined,
        priority: reminder.priority
      })
    } else {
      setEditingReminder(null)
      setForm({
        vehicle_id: filterVehicle || vehicles[0]?.id || '',
        title: '',
        description: '',
        due_date: '',
        due_mileage: undefined,
        priority: 'medium'
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingReminder(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      if (editingReminder) {
        await reminderService.update(editingReminder.id, form)
      } else {
        await reminderService.create({
          ...form as ReminderInsert,
          user_id: user.id
        })
      }
      await loadData()
      closeModal()
    } catch (error) {
      console.error('Error saving reminder:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleComplete = async (reminder: Reminder) => {
    try {
      await reminderService.update(reminder.id, { 
        is_completed: !reminder.is_completed 
      })
      await loadData()
    } catch (error) {
      console.error('Error updating reminder:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rappel ?')) return
    
    try {
      await reminderService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'
  }

  const getPriorityConfig = (priority: string) => {
    return REMINDER_PRIORITIES.find(p => p.value === priority) || REMINDER_PRIORITIES[1]
  }

  const isOverdue = (reminder: Reminder) => {
    if (reminder.is_completed) return false
    if (reminder.due_date && new Date(reminder.due_date) < new Date()) return true
    if (reminder.due_mileage) {
      const vehicle = vehicles.find(v => v.id === reminder.vehicle_id)
      if (vehicle && vehicle.current_mileage >= reminder.due_mileage) return true
    }
    return false
  }

  const filteredReminders = reminders.filter(r => {
    if (filterVehicle && r.vehicle_id !== filterVehicle) return false
    if (!showCompleted && r.is_completed) return false
    return true
  })

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
          Ajoutez d'abord un véhicule pour créer des rappels.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rappels</h1>
          <p className="text-gray-500">Ne ratez plus aucun entretien</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Afficher terminés</span>
          </label>
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Reminders list */}
      {filteredReminders.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun rappel
          </h3>
          <p className="text-gray-500 mb-6">
            Créez des rappels pour ne jamais oublier un entretien.
          </p>
          <button onClick={() => openModal()} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Créer un rappel
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReminders.map((reminder) => {
            const priorityConfig = getPriorityConfig(reminder.priority)
            const overdue = isOverdue(reminder)
            
            return (
              <div 
                key={reminder.id} 
                className={`card hover:shadow-md transition-shadow ${
                  reminder.is_completed ? 'opacity-60' : ''
                } ${overdue ? 'border-red-200 bg-red-50' : ''}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleToggleComplete(reminder)}
                      className={`p-3 rounded-lg transition-colors ${
                        reminder.is_completed 
                          ? 'bg-green-100 text-green-600' 
                          : overdue 
                            ? 'bg-red-100 text-red-600'
                            : 'bg-yellow-100 text-yellow-600'
                      }`}
                    >
                      {reminder.is_completed ? (
                        <Check className="w-6 h-6" />
                      ) : overdue ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <Bell className="w-6 h-6" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${priorityConfig.color}`}>
                          {priorityConfig.label}
                        </span>
                        <span className="text-sm text-gray-500">
                          {getVehicleName(reminder.vehicle_id)}
                        </span>
                        {overdue && (
                          <span className="badge badge-danger">En retard</span>
                        )}
                      </div>
                      <h3 className={`font-semibold text-lg mt-1 ${
                        reminder.is_completed ? 'line-through text-gray-500' : ''
                      }`}>
                        {reminder.title}
                      </h3>
                      {reminder.description && (
                        <p className="text-gray-600 mt-1">{reminder.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
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
                  <div className="flex gap-2 sm:flex-col">
                    <button
                      onClick={() => openModal(reminder)}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingReminder ? 'Modifier le rappel' : 'Nouveau rappel'}
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
                  onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                  required
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.brand} {v.model} ({v.license_plate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Titre *</label>
                <input
                  type="text"
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  placeholder="Ex: Vidange à faire"
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Détails supplémentaires..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date d'échéance</label>
                  <input
                    type="date"
                    className="input"
                    value={form.due_date || ''}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Kilométrage d'échéance</label>
                  <input
                    type="number"
                    className="input"
                    value={form.due_mileage || ''}
                    onChange={(e) => setForm({ ...form, due_mileage: parseInt(e.target.value) || undefined })}
                    min="0"
                    placeholder="Optionnel"
                  />
                </div>
              </div>

              <div>
                <label className="label">Priorité</label>
                <select
                  className="input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {REMINDER_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingReminder ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
