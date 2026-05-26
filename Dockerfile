FROM node:18-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dépendances
RUN npm install --production

# Copier l'app
COPY . .

# Port HuggingFace Spaces
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production

# Démarrer l'application
CMD ["node", "src/server.js"]
