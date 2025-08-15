# Fáze 1: Builder - sestavení produkčního balíčku
FROM node:20-alpine AS builder

WORKDIR /app

# Zkopírujeme všechny soubory potřebné pro build
# .dockerignore by měl zajistit, že se nekopíruje zbytečný balast
COPY . .

# Spustíme build skript, který provede všechny kroky
# (npm ci, npm run build, vytvoření /dist složky s čistým balíčkem)
# Poznámka: Skript musí být spustitelný.
RUN chmod +x ./scripts/build_package.mjs
RUN node ./scripts/build_package.mjs

# Fáze 2: Runtime - finální, odlehčená image
FROM node:20-alpine-slim

WORKDIR /app

# Nastavíme produkční prostředí
ENV NODE_ENV=production

# Zkopírujeme pouze čistý produkční balíček z builder fáze
COPY --from=builder /app/dist .

# Nainstalujeme pouze produkční závislosti
RUN npm ci --omit=dev

# Exponujeme port, na kterém běží aplikace
EXPOSE 8080

# Spustíme aplikaci
CMD ["node", "server.js"]
