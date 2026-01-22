# Roulez Jeunesse - Home Assistant Add-on

Carnet d'entretien automobile avec intégration native Home Assistant.

## 🚗 Fonctionnalités

- **Interface web complète** accessible via le panneau latéral de Home Assistant
- **Capteurs pour chaque véhicule** :
  - Kilométrage actuel
  - Consommation moyenne (L/100km)
  - Coûts (entretien, carburant, total)
  - Rappels en attente / en retard
  - Entretiens planifiés en retard
- **Binary sensor** "Attention requise" pour les automatisations

## 📦 Installation

### Méthode 1 : Add-on Store (recommandé)

1. Ajoutez ce dépôt aux add-ons Home Assistant :
   - Allez dans **Paramètres** → **Modules complémentaires** → **Boutique des modules**
   - Cliquez sur **⋮** (3 points) → **Dépôts**
   - Ajoutez : `https://github.com/votre-repo/roulez-jeunesse`
2. Installez "Roulez Jeunesse" depuis la boutique
3. Démarrez l'add-on

### Méthode 2 : Installation manuelle

1. Copiez le dossier `homeassistant-addon` dans `/addons/roulez-jeunesse/`
2. Redémarrez Home Assistant
3. Installez depuis la boutique des modules locaux

## ⚙️ Configuration

```yaml
database_path: /share/roulez-jeunesse/data.db
api_port: 8099
log_level: info
```

| Option | Description | Défaut |
|--------|-------------|--------|
| `database_path` | Chemin vers la base de données SQLite | `/share/roulez-jeunesse/data.db` |
| `api_port` | Port de l'API et interface web | `8099` |
| `log_level` | Niveau de log (debug/info/warn/error) | `info` |

## 🔌 Intégration Home Assistant

Après installation de l'add-on :

1. Copiez le dossier `custom_components/roulez_jeunesse` dans votre dossier `config/custom_components/`
2. Redémarrez Home Assistant
3. Allez dans **Paramètres** → **Appareils et services** → **Ajouter une intégration**
4. Cherchez "Roulez Jeunesse"
5. Configurez avec `localhost` et port `8099`

## 📊 Capteurs créés

Pour chaque véhicule enregistré, les capteurs suivants sont créés :

| Capteur | Type | Description |
|---------|------|-------------|
| `sensor.<vehicule>_kilometrage` | Distance | Kilométrage actuel |
| `sensor.<vehicule>_consommation` | L/100km | Consommation moyenne |
| `sensor.<vehicule>_cout_entretien` | € | Total des coûts d'entretien |
| `sensor.<vehicule>_cout_carburant` | € | Total des coûts de carburant |
| `sensor.<vehicule>_cout_total` | € | Coût total du véhicule |
| `sensor.<vehicule>_rappels_en_attente` | Nombre | Rappels non complétés |
| `sensor.<vehicule>_rappels_en_retard` | Nombre | Rappels dépassés |
| `sensor.<vehicule>_entretiens_en_retard` | Nombre | Entretiens planifiés dépassés |
| `binary_sensor.<vehicule>_attention_requise` | Problem | Si le véhicule nécessite attention |

## 🤖 Exemple d'automatisation

```yaml
automation:
  - alias: "Notification entretien véhicule"
    trigger:
      - platform: state
        entity_id: binary_sensor.peugeot_308_ab123cd_attention_requise
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          title: "🚗 Entretien requis"
          message: >
            Votre {{ state_attr('binary_sensor.peugeot_308_ab123cd_attention_requise', 'friendly_name') }} 
            nécessite votre attention : 
            {{ state_attr('binary_sensor.peugeot_308_ab123cd_attention_requise', 'overdue_items') | join(', ') }}
```

## 📡 API REST

L'add-on expose une API REST pour l'intégration :

- `GET /ha/metrics` - Toutes les métriques de tous les véhicules
- `GET /ha/health` - État de santé de l'add-on

Exemple de réponse `/ha/metrics` :

```json
{
  "version": "1.0",
  "timestamp": "2026-01-19T10:00:00.000Z",
  "vehicles": [
    {
      "id": "abc123",
      "slug": "peugeot_308_ab123cd",
      "name": "Peugeot 308",
      "license_plate": "AB-123-CD",
      "current_mileage": 85000,
      "avg_consumption": 6.2,
      "total_cost": 4500,
      "needs_attention": true,
      "overdue_maintenance_items": ["Vidange", "Pneus"]
    }
  ]
}
```

## 🔄 Migration depuis Supabase

Si vous utilisez déjà Roulez Jeunesse avec Supabase :

1. Exportez vos données depuis **Paramètres** → **Sauvegarde** → **Télécharger**
2. Importez dans l'add-on via l'interface web

## 📝 Licence

MIT License
