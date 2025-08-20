FROM node:18-slim

WORKDIR /app

# Instalar dependências básicas
RUN apt-get update && apt-get install -y default-mysql-client && rm -rf /var/lib/apt/lists/*

# Expor portas
EXPOSE 3000 3001

# Script para aguardar e rodar
CMD sh -c "\
  echo '⏳ Aguardando dependências...' && \
  until [ -d /app/backend/node_modules ] && [ -d /app/frontend/node_modules ]; do \
    echo 'Instalando dependências no host primeiro...' && \
    sleep 5; \
  done && \
  echo '🚀 Iniciando backend e frontend...' && \
  cd /app/backend && npm run dev & \
  cd /app/frontend && npm run dev -- --host 0.0.0.0 & \
  wait" 