# 🔧 GUIA DE SOLUÇÃO DE PROBLEMAS

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Erro de Dependências (ERESOLVE)**
```
npm error ERESOLVE unable to resolve dependency tree
npm error Found: express@5.1.0
```

**Causa**: Express 5.1.0 é muito novo e tem incompatibilidades

**Solução**: ✅ **JÁ CORRIGIDO**
- Downgrade para Express 4.18.2
- Ajustadas todas as dependências para versões estáveis

### 2. **Backend Não Inicia**
```
Error: connect ECONNREFUSED ::1:3001
```

**Causa**: Servidor não está rodando na porta 3001

**Solução**: 
1. Limpar dependências
2. Reinstalar
3. Testar servidor simples primeiro

### 3. **Proxy do Vite Falhando**
```
10:07:11 PM [vite] http proxy error: /api/auth/login
```

**Causa**: Frontend não consegue conectar ao backend

**Solução**: Resolver problemas do backend primeiro

## 🛠️ SOLUÇÕES PASSO A PASSO

### Opção 1: Script Automático (Recomendado)

```bash
# No diretório backend
chmod +x fix-and-start.sh
./fix-and-start.sh
```

### Opção 2: Manual

```bash
# 1. Limpar dependências
cd backend
rm -rf node_modules
rm -f package-lock.json

# 2. Reinstalar
npm install

# 3. Testar servidor simples
node server-simple.js

# 4. Em outro terminal, testar conectividade
curl http://localhost:3001/health

# 5. Se funcionar, iniciar servidor completo
node server.js
```

### Opção 3: Docker (Se estiver usando)

```bash
# Reconstruir container
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## 🧪 TESTES

### Teste 1: Servidor Simples
```bash
node server-simple.js
```

### Teste 2: Conectividade
```bash
curl http://localhost:3001/health
```

### Teste 3: Endpoint de Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Teste 4: Script Automático
```bash
node test-server.js
```

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] Dependências instaladas sem erros
- [ ] Servidor simples funciona
- [ ] Health check responde
- [ ] Endpoint de login responde
- [ ] Frontend consegue conectar
- [ ] Todas as rotas funcionam

## 🔍 LOGS IMPORTANTES

### Logs de Sucesso
```
🚀 Servidor rodando na porta 3001
📊 Ambiente: development
✅ Sistema inicializado com sucesso!
```

### Logs de Erro Comuns
```
Error: Cannot find module 'express'
→ npm install

Error: listen EADDRINUSE :::3001
→ killall node (ou mudar porta)

Error: connect ECONNREFUSED
→ Verificar se servidor está rodando
```

## 🚀 DEPOIS DE RESOLVER

1. **Testar todas as funcionalidades**:
   - Logs estruturados
   - Rate limiting
   - SMS/WhatsApp
   - Planejamento financeiro
   - Relatórios PDF
   - API externa
   - Paginação
   - Database indexing

2. **Verificar rotas**:
   - `GET /health`
   - `POST /api/auth/login`
   - `GET /api/planning/health`
   - `GET /api/external/all`

3. **Testar frontend**:
   - Login
   - Dashboard
   - Todas as funcionalidades

## 📞 SUPORTE

Se os problemas persistirem:

1. Verificar logs do Docker: `docker-compose logs`
2. Verificar logs do backend: `tail -f logs/app-*.log`
3. Testar conectividade: `curl http://localhost:3001/health`
4. Verificar portas: `netstat -tulpn | grep 3001`

---

**🎯 OBJETIVO**: Ter o sistema funcionando com todas as funcionalidades implementadas! 