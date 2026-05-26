# 🗺️ Gestion Territoriale - Guide de Déploiement

## 📋 Architecture

```
Frontend: HTML/JS + Leaflet.js + Woosmap
Backend: Node.js + Express
BDD: PostgreSQL (Supabase)
Déploiement: HuggingFace Spaces + Supabase
```

---

## 🚀 SETUP LOCAL (Développement)

### 1️⃣ Prérequis
```bash
Node.js >= 14
npm ou yarn
Compte Supabase (gratuit)
Clé API Woosmap
```

### 2️⃣ Cloner/Créer le projet
```bash
cd app-territoires
npm install
```

### 3️⃣ Configurer les variables d'environnement

**Copier `.env.example` en `.env`:**
```bash
cp .env.example .env
```

**Remplir avec vos infos:**
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Woosmap
WOOSMAP_API_KEY=your-woosmap-key

# Server
PORT=3000
NODE_ENV=development
```

### 4️⃣ Charger fichiers KML

**Créer le dossier `/data`:**
```bash
mkdir data
```

**Copier les fichiers:**
- `Distributeurs_Interbois_2025-CBN.kml` → `/data/`
- `Ditributeurs_Canac_-_Points_de_vente_Interbois.csv` → `/data/`

### 5️⃣ Créer la BDD Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer nouveau projet
3. Aller dans l'éditeur SQL
4. Copier/coller le contenu de `SQL_INIT.sql`
5. Exécuter

Récupérer:
- `SUPABASE_URL`: Paramètres du projet
- `SUPABASE_KEY`: Clés API (anon)

### 6️⃣ Démarrer localement

```bash
npm start
# Ou avec nodemon:
npm run dev
```

Naviguer à: `http://localhost:3000`

---

## 🌐 DÉPLOIEMENT PRODUCTION

### 1️⃣ Préparer le repo GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2️⃣ Déployer sur Hugging Face Spaces

1. Aller sur [huggingface.co/spaces](https://huggingface.co/spaces)
2. Créer nouveau Space
3. Sélectionner: **Docker** (pour Node.js)
4. Créer le **Dockerfile:**

```dockerfile
FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 7860

CMD ["npm", "start"]
```

5. Ajouter au repo:
```bash
echo "PORT=7860" >> .env
```

6. Déployer en poussant le code

### 3️⃣ Configurer variables Spaces

Dans HuggingFace Spaces → Settings → Secrets:

```
SUPABASE_URL=https://...
SUPABASE_KEY=...
WOOSMAP_API_KEY=...
```

### 4️⃣ Accéder à l'app

L'app sera accessible à:
```
https://huggingface.co/spaces/your-username/app-territoires
```

---

## 🔑 CONFIGURATION WOOSMAP

### Créer une clé API

1. Aller sur [woosmap.com](https://www.woosmap.com/)
2. S'inscrire gratuitement
3. Créer une clé API
4. Ajouter domaines autorisés:
   - `localhost:3000`
   - `localhost:*`
   - `your-huggingface-space-url`

---

## 📂 Structure du projet

```
app-territoires/
├── src/
│   ├── server.js          # Backend Express
│   ├── kml-parser.js      # Parser KML
│   └── routes/            # Routes API
├── public/
│   ├── index.html         # Interface
│   ├── css/
│   │   └── style.css      # Styles
│   └── js/
│       └── main.js        # Logique frontend
├── data/                  # Fichiers KML/CSV
├── package.json
├── .env.example
├── .env                   # À créer localement
├── SQL_INIT.sql          # Script DB
├── Dockerfile            # Pour déploiement
└── README.md
```

---

## 🔄 API ENDPOINTS

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/clients` | GET | Charger tous les clients |
| `/api/prospects` | GET | Charger tous les prospects |
| `/api/zones` | GET | Charger les zones |
| `/api/zones` | POST | Créer/modifier une zone |
| `/api/zones/:id` | DELETE | Supprimer une zone |
| `/api/route` | POST | Calculer itinéraire |
| `/api/rep-locations` | GET | Charger domiciles reps |
| `/api/rep-location` | POST | Sauvegarder domicile |
| `/api/health` | GET | Vérifier serveur |

---

## 🐛 TROUBLESHOOTING

### "Cannot find module 'xml2js'"
```bash
npm install xml2js
```

### "CORS error"
Vérifier que `CORS` est activé dans le backend

### "Woosmap not defined"
Vérifier la clé API dans `public/js/main.js`

### "Database connection failed"
Vérifier les credentials Supabase dans `.env`

---

## 📝 NOTES

- Les domiciles des reps sont prédéfinis dans `SQL_INIT.sql`
- Les zones sont persistées dans PostgreSQL
- Les itinéraires sont calculés en temps réel via Woosmap
- Les fichiers KML sont chargés au démarrage

---

## 🎯 Fonctionnalités

✅ Affichage de la carte Woosmap  
✅ Dessin de zones (polygone)  
✅ Affichage clients/prospects  
✅ Calcul itinéraires  
✅ Persistance zones (PostgreSQL)  
✅ Interface simple et responsive  

---

## 📞 Support

Pour toute question, vérifier:
1. Les logs du serveur
2. La console du navigateur (F12)
3. Les variables d'environnement
4. La connexion Supabase

Bon développement! 🚀
