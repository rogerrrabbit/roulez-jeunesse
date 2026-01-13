import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { 
  maintenanceScheduleService, 
  MAINTENANCE_STATUS_LABELS 
} from '../lib/maintenance-schedule.service'
import { MAINTENANCE_TYPES } from '../lib/maintenance.service'
import type { Vehicle, MaintenanceSchedule, MaintenanceScheduleInsert, MaintenanceStatus } from '../lib/database.types'
import { 
  CalendarCheck, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  Loader2,
  Filter,
  Car,
  Check,
  AlertTriangle,
  Clock,
  Settings,
  Gauge,
  Calendar
} from 'lucide-react'

export function MaintenanceSchedulePage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [statuses, setStatuses] = useState<MaintenanceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<MaintenanceSchedule | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterVehicle, setFilterVehicle] = useState<string>('')
  const [showMarkDoneModal, setShowMarkDoneModal] = useState<MaintenanceSchedule | null>(null)

  const [form, setForm] = useState<Partial<MaintenanceScheduleInsert>>({
    vehicle_id: '',
    maintenance_type: 'oil_change',
    name: '',
    interval_km: undefined,
    interval_months: undefined,
    last_done_date: '',
    last_done_mileage: undefined,
    notes: ''
  })

  const [markDoneForm, setMarkDoneForm] = useState({
    date: new Date().toISOString().split('T')[0],
    mileage: 0
  })

  useEffect(() => {
    if (user) loadData()
  }, [user])

  useEffect(() => {
    calculateStatuses()
  }, [schedules, vehicles, filterVehicle])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [vehiclesData, schedulesData] = await Promise.all([
        vehicleService.getAll(user.id),
        maintenanceScheduleService.getAll(user.id)
      ])
      setVehicles(vehiclesData)
      setSchedules(schedulesData)
      
      if (vehiclesData.length > 0 && !form.vehicle_id) {
        setForm(f => ({ ...f, vehicle_id: vehiclesData[0].id }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStatuses = () => {
    const relevantSchedules = filterVehicle 
      ? schedules.filter(s => s.vehicle_id === filterVehicle)
      : schedules

    const newStatuses: MaintenanceStatus[] = []
    for (const schedule of relevantSchedules) {
      const vehicle = vehicles.find(v => v.id === schedule.vehicle_id)
      if (vehicle) {
        newStatuses.push(maintenanceScheduleService.calculateStatus(schedule, vehicle))
      }
    }
    
    // Trier par statut: overdue d'abord, puis due_soon, puis ok
    newStatuses.sort((a, b) => {
      const order = { overdue: 0, due_soon: 1, ok: 2 }
      return order[a.status] - order[b.status]
    })
    
    setStatuses(newStatuses)
  }

  const openModal = (schedule?: MaintenanceSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule)
      setForm({
        vehicle_id: schedule.vehicle_id,
        maintenance_type: schedule.maintenance_type,
        name: schedule.name,
        interval_km: schedule.interval_km || undefined,
        interval_months: schedule.interval_months || undefined,
        last_done_date: schedule.last_done_date || '',
        last_done_mileage: schedule.last_done_mileage || undefined,
        notes: schedule.notes || ''
      })
    } else {
      setEditingSchedule(null)
      setForm({
        vehicle_id: filterVehicle || vehicles[0]?.id || '',
        maintenance_type: 'oil_change',
        name: '',
        interval_km: undefined,
        interval_months: undefined,
        last_done_date: '',
        last_done_mileage: undefined,
        notes: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingSchedule(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!form.interval_km && !form.interval_months) {
      alert('Vous devez spécifier au moins un intervalle (kilométrage ou mois)')
      return
    }

    setSaving(true)
    try {
      const scheduleData = {
        ...form,
        user_id: user.id,
        interval_km: form.interval_km || null,
        interval_months: form.interval_months || null,
        last_done_date: form.last_done_date || null,
        last_done_mileage: form.last_done_mileage || null
      }

      if (editingSchedule) {
        await maintenanceScheduleService.update(editingSchedule.id, scheduleData)
      } else {
        await maintenanceScheduleService.create(scheduleData as MaintenanceScheduleInsert)
      }
      
      await loadData()
      closeModal()
    } catch (error) {
      console.error('Error saving schedule:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce calendrier d\'entretien ?')) return
    
    try {
      await maintenanceScheduleService.delete(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting schedule:', error)
    }
  }

  const handleCreateDefaults = async (vehicleId: string) => {
    if (!user) return
    if (!confirm('Créer les calendriers d\'entretien par défaut pour ce véhicule ?')) return
    
    try {
      await maintenanceScheduleService.createDefaultSchedules(vehicleId, user.id)
      await loadData()
    } catch (error) {
      console.error('Error creating defaults:', error)
    }
  }

  const openMarkDoneModal = (schedule: MaintenanceSchedule) => {
    const vehicle = vehicles.find(v => v.id === schedule.vehicle_id)
    setMarkDoneForm({
      date: new Date().toISOString().split('T')[0],
      mileage: vehicle?.current_mileage || 0
    })
    setShowMarkDoneModal(schedule)
  }

  const handleMarkDone = async () => {
    if (!showMarkDoneModal) return
    
    try {
      await maintenanceScheduleService.markAsDone(
        showMarkDoneModal.id,
        markDoneForm.date,
        markDoneForm.mileage
      )
      
      // Mettre à jour le kilométrage du véhicule
      const vehicle = vehicles.find(v => v.id === showMarkDoneModal.vehicle_id)
      if (vehicle && markDoneForm.mileage > vehicle.current_mileage) {
        await vehicleService.updateMileage(vehicle.id, markDoneForm.mileage)
      }
      
      setShowMarkDoneModal(null)
      await loadData()
    } catch (error) {
      console.error('Error marking as done:', error)
    }
  }

  const getTypeLabel = (value: string) => {
    return MAINTENANCE_TYPES.find(t => t.value === value)?.label || value
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'
  }

  const getStatusIcon = (status: 'ok' | 'due_soon' | 'overdue') => {
    switch (status) {
      case 'ok': return <Check className="w-5 h-5 text-green-600" />
      case 'due_soon': return <Clock className="w-5 h-5 text-yellow-600" />
      case 'overdue': return <AlertTriangle className="w-5 h-5 text-red-600" />
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Stats
  const stats = {
    total: statuses.length,
    ok: statuses.filter(s => s.status === 'ok').length,
    dueSoon: statuses.filter(s => s.status === 'due_soon').length,
    overdue: statuses.filter(s => s.status === 'overdue').length
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
          Ajoutez d'abord un véhicule pour configurer son calendrier d'entretien.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendrier d'entretien</h1>
          <p className="text-gray-500">Planifiez et suivez vos entretiens</p>
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
          {filterVehicle && (
            <button 
              onClick={() => handleCreateDefaults(filterVehicle)} 
              className="btn btn-secondary flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Créer défauts
            </button>
          )}
          <button onClick={() => openModal()} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100">
            <CalendarCheck className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">À jour</p>
            <p className="text-xl font-bold text-green-600">{stats.ok}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-100">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">À faire bientôt</p>
            <p className="text-xl font-bold text-yellow-600">{stats.dueSoon}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">En retard</p>
            <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>
      </div>

      {/* Schedules list */}
      {statuses.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun calendrier d'entretien
          </h3>
          <p className="text-gray-500 mb-6">
            Configurez les intervalles d'entretien pour votre véhicule.
          </p>
          <div className="flex gap-3 justify-center">
            {filterVehicle && (
              <button 
                onClick={() => handleCreateDefaults(filterVehicle)} 
                className="btn btn-secondary flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Utiliser les valeurs par défaut
              </button>
            )}
            <button onClick={() => openModal()} className="btn btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Créer manuellement
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {statuses.map(({ schedule, status, nextDueDate, nextDueMileage, daysUntilDue, kmUntilDue }) => {
            const statusConfig = MAINTENANCE_STATUS_LABELS[status]
            
            return (
              <div 
                key={schedule.id} 
                className={`card hover:shadow-md transition-shadow ${
                  status === 'overdue' ? 'border-red-200 bg-red-50' : 
                  status === 'due_soon' ? 'border-yellow-200 bg-yellow-50' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      status === 'ok' ? 'bg-green-100' :
                      status === 'due_soon' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {getStatusIcon(status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${statusConfig.color}`}>
                          {statusConfig.icon} {statusConfig.label}
                        </span>
                        <span className="badge badge-info">
                          {getTypeLabel(schedule.maintenance_type)}
                        </span>
                        {!filterVehicle && (
                          <span className="text-sm text-gray-500">
                            {getVehicleName(schedule.vehicle_id)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg mt-1">{schedule.name}</h3>
                      
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        {schedule.interval_km && (
                          <span>Tous les {schedule.interval_km.toLocaleString()} km</span>
                        )}
                        {schedule.interval_months && (
                          <span>Tous les {schedule.interval_months} mois</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {schedule.last_done_date && (
                          <span className="text-gray-500">
                            Dernier: {formatDate(schedule.last_done_date)}
                            {schedule.last_done_mileage && ` (${schedule.last_done_mileage.toLocaleString()} km)`}
                          </span>
                        )}
                        {(nextDueDate || nextDueMileage) && (
                          <span className={status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            Prochain: 
                            {nextDueDate && ` ${formatDate(nextDueDate)}`}
                            {nextDueMileage && ` (${nextDueMileage.toLocaleString()} km)`}
                          </span>
                        )}
                      </div>

                      {(daysUntilDue !== null || kmUntilDue !== null) && (
                        <div className="flex gap-4 mt-1 text-sm">
                          {daysUntilDue !== null && (
                            <span className={daysUntilDue <= 0 ? 'text-red-600' : daysUntilDue <= 30 ? 'text-yellow-600' : 'text-gray-500'}>
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {daysUntilDue <= 0 ? `${Math.abs(daysUntilDue)} jours de retard` : `${daysUntilDue} jours restants`}
                            </span>
                          )}
                          {kmUntilDue !== null && (
                            <span className={kmUntilDue <= 0 ? 'text-red-600' : kmUntilDue <= 1000 ? 'text-yellow-600' : 'text-gray-500'}>
                              <Gauge className="w-3 h-3 inline mr-1" />
                              {kmUntilDue <= 0 ? `${Math.abs(kmUntilDue).toLocaleString()} km de retard` : `${kmUntilDue.toLocaleString()} km restants`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 sm:flex-col">
                    <button
                      onClick={() => openMarkDoneModal(schedule)}
                      className="btn btn-success flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Fait
                    </button>
                    <button
                      onClick={() => openModal(schedule)}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(schedule.id)}
                      className="btn btn-danger flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingSchedule ? 'Modifier le calendrier' : 'Nouveau calendrier d\'entretien'}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Type d'entretien *</label>
                  <select
                    className="input"
                    value={form.maintenance_type}
                    onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })}
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
                  <label className="label">Nom *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Ex: Vidange huile moteur"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Intervalle (km)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.interval_km || ''}
                    onChange={(e) => setForm({ ...form, interval_km: parseInt(e.target.value) || undefined })}
                    min="0"
                    placeholder="Ex: 15000"
                  />
                </div>
                <div>
                  <label className="label">Intervalle (mois)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.interval_months || ''}
                    onChange={(e) => setForm({ ...form, interval_months: parseInt(e.target.value) || undefined })}
                    min="0"
                    placeholder="Ex: 12"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                * Au moins un intervalle (km ou mois) est requis
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dernier entretien (date)</label>
                  <input
                    type="date"
                    className="input"
                    value={form.last_done_date || ''}
                    onChange={(e) => setForm({ ...form, last_done_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Dernier entretien (km)</label>
                  <input
                    type="number"
                    className="input"
                    value={form.last_done_mileage || ''}
                    onChange={(e) => setForm({ ...form, last_done_mileage: parseInt(e.target.value) || undefined })}
                    min="0"
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
                  placeholder="Informations complémentaires..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSchedule ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal "Marquer comme fait" */}
      {showMarkDoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Marquer comme effectué</h2>
              <button onClick={() => setShowMarkDoneModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Enregistrer <strong>{showMarkDoneModal.name}</strong> comme effectué :
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={markDoneForm.date}
                    onChange={(e) => setMarkDoneForm({ ...markDoneForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Kilométrage *</label>
                  <input
                    type="number"
                    className="input"
                    value={markDoneForm.mileage}
                    onChange={(e) => setMarkDoneForm({ ...markDoneForm, mileage: parseInt(e.target.value) || 0 })}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowMarkDoneModal(null)} 
                  className="btn btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleMarkDone} 
                  className="btn btn-success flex-1 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
