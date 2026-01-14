import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { garageVisitService } from '../lib/garage-visits.service'
import { MAINTENANCE_TYPES, maintenanceService } from '../lib/maintenance.service'
import type { Vehicle, GarageVisitWithItems, GarageVisitInsert, MaintenanceRecord } from '../lib/database.types'
import { 
  Wrench, 
  Plus, 
  Trash2, 
  X,
  Loader2,
  Calendar,
  Gauge,
  Euro,
  Filter,
  Car,
  ChevronDown,
  ChevronUp,
  FileText,
  Link,
  Check
} from 'lucide-react'

interface MaintenanceItem {
  id: string
  type: string
  description: string
  cost: number
  notes: string
}

export function GarageVisitsPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [visits, setVisits] = useState<GarageVisitWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterVehicle, setFilterVehicle] = useState<string>('')
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set())

  // Entretiens existants sans visite (pour rattachement)
  const [availableRecords, setAvailableRecords] = useState<MaintenanceRecord[]>([])
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set())
  const [loadingRecords, setLoadingRecords] = useState(false)

  // Modale de confirmation de suppression
  const [deleteConfirmVisit, setDeleteConfirmVisit] = useState<GarageVisitWithItems | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState<Partial<GarageVisitInsert>>({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    mileage: 0,
    garage_name: '',
    garage_address: '',
    invoice_number: '',
    notes: ''
  })

  const [items, setItems] = useState<MaintenanceItem[]>([
    { id: crypto.randomUUID(), type: 'oil_change', description: '', cost: 0, notes: '' }
  ])

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [vehiclesData, visitsData] = await Promise.all([
        vehicleService.getAll(user.id),
        garageVisitService.getAllWithItems(user.id)
      ])
      setVehicles(vehiclesData)
      setVisits(visitsData)
      
      if (vehiclesData.length > 0 && !form.vehicle_id) {
        setForm(f => ({ ...f, vehicle_id: vehiclesData[0].id, mileage: vehiclesData[0].current_mileage }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = async () => {
    const selectedVehicle = vehicles.find(v => v.id === filterVehicle) || vehicles[0]
    const vehicleId = filterVehicle || vehicles[0]?.id || ''
    
    setForm({
      vehicle_id: vehicleId,
      date: new Date().toISOString().split('T')[0],
      mileage: selectedVehicle?.current_mileage || 0,
      garage_name: '',
      garage_address: '',
      invoice_number: '',
      notes: ''
    })
    setItems([])
    setSelectedRecordIds(new Set())
    setShowModal(true)
    
    // Charger les entretiens existants sans visite pour ce véhicule
    if (vehicleId) {
      await loadAvailableRecords(vehicleId)
    }
  }

  const loadAvailableRecords = async (vehicleId: string) => {
    setLoadingRecords(true)
    try {
      const records = await maintenanceService.getWithoutVisit(vehicleId)
      setAvailableRecords(records)
    } catch (error) {
      console.error('Error loading available records:', error)
      setAvailableRecords([])
    } finally {
      setLoadingRecords(false)
    }
  }

  const handleVehicleChange = async (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    setForm({ 
      ...form, 
      vehicle_id: vehicleId,
      mileage: vehicle?.current_mileage || form.mileage 
    })
    setSelectedRecordIds(new Set())
    await loadAvailableRecords(vehicleId)
  }

  const toggleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecordIds)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedRecordIds(newSelected)
  }

  const getSelectedRecordsCost = () => {
    return availableRecords
      .filter(r => selectedRecordIds.has(r.id))
      .reduce((sum, r) => sum + r.cost, 0)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedRecordIds(new Set())
    setAvailableRecords([])
  }

  const addItem = () => {
    setItems([...items, { 
      id: crypto.randomUUID(), 
      type: 'oil_change', 
      description: '', 
      cost: 0, 
      notes: '' 
    }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id: string, field: keyof MaintenanceItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const getTotalCost = () => {
    const newItemsCost = items.reduce((sum, item) => sum + (item.cost || 0), 0)
    const selectedRecordsCost = getSelectedRecordsCost()
    return newItemsCost + selectedRecordsCost
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Vérifier qu'il y a au moins une prestation (nouvelle ou existante)
    if (items.length === 0 && selectedRecordIds.size === 0) {
      alert('Veuillez ajouter au moins une prestation ou sélectionner des entretiens existants')
      return
    }

    setSaving(true)
    try {
      const visitData: GarageVisitInsert = {
        ...form as GarageVisitInsert,
        user_id: user.id,
        total_cost: getTotalCost()
      }

      const maintenanceItems = items.map(item => ({
        vehicle_id: form.vehicle_id!,
        user_id: user.id,
        type: item.type,
        description: item.description || MAINTENANCE_TYPES.find(t => t.value === item.type)?.label || item.type,
        cost: item.cost || 0,
        notes: item.notes || null
      }))

      // Passer les IDs des entretiens existants à rattacher
      await garageVisitService.createWithItems(
        visitData, 
        maintenanceItems,
        Array.from(selectedRecordIds)
      )
      
      // Mettre à jour le kilométrage du véhicule si nécessaire
      const vehicle = vehicles.find(v => v.id === form.vehicle_id)
      if (vehicle && form.mileage && form.mileage > vehicle.current_mileage) {
        await vehicleService.updateMileage(vehicle.id, form.mileage)
      }
      
      await loadData()
      closeModal()
    } catch (error) {
      console.error('Error saving visit:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (visit: GarageVisitWithItems) => {
    setDeleteConfirmVisit(visit)
  }

  const confirmDelete = async (deleteItems: boolean) => {
    if (!deleteConfirmVisit) return
    
    setDeleting(true)
    try {
      if (deleteItems) {
        // Supprimer la visite ET les entretiens
        await garageVisitService.deleteWithItems(deleteConfirmVisit.id)
      } else {
        // Supprimer seulement la visite (les entretiens sont conservés avec visit_id = null)
        await garageVisitService.delete(deleteConfirmVisit.id)
      }
      await loadData()
      setDeleteConfirmVisit(null)
    } catch (error) {
      console.error('Error deleting visit:', error)
    } finally {
      setDeleting(false)
    }
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedVisits)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedVisits(newExpanded)
  }

  const getTypeLabel = (value: string) => {
    return MAINTENANCE_TYPES.find(t => t.value === value)?.label || value
  }

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    return vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Véhicule inconnu'
  }

  const filteredVisits = filterVehicle 
    ? visits.filter(v => v.vehicle_id === filterVehicle)
    : visits

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
          Ajoutez d'abord un véhicule pour enregistrer des visites garage.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visites garage</h1>
          <p className="text-gray-500">Enregistrez vos révisions avec plusieurs prestations</p>
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
          <button onClick={openModal} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle visite
          </button>
        </div>
      </div>

      {/* Visits list */}
      {filteredVisits.length === 0 ? (
        <div className="card text-center py-12">
          <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Aucune visite garage
          </h3>
          <p className="text-gray-500 mb-6">
            Enregistrez votre première visite avec plusieurs prestations.
          </p>
          <button onClick={openModal} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle visite
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVisits.map((visit) => (
            <div key={visit.id} className="card hover:shadow-md transition-shadow">
              {/* Visit header */}
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => toggleExpanded(visit.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-100">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge badge-info">
                        {visit.items.length} prestation{visit.items.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getVehicleName(visit.vehicle_id)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mt-1">
                      {visit.garage_name || 'Visite garage'}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(visit.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        {visit.mileage.toLocaleString()} km
                      </span>
                      <span className="flex items-center gap-1 font-medium text-gray-900">
                        <Euro className="w-4 h-4" />
                        {formatCurrency(visit.total_cost)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(visit)
                    }}
                    className="btn btn-danger flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedVisits.has(visit.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded items */}
              {expandedVisits.has(visit.id) && visit.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {visit.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <Wrench className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <span className="badge badge-success text-xs mr-2">
                            {getTypeLabel(item.type)}
                          </span>
                          <span className="font-medium">{item.description}</span>
                        </div>
                      </div>
                      <span className="font-medium">{formatCurrency(item.cost)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold">Nouvelle visite garage</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informations de la visite
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Véhicule *</label>
                    <select
                      className="input"
                      value={form.vehicle_id}
                      onChange={(e) => handleVehicleChange(e.target.value)}
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
                    <label className="label">N° de facture</label>
                    <input
                      type="text"
                      className="input"
                      value={form.invoice_number || ''}
                      onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                      placeholder="Optionnel"
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
                      placeholder="Ex: Garage Dupont"
                    />
                  </div>
                  <div>
                    <label className="label">Adresse</label>
                    <input
                      type="text"
                      className="input"
                      value={form.garage_address || ''}
                      onChange={(e) => setForm({ ...form, garage_address: e.target.value })}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>
              </div>

              {/* Entretiens existants à rattacher */}
              {(availableRecords.length > 0 || loadingRecords) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Link className="w-5 h-5" />
                      Rattacher des entretiens existants
                    </h3>
                    {selectedRecordIds.size > 0 && (
                      <span className="badge badge-success">
                        {selectedRecordIds.size} sélectionné{selectedRecordIds.size > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  
                  {loadingRecords ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Chargement...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                      {availableRecords.map((record) => (
                        <div 
                          key={record.id}
                          onClick={() => toggleRecordSelection(record.id)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                            selectedRecordIds.has(record.id) 
                              ? 'bg-green-50 border-2 border-green-500' 
                              : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedRecordIds.has(record.id) 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300'
                            }`}>
                              {selectedRecordIds.has(record.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div>
                              <span className="badge badge-info text-xs mr-2">
                                {getTypeLabel(record.type)}
                              </span>
                              <span className="font-medium text-sm">{record.description}</span>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {new Date(record.date).toLocaleDateString('fr-FR')} • {record.mileage.toLocaleString()} km
                              </div>
                            </div>
                          </div>
                          <span className="font-medium text-sm">{formatCurrency(record.cost)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Ces entretiens ne sont pas encore rattachés à une visite. Sélectionnez ceux effectués lors de cette visite.
                  </p>
                </div>
              )}

              {/* Nouvelles prestations */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Nouvelles prestations ({items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="btn btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>

                <div className="space-y-3">
                  {items.length === 0 && selectedRecordIds.size === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                      Ajoutez des nouvelles prestations ou sélectionnez des entretiens existants ci-dessus
                    </p>
                  )}
                  {items.map((item, index) => (
                    <div key={item.id} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          Prestation {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Type *</label>
                          <select
                            className="input text-sm"
                            value={item.type}
                            onChange={(e) => updateItem(item.id, 'type', e.target.value)}
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
                          <label className="label text-xs">Coût (€) *</label>
                          <input
                            type="number"
                            className="input text-sm"
                            value={item.cost || ''}
                            onChange={(e) => updateItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="label text-xs">Description</label>
                        <input
                          type="text"
                          className="input text-sm"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder={getTypeLabel(item.type)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                {selectedRecordIds.size > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Entretiens rattachés ({selectedRecordIds.size})</span>
                    <span>{formatCurrency(getSelectedRecordsCost())}</span>
                  </div>
                )}
                {items.length > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Nouvelles prestations ({items.length})</span>
                    <span>{formatCurrency(items.reduce((sum, item) => sum + (item.cost || 0), 0))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-blue-600">
                    {formatCurrency(getTotalCost())}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes générales</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observations, prochains entretiens à prévoir..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={closeModal} className="btn btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer la visite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {deleteConfirmVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-red-100">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold">Supprimer la visite</h2>
              </div>
              
              <p className="text-gray-600 mb-4">
                Cette visite contient <strong>{deleteConfirmVisit.items.length} prestation{deleteConfirmVisit.items.length > 1 ? 's' : ''}</strong>.
                Que souhaitez-vous faire ?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => confirmDelete(true)}
                  disabled={deleting}
                  className="w-full btn btn-danger flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Trash2 className="w-4 h-4" />
                  Tout supprimer (visite + prestations)
                </button>
                
                <button
                  onClick={() => confirmDelete(false)}
                  disabled={deleting}
                  className="w-full btn btn-secondary flex items-center justify-center gap-2"
                >
                  {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Supprimer la visite, conserver les prestations
                </button>
                
                <button
                  onClick={() => setDeleteConfirmVisit(null)}
                  disabled={deleting}
                  className="w-full btn bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Annuler
                </button>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Si vous conservez les prestations, elles resteront dans l'historique des entretiens 
                et pourront être rattachées à une autre visite.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
