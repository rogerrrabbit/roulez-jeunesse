import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Lock, 
  Cloud, 
  Save, 
  Loader2, 
  Check, 
  AlertTriangle,
  Download,
  Upload,
  ExternalLink
} from 'lucide-react'

export function SettingsPage() {
  const { user } = useAuth()
  
  // Changement de mot de passe
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // OneDrive backup
  const [oneDriveConnected, setOneDriveConnected] = useState(false)
  const [oneDriveEmail, setOneDriveEmail] = useState<string | null>(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [autoBackup, setAutoBackup] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

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

  const connectOneDrive = async () => {
    // Simulation de connexion OneDrive (en production, utiliser Microsoft Graph API)
    setBackupLoading(true)
    setBackupMessage(null)
    
    try {
      // En production, ceci ouvrirait une popup OAuth2 Microsoft
      // Pour la démo, on simule une connexion réussie
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setOneDriveConnected(true)
      setOneDriveEmail('user@outlook.com')
      setBackupMessage({ type: 'success', text: 'Connexion à OneDrive réussie' })
    } catch (error: any) {
      setBackupMessage({ type: 'error', text: 'Erreur de connexion à OneDrive' })
    } finally {
      setBackupLoading(false)
    }
  }

  const disconnectOneDrive = () => {
    setOneDriveConnected(false)
    setOneDriveEmail(null)
    setAutoBackup(false)
    setLastBackup(null)
    setBackupMessage({ type: 'success', text: 'Déconnexion de OneDrive effectuée' })
  }

  const performBackup = async () => {
    if (!oneDriveConnected) return

    setBackupLoading(true)
    setBackupMessage(null)

    try {
      // Récupérer toutes les données de l'utilisateur
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

      // En production, ceci enverrait le fichier à OneDrive via Microsoft Graph API
      // Pour la démo, on télécharge le fichier localement
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roulez-jeunesse-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setLastBackup(new Date().toLocaleString('fr-FR'))
      setBackupMessage({ type: 'success', text: 'Sauvegarde effectuée avec succès' })
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

      // Confirmation avant restauration
      if (!confirm(`Voulez-vous restaurer les données du ${new Date(backupData.exportDate).toLocaleDateString('fr-FR')} ?\n\nAttention : ceci remplacera toutes vos données actuelles.`)) {
        setBackupLoading(false)
        return
      }

      // En production, implémenter la logique de restauration
      // Pour l'instant, afficher un message
      setBackupMessage({ type: 'success', text: 'Restauration terminée (fonctionnalité en développement)' })
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

      {/* Sauvegarde OneDrive */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-100">
            <Cloud className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Sauvegarde OneDrive</h2>
        </div>

        {!oneDriveConnected ? (
          <div className="text-center py-6">
            <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Connectez votre compte Microsoft OneDrive pour sauvegarder automatiquement vos données.
            </p>
            <button
              onClick={connectOneDrive}
              disabled={backupLoading}
              className="btn btn-primary flex items-center gap-2 mx-auto"
            >
              {backupLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Connecter OneDrive
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Connecté à OneDrive</p>
                  <p className="text-sm text-green-600">{oneDriveEmail}</p>
                </div>
              </div>
              <button
                onClick={disconnectOneDrive}
                className="text-sm text-green-700 hover:text-green-900 underline"
              >
                Déconnecter
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sauvegarde automatique</p>
                <p className="text-sm text-gray-500">Sauvegarder chaque semaine</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBackup}
                  onChange={(e) => setAutoBackup(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {lastBackup && (
              <p className="text-sm text-gray-500">
                Dernière sauvegarde : {lastBackup}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={performBackup}
                disabled={backupLoading}
                className="btn btn-primary flex items-center gap-2"
              >
                {backupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Sauvegarder maintenant
              </button>

              <label className="btn btn-secondary flex items-center gap-2 cursor-pointer">
                <Download className="w-4 h-4" />
                Restaurer
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

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
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">À propos des sauvegardes</p>
            <p>
              Les sauvegardes contiennent toutes vos données : véhicules, entretiens, rappels, 
              carburant et visites garage. Elles sont stockées au format JSON et peuvent être 
              restaurées à tout moment.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
