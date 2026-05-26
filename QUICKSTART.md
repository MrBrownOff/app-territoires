# ⚡ QUICKSTART - Démarrage Rapide (5 min)

## 📌 TL;DR - Les 4 étapes essentielles

### 1️⃣ **Supabase Setup (gratuit)**
```
1. Aller sur supabase.com → Créer compte
2. Créer nouveau projet
3. Éditeur SQL → Copier/coller SQL_INIT.sql → Exécuter
4. Copier les 2 clés (URL + ANON KEY)
```

### 2️⃣ **Variables d'environnement**
```bash
# Copier et remplir:
cp .env.example .env

# Ajouter dans .env:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...
WOOSMAP_API_KEY=votre_clé_woosmap
```

### 3️⃣ **Fichiers KML**
```bash
# Créer dossier et copier:
mkdir data
cp Distributeurs_Interbois_2025-CBN.kml data/
cp Ditributeurs_Canac_*.csv data/
```

### 4️⃣ **Lancer l'app**
```bash
npm install
npm start
# Ouvrir: http://localhost:3000
```

---

## 🚀 Pour aller en prod (HuggingFace Spaces)

### Préparation
```bash
# Créer repo GitHub
git init && git add . && git commit -m "init"

# Pousser sur GitHub
git remote add origin https://github.com/ton-username/app-territoires.git
git push -u origin main
```

### Sur HuggingFace
1. **Créer un Space:** huggingface.co/spaces → New Space
2. **Choisir:** Docker + Connected to GitHub
3. **Sélectionner:** Ton repo
4. **Ajouter secrets:** Settings → Secrets:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `WOOSMAP_API_KEY`

**Le reste se fait automatiquement! ✨**

---

## ✅ Vérification

L'app fonctionne si:
- ✅ Carte Woosmap affichée
- ✅ Clients (points bleus) visibles
- ✅ Prospects (points orange) visibles
- ✅ Outil "Dessiner zone" actif
- ✅ Bouton "Itinéraire" fonctionnel

---

## 📋 Checklist avant déploiement

- [ ] Clé Woosmap obtenue
- [ ] Compte Supabase créé
- [ ] Fichiers KML en place
- [ ] `.env` rempli
- [ ] `npm install` exécuté
- [ ] Test local OK (http://localhost:3000)
- [ ] Repo GitHub créé
- [ ] Space HF créé et connecté

---

## 🆘 Problèmes courants

| Problème | Solution |
|----------|----------|
| Carte noire | Vérifier clé Woosmap dans main.js |
| Pas de clients | Vérifier dossier /data et nom fichiers |
| Erreur Supabase | Vérifier SUPABASE_URL et KEY |
| Port déjà utilisé | Changer PORT dans .env |

---

**Bonne chance! 🎯**
