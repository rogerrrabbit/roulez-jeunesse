import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Lock, 
  Save, 
  Loader2, 
  Check, 
  AlertTriangle,
  Download,
  Upload,
  HardDrive,
  Info
} from 'lucide-react'

export function SettingsPage() {
  const { user } = useAuth()
  
  // Changement de mot de passe
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Backup
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' })
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setPasswordMessage({ type: 'error', text: error.message || 'Erreur lors de la mise à jour du mot de passe' })
    } finally {
      setPasswordLoading(false)
    }
  }

  const performBackup = async () => {
    setBackupLoading(true)
    setBackupMessage(null)

    try {
      const [
        { data: vehicles },
        { data: maintenance },
        { data: reminders },
        { data: fuelLogs },
        { data: garageVisits },
        { data: schedules }
      ] = await Promise.all([
        supabase.from('vehicles').select('*').eq('user_id', user?.id),
        supabase.from('maintenance_records').select('*').eq('user_id', user?.id),
        supabase.from('reminders').select('*').eq('user_id', user?.id),
        supabase.from('fuel_logs').select('*').eq('user_id', user?.id),
        supabase.from('garage_visits').select('*').eq('user_id', user?.id),
        supabase.from('maintenance_schedules').select('*').eq('user_id', user?.id)
      ])

      const backupData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        user: user?.email,
        data: {
          vehicles: vehicles || [],
          maintenance_records: maintenance || [],
          reminders: reminders || [],
          fuel_logs: fuelLogs || [],
          garage_visits: garageVisits || [],
          maintenance_schedules: schedules || []
        }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roulez-jeunesse-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setBackupMessage({ type: 'success', text: 'Sauvegarde téléchargée avec succès' })
    } catch (error: any) {
      setBackupMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBackupLoading(true)
    setBackupMessage(null)

    try {
      const text = await file.text()
      const backupData = JSON.parse(text)

      if (!backupData.version || !backupData.data) {
        throw new Error('Format de fichier invalide')
      }

      if (!confirm(`Voulez-vous restaurer les données du ${new Date(backupData.exportDate).toLocaleDateString('fr-FR')} ?\n\nAttention : ceci remplacera toutes vos données actuelles.`)) {
        setBackupLoading(false)
        return
      }

      const userId = user?.id
      if (!userId) throw new Error('Utilisateur non connecté')

      // Supprimer les données existantes (dans l'ordre pour respecter les FK)
      await Promise.all([
        supabase.from('maintenance_records').delete().eq('user_id', userId),
        supabase.from('reminders').delete().eq('user_id', userId),
        supabase.from('fuel_logs').delete().eq('user_id', userId),
        supabase.from('garage_visits').delete().eq('user_id', userId),
        supabase.from('maintenance_schedules').delete().eq('user_id', userId)
      ])
      await supabase.from('vehicles').delete().eq('user_id', userId)

      // Réinsérer les véhicules
      if (backupData.data.vehicles?.length > 0) {
        const vehicles = backupData.data.vehicles.map((v: any) => ({
          ...v,
          user_id: userId,
          id: undefined
        }))
        
        const { data: insertedVehicles, error: vehicleError } = await supabase
          .from('vehicles')
          .insert(vehicles)
          .select()

        if (vehicleError) throw vehicleError

        // Mapping ancien ID -> nouveau ID
        const vehicleIdMap = new Map<string, string>()
        backupData.data.vehicles.forEach((v: any, index: number) => {
          if (insertedVehicles?.[index]) {
            vehicleIdMap.set(v.id, insertedVehicles[index].id)
          }
        })

        // Insérer les autres données avec les nouveaux IDs
        const insertWithMapping = async (tableName: string, records: any[]) => {
          if (!records?.length) return
          
          const mappedRecords = records.map((r: any) => ({
            ...r,
            id: undefined,
            user_id: userId,
            vehicle_id: vehicleIdMap.get(r.vehicle_id) || r.vehicle_id
          }))

          await supabase.from(tableName).insert(mappedRecords)
        }

        await Promise.all([
          insertWithMapping('maintenance_records', backupData.data.maintenance_records),
          insertWithMapping('reminders', backupData.data.reminders),
          insertWithMapping('fuel_logs', backupData.data.fuel_logs),
          insertWithMapping('garage_visits', backupData.data.garage_visits),
          insertWithMapping('maintenance_schedules', backupData.data.maintenance_schedules)
        ])
      }

      setBackupMessage({ type: 'success', text: 'Restauration terminée avec succès ! Rechargez la page pour voir vos données.' })
    } catch (error: any) {
      setBackupMessage({ type: 'error', text: error.message || 'Erreur lors de la restauration' })
    } finally {
      setBackupLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres du compte</h1>
        <p className="text-gray-500">Gérez votre compte et vos sauvegardes</p>
      </div>

      {/* Informations du compte */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{user?.email}</h2>
            <p className="text-sm text-gray-500">Membre depuis {new Date(user?.created_at || '').toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </div>

      {/* Changement de mot de passe */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-100">
            <Lock className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {passwordMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {passwordMessage.type === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              {passwordMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordLoading}
            className="btn btn-primary flex items-center gap-2"
          >
            {passwordLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Mettre à jour le mot de passe
          </button>
        </form>
      </div>

      {/* Sauvegarde et restauration */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <HardDrive className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Sauvegarde et restauration</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Exportez vos données dans un fichier JSON ou restaurez-les depuis une sauvegarde précédente.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={performBackup}
            disabled={backupLoading}
            className="btn btn-primary flex items-center gap-2"
          >
            {backupLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Télécharger une sauvegarde
          </button>

          <label className="btn btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Restaurer depuis un fichier
            <input
              type="file"
              accept=".json"
              onChange={handleRestore}
              disabled={backupLoading}
              className="hidden"
            />
          </label>
        </div>

        {backupMessage && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mt-4 ${
            backupMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {backupMessage.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            {backupMessage.text}
          </div>
        )}
      </div>

      {/* Info supplémentaire */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">À propos des sauvegardes</p>
            <p>
              Les sauvegardes contiennent toutes vos données : véhicules, entretiens, rappels, 
              carburant et visites garage. Elles sont stockées au format JSON et peuvent être 
              restaurées à tout moment. Pensez à faire des sauvegardes régulières !
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
