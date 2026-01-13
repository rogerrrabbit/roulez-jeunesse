# Roulez Jeunesse 🚗

Carnet d'entretien automobile complet - Application web moderne construite avec Vite, React et Supabase.

## Fonctionnalités

- **🚗 Gestion des véhicules** : Ajoutez et gérez plusieurs véhicules avec leurs informations complètes
- **🔧 Suivi des entretiens** : Enregistrez tous les entretiens (vidange, freins, pneus, etc.) avec leur coût
- **⛽ Suivi du carburant** : Enregistrez vos pleins et calculez votre consommation moyenne
- **🔔 Rappels** : Créez des rappels pour ne jamais oublier un entretien important
- **📊 Tableau de bord** : Vue d'ensemble de vos véhicules et dépenses
- **🔐 Authentification** : Connexion sécurisée via Supabase Auth

## Technologies

- **Frontend** : React 19 + TypeScript + Vite
- **Styling** : Tailwind CSS 4
- **Base de données** : PostgreSQL (Supabase)
- **Authentification** : Supabase Auth
- **Déploiement** : Cloudflare Pages
- **Icônes** : Lucide React

## Installation

### Prérequis

- Node.js 18+
- Compte Supabase (gratuit)
- Compte Cloudflare (gratuit)

### 1. Cloner et installer

```bash
cd roulez-jeunesse
npm install
```

### 2. Configurer Supabase

1. Créez un nouveau projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** et exécutez le script `supabase/schema.sql`
3. Récupérez vos clés dans **Settings > API** :
   - Project URL
   - anon/public key

### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon
```

### 4. Lancer le développement

```bash
npm run dev
```

L'application sera accessible sur http://localhost:5173

## Déploiement sur Cloudflare Pages

### Option 1 : Via le CLI

```bash
npm run deploy
```

### Option 2 : Via GitHub (recommandé)

1. Poussez votre code sur GitHub
2. Connectez le repo à Cloudflare Pages
3. Configuration du build :
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
4. Ajoutez les variables d'environnement dans les paramètres Cloudflare Pages

## Structure du projet

```
roulez-jeunesse/
├── src/
│   ├── components/      # Composants réutilisables
│   │   └── Layout.tsx   # Layout principal avec navigation
│   ├── contexts/        # Contextes React
│   │   └── AuthContext.tsx
│   ├── lib/             # Services et utilitaires
│   │   ├── supabase.ts  # Client Supabase
│   │   ├── database.types.ts
│   │   ├── vehicles.service.ts
│   │   ├── maintenance.service.ts
│   │   ├── reminders.service.ts
│   │   └── fuel.service.ts
│   ├── pages/           # Pages de l'application
│   │   ├── DashboardPage.tsx
│   │   ├── VehiclesPage.tsx
│   │   ├── VehicleDetailPage.tsx
│   │   ├── MaintenancePage.tsx
│   │   ├── RemindersPage.tsx
│   │   ├── FuelPage.tsx
│   │   └── LoginPage.tsx
│   ├── App.tsx          # Routes de l'application
│   ├── main.tsx         # Point d'entrée
│   └── index.css        # Styles globaux
├── supabase/
│   └── schema.sql       # Schéma de la base de données
├── wrangler.toml        # Configuration Cloudflare
└── package.json
```

## Types d'entretien disponibles

- Vidange
- Changement de pneus
- Freins
- Batterie
- Courroie de distribution
- Filtres
- Bougies
- Suspension
- Échappement
- Embrayage
- Boîte de vitesses
- Refroidissement
- Électrique
- Carrosserie
- Contrôle technique
- Assurance
- Autre

## Types de carburant supportés

- SP95
- SP98
- SP95-E10
- Diesel
- E85
- GPL
- Électrique
- Hybride

## Licence

MIT
