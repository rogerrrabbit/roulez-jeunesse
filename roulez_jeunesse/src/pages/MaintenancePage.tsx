import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { vehicleService } from '../lib/vehicles.service'
import { maintenanceService, MAINTENANCE_TYPES } from '../lib/maintenance.service'
import { garageVisitService } from '../lib/garage-visits.service'
import { MaintenanceModal } from '../components/MaintenanceModal'
import type { Vehicle, MaintenanceRecord, GarageVisit } from '../lib/database.types'
import { 
  Wrench, 
  Plus, 
  Edit, 
  Trash2, 
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
  const [visits, setVisits] = useState<GarageVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null)
  const [filterVehicle, setFilterVehicle] = useState<string>('')

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [vehiclesData, recordsData, visitsData] = await Promise.all([
        vehicleService.getAll(user.id),
        maintenanceService.getAll(user.id),
        garageVisitService.getAll(user.id)
      ])
      setVehicles(vehiclesData)
      setRecords(recordsData)
      setVisits(visitsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (record?: MaintenanceRecord) => {
    setEditingRecord(record || null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingRecord(null)
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

  // Grouper les entretiens par année
  const recordsByYear = filteredRecords.reduce((acc, record) => {
    const year = new Date(record.date).getFullYear()
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(record)
    return acc
  }, {} as Record<number, MaintenanceRecord[]>)

  // Trier les années par ordre décroissant
  const sortedYears = Object.keys(recordsByYear)
    .map(Number)
    .sort((a, b) => b - a)

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
        <div className="space-y-6">
          {sortedYears.map((year) => (
            <div key={year}>
              {/* Séparateur d'année */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="px-4 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-600">
                  {year}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              
              {/* Entretiens de l'année */}
              <div className="space-y-4">
                {recordsByYear[year].map((record) => (
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
                              {record.visit_id && (() => {
                                const visit = visits.find(v => v.id === record.visit_id)
                                return visit?.title ? ` • ${visit.title}` : null
                              })()}
                            </p>
                          )}
                          {!record.garage_name && record.visit_id && (() => {
                            const visit = visits.find(v => v.id === record.visit_id)
                            return visit?.title ? (
                              <p className="text-sm text-gray-500 mt-1">
                                📄 {visit.title}
                              </p>
                            ) : null
                          })()}
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
            </div>
          ))}
        </div>
      )}

      {/* Modal partagée */}
      {user && (
        <MaintenanceModal
          isOpen={showModal}
          onClose={closeModal}
          onSaved={loadData}
          vehicles={vehicles}
          userId={user.id}
          editingRecord={editingRecord}
          preselectedVehicleId={filterVehicle}
        />
      )}
    </div>
  )
}
