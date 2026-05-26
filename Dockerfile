FROM node:18-alpine

WORKDIR /app

# Copier package files
COPY package*.json ./

# Installer dépendances
RUN npm install --production

# Copier l'app
COPY . .

# Port HuggingFace Spaces
EXPOSE 7860

# Variables d'environnement par défaut
ENV PORT=7860
ENV NODE_ENV=production

# Démarrer l'application
CMD ["node", "src/server.js"]
