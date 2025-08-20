#!/bin/bash

echo "🔧 Corrigindo problemas do sistema..."

# 1. Limpar node_modules e package-lock.json
echo "1. Limpando dependências antigas..."
rm -rf node_modules
rm -f package-lock.json

# 2. Instalar dependências
echo "2. Instalando dependências..."
npm install

# 3. Verificar se há erros
echo "3. Verificando dependências..."
npm audit --audit-level=moderate

# 4. Testar servidor simples primeiro
echo "4. Testando servidor simples..."
node server-simple.js &
SERVER_PID=$!

# Aguardar servidor iniciar
sleep 3

# 5. Testar conectividade
echo "5. Testando conectividade..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Servidor simples funcionando!"
    
    # Parar servidor simples
    kill $SERVER_PID
    
    # 6. Iniciar servidor completo
    echo "6. Iniciando servidor completo..."
    node server.js
else
    echo "❌ Servidor simples não está funcionando"
    kill $SERVER_PID
    exit 1
fi 