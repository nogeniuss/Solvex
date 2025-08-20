const axios = require('axios');

async function testServer() {
  try {
    console.log('🧪 Testando servidor...');
    
    // Teste 1: Health check
    console.log('1. Testando health check...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Teste 2: Rota principal
    console.log('2. Testando rota principal...');
    const mainResponse = await axios.get('http://localhost:3001/');
    console.log('✅ Rota principal:', mainResponse.data);
    
    // Teste 3: Login endpoint
    console.log('3. Testando endpoint de login...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'test@test.com',
      password: 'test123'
    });
    console.log('✅ Login endpoint:', loginResponse.data);
    
    console.log('🎉 Todos os testes passaram!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Executar teste
testServer(); 