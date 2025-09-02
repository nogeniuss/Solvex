FROM node:18

WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./

# Copiar código fonte
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Instalar dependências do backend
WORKDIR /app/backend
RUN npm install

# Instalar dependências do frontend
WORKDIR /app/frontend
RUN npm install

# Voltar para o diretório raiz
WORKDIR /app

# Script para iniciar backend e frontend
RUN echo '#!/bin/bash\n\
echo "🚀 Iniciando serviços..."\n\
\n\
# Aguardar o banco de dados\n\
echo "Aguardando o banco de dados..."\n\
until nc -z mariadb 3306; do\n\
  echo "MariaDB não está disponível ainda..."\n\
  sleep 2\n\
done\n\
echo "✅ Banco de dados está pronto!"\n\
\n\
# Iniciar backend\n\
echo "Iniciando backend..."\n\
cd /app/backend\n\
npm run dev & \n\
BACKEND_PID=$!\n\
\n\
# Iniciar frontend\n\
echo "Iniciando frontend..."\n\
cd /app/frontend\n\
npm run dev -- --host 0.0.0.0 & \n\
FRONTEND_PID=$!\n\
\n\
# Monitorar processos\n\
echo "Monitorando processos..."\n\
wait $BACKEND_PID $FRONTEND_PID' > /app/start.sh

RUN chmod +x /app/start.sh

# Instalar netcat para verificar a disponibilidade do banco
RUN apt-get update && apt-get install -y netcat-traditional && rm -rf /var/lib/apt/lists/*

CMD ["./start.sh"] 