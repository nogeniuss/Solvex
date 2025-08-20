import React, { useState, useEffect } from 'react'
import PaymentPage from './PaymentPage'
import PaymentErrorBoundary from './PaymentErrorBoundary'

const AuthForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})
  const [loginMethod, setLoginMethod] = useState('email')

  // Validação em tempo real
  useEffect(() => {
    validateFields()
  }, [formData, isLogin])

  const validateFields = () => {
    const errors = {}

    // Validação do nome
    if (!isLogin && formData.nome) {
      if (formData.nome.length < 2) {
        errors.nome = 'Nome deve ter pelo menos 2 caracteres'
      } else if (formData.nome.length > 100) {
        errors.nome = 'Nome deve ter no máximo 100 caracteres'
      }
    }

    // Validação do email
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Email deve ser válido'
      }
    }

    // Validação do telefone
    if (formData.telefone) {
      const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/
      if (!phoneRegex.test(formData.telefone)) {
        errors.telefone = 'Telefone deve estar no formato (XX) XXXXX-XXXX'
      }
    }

    // Validação da senha
    if (formData.senha) {
      if (formData.senha.length < 6) {
        errors.senha = 'Senha deve ter pelo menos 6 caracteres'
      } else if (formData.senha.length > 128) {
        errors.senha = 'Senha deve ter no máximo 128 caracteres'
      }
    }

    // Validação da confirmação de senha
    if (!isLogin && formData.confirmarSenha) {
      if (formData.senha !== formData.confirmarSenha) {
        errors.confirmarSenha = 'Senhas não coincidem'
      }
    }

    setFieldErrors(errors)
  }

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: '', color: '' }
    
    let strength = 0
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ]
    
    strength = checks.filter(Boolean).length
    
    const levels = [
      { strength: 0, text: '', color: '' },
      { strength: 1, text: 'Muito fraca', color: 'var(--danger-color)' },
      { strength: 2, text: 'Fraca', color: 'var(--warning-color)' },
      { strength: 3, text: 'Regular', color: 'var(--warning-color)' },
      { strength: 4, text: 'Forte', color: 'var(--success-color)' },
      { strength: 5, text: 'Muito forte', color: 'var(--success-color)' }
    ]
    
    return levels[strength]
  }

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '')
    
    if (cleaned.length <= 2) {
      return cleaned.length === 0 ? '' : `(${cleaned}`
    } else if (cleaned.length <= 7) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
    } else if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    } else {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validar se há erros
    if (Object.keys(fieldErrors).length > 0) {
      setError('Por favor, corrija os erros nos campos')
      setLoading(false)
      return
    }

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      
      // Limpar telefone para envio
      const cleanPhone = formData.telefone.replace(/\D/g, '')
      
      const payload = isLogin 
        ? { 
            [loginMethod]: loginMethod === 'telefone' ? cleanPhone : formData[loginMethod], 
            senha: formData.senha 
          }
        : { 
            nome: formData.nome, 
            email: formData.email, 
            telefone: cleanPhone, 
            senha: formData.senha 
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        if (isLogin) {
          // Login - por enquanto ir direto (verificação depois)
          onLogin(data.user, data.token)
        } else {
          // Cadastro realizado - redirecionar SEMPRE para pagamento
          setRegisteredUser(data.user)
          setShowPayment(true)
          setSuccess('🎉 Conta criada com sucesso! Complete sua assinatura para acessar o sistema.')
        }
      } else {
        // Tratar diferentes tipos de erro
        if (response.status === 409) {
          if (data.error.includes('Email')) {
            setError('❌ Este email já está cadastrado. Tente fazer login ou use outro email.')
          } else if (data.error.includes('Telefone')) {
            setError('❌ Este telefone já está cadastrado. Tente fazer login ou use outro telefone.')
          } else {
            setError('❌ ' + data.error)
          }
        } else {
          setError(data.error || 'Erro na autenticação')
        }
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('📧 ' + data.message)
      } else {
        setError(data.error || 'Erro ao solicitar redefinição de senha')
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    let formattedValue = value
    
    // Aplicar máscara no telefone
    if (name === 'telefone') {
      formattedValue = formatPhoneNumber(value)
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }))
    
    // Marcar campo como tocado
    setTouchedFields(prev => ({
      ...prev,
      [name]: true
    }))
  }

  const handleBlur = (fieldName) => {
    setTouchedFields(prev => ({
      ...prev,
      [fieldName]: true
    }))
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setShowForgotPassword(false)
    setShowPayment(false)
    setRegisteredUser(null)
    setLoginMethod('email')
    setError('')
    setSuccess('')
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      senha: '',
      confirmarSenha: ''
    })
    setFieldErrors({})
    setTouchedFields({})
  }

  const handlePaymentSuccess = async () => {
    // Pagamento realizado com sucesso - fazer login automático
    if (registeredUser) {
      try {
        // Fazer login automático com as credenciais do usuário recém-cadastrado
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: registeredUser.email,
            senha: formData.senha // Usar a senha que foi digitada no cadastro
          })
        })

        const data = await response.json()

        if (response.ok) {
          // Login automático bem-sucedido
          onLogin(data.user, data.token)
          setSuccess('✅ Pagamento realizado com sucesso! Bem-vindo ao sistema!')
        } else {
          // Se login automático falhar, pelo menos limpar a tela de pagamento
          setShowPayment(false)
          setRegisteredUser(null)
          setSuccess('✅ Pagamento realizado! Faça login para acessar o sistema.')
        }
      } catch (error) {
        console.error('Erro no login automático:', error)
        setShowPayment(false)
        setRegisteredUser(null)
        setSuccess('✅ Pagamento realizado! Faça login para acessar o sistema.')
      }
    }
  }

  const handlePaymentCancel = () => {
    setShowPayment(false)
    setRegisteredUser(null)
    setError('Pagamento cancelado. Você pode tentar novamente quando quiser.')
  }

  const showForgotPasswordForm = () => {
    setShowForgotPassword(true)
    setShowPayment(false)
    setError('')
    setSuccess('')
  }

  const backToLogin = () => {
    setShowForgotPassword(false)
    setShowPayment(false)
    setRegisteredUser(null)
    setError('')
    setSuccess('')
  }

  const isFormValid = () => {
    if (showForgotPassword) {
      return formData.email && !fieldErrors.email
    }
    
    if (isLogin) {
      return formData[loginMethod] && formData.senha && 
             !fieldErrors[loginMethod] && !fieldErrors.senha
    } else {
      return formData.nome && formData.email && formData.telefone && 
             formData.senha && formData.confirmarSenha &&
             Object.keys(fieldErrors).length === 0
    }
  }

  const getFieldIcon = (fieldName) => {
    const icons = {
      nome: '👤',
      email: '📧',
      telefone: '📱',
      senha: '🔒',
      confirmarSenha: '🔒'
    }
    return icons[fieldName] || ''
  }

  // Mostrar tela de pagamento
  if (showPayment && registeredUser) {
    return (
      <PaymentErrorBoundary onCancel={handlePaymentCancel}>
        <PaymentPage 
          user={registeredUser}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      </PaymentErrorBoundary>
    )
  }

  if (showForgotPassword) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon">🔐</div>
            <h2>Esqueci minha senha</h2>
            <p>Digite seu email para receber as instruções de redefinição de senha</p>
          </div>

          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle"></i>
              {success}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">
                <span className="field-icon">📧</span>
                E-mail
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`form-control ${
                    touchedFields.email && fieldErrors.email ? 'error' : ''
                  } ${touchedFields.email && !fieldErrors.email && formData.email ? 'success' : ''}`}
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="Digite seu e-mail"
                  required
                />
                {touchedFields.email && !fieldErrors.email && formData.email && (
                  <span className="field-check">✓</span>
                )}
              </div>
              {touchedFields.email && fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Enviando...
                </>
              ) : (
                <>
                  <span>📤</span>
                  Enviar instruções
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              className="btn btn-text"
              onClick={backToLogin}
            >
              ← Voltar para o login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            {isLogin ? '🚀' : '🌟'}
          </div>
          <h2>
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </h2>
          <p>
            {isLogin 
              ? 'Acesse sua conta para gerenciar suas finanças pessoais'
              : 'Junte-se a nós e tenha controle total das suas finanças'
            }
          </p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <i className="fas fa-check-circle"></i>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="nome">
                <span className="field-icon">{getFieldIcon('nome')}</span>
                Nome Completo
              </label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  className={`form-control ${
                    touchedFields.nome && fieldErrors.nome ? 'error' : ''
                  } ${touchedFields.nome && !fieldErrors.nome && formData.nome ? 'success' : ''}`}
                  value={formData.nome}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('nome')}
                  placeholder="Digite seu nome completo"
                  required={!isLogin}
                />
                {touchedFields.nome && !fieldErrors.nome && formData.nome && (
                  <span className="field-check">✓</span>
                )}
              </div>
              {touchedFields.nome && fieldErrors.nome && (
                <span className="field-error">{fieldErrors.nome}</span>
              )}
            </div>
          )}

          {isLogin && (
            <div className="form-group">
              <label>Método de Login</label>
              <div className="login-method-toggle">
                <label className={`method-option ${loginMethod === 'email' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="loginMethod"
                    value="email"
                    checked={loginMethod === 'email'}
                    onChange={(e) => setLoginMethod(e.target.value)}
                  />
                  <span className="method-icon">📧</span>
                  E-mail
                </label>
                <label className={`method-option ${loginMethod === 'telefone' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="loginMethod"
                    value="telefone"
                    checked={loginMethod === 'telefone'}
                    onChange={(e) => setLoginMethod(e.target.value)}
                  />
                  <span className="method-icon">📱</span>
                  Telefone
                </label>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor={loginMethod}>
              <span className="field-icon">{getFieldIcon(loginMethod)}</span>
              {isLogin ? (loginMethod === 'email' ? 'E-mail' : 'Telefone') : 'E-mail'}
            </label>
            <div className="input-wrapper">
              <input
                type={isLogin && loginMethod === 'telefone' ? 'tel' : 'email'}
                id={loginMethod}
                name={loginMethod}
                className={`form-control ${
                  touchedFields[loginMethod] && fieldErrors[loginMethod] ? 'error' : ''
                } ${touchedFields[loginMethod] && !fieldErrors[loginMethod] && formData[loginMethod] ? 'success' : ''}`}
                value={formData[loginMethod]}
                onChange={handleInputChange}
                onBlur={() => handleBlur(loginMethod)}
                placeholder={
                  isLogin 
                    ? (loginMethod === 'email' ? 'Digite seu e-mail' : 'Digite seu telefone')
                    : 'Digite seu e-mail'
                }
                required
              />
              {touchedFields[loginMethod] && !fieldErrors[loginMethod] && formData[loginMethod] && (
                <span className="field-check">✓</span>
              )}
            </div>
            {touchedFields[loginMethod] && fieldErrors[loginMethod] && (
              <span className="field-error">{fieldErrors[loginMethod]}</span>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="telefone">
                <span className="field-icon">{getFieldIcon('telefone')}</span>
                Telefone
              </label>
              <div className="input-wrapper">
                <input
                  type="tel"
                  id="telefone"
                  name="telefone"
                  className={`form-control ${
                    touchedFields.telefone && fieldErrors.telefone ? 'error' : ''
                  } ${touchedFields.telefone && !fieldErrors.telefone && formData.telefone ? 'success' : ''}`}
                  value={formData.telefone}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('telefone')}
                  placeholder="(11) 99999-9999"
                  required={!isLogin}
                />
                {touchedFields.telefone && !fieldErrors.telefone && formData.telefone && (
                  <span className="field-check">✓</span>
                )}
              </div>
              {touchedFields.telefone && fieldErrors.telefone && (
                <span className="field-error">{fieldErrors.telefone}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="senha">
              <span className="field-icon">{getFieldIcon('senha')}</span>
              Senha
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="senha"
                name="senha"
                className={`form-control ${
                  touchedFields.senha && fieldErrors.senha ? 'error' : ''
                } ${touchedFields.senha && !fieldErrors.senha && formData.senha ? 'success' : ''}`}
                value={formData.senha}
                onChange={handleInputChange}
                onBlur={() => handleBlur('senha')}
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
              {touchedFields.senha && !fieldErrors.senha && formData.senha && (
                <span className="field-check">✓</span>
              )}
            </div>
            {touchedFields.senha && fieldErrors.senha && (
              <span className="field-error">{fieldErrors.senha}</span>
            )}
            {!isLogin && formData.senha && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: `${(getPasswordStrength(formData.senha).strength / 5) * 100}%`,
                      backgroundColor: getPasswordStrength(formData.senha).color
                    }}
                  ></div>
                </div>
                <span 
                  className="strength-text"
                  style={{ color: getPasswordStrength(formData.senha).color }}
                >
                  {getPasswordStrength(formData.senha).text}
                </span>
              </div>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmarSenha">
                <span className="field-icon">{getFieldIcon('confirmarSenha')}</span>
                Confirmar Senha
              </label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmarSenha"
                  name="confirmarSenha"
                  className={`form-control ${
                    touchedFields.confirmarSenha && fieldErrors.confirmarSenha ? 'error' : ''
                  } ${touchedFields.confirmarSenha && !fieldErrors.confirmarSenha && formData.confirmarSenha ? 'success' : ''}`}
                  value={formData.confirmarSenha}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('confirmarSenha')}
                  placeholder="Confirme sua senha"
                  required={!isLogin}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
                {touchedFields.confirmarSenha && !fieldErrors.confirmarSenha && formData.confirmarSenha && (
                  <span className="field-check">✓</span>
                )}
              </div>
              {touchedFields.confirmarSenha && fieldErrors.confirmarSenha && (
                <span className="field-error">{fieldErrors.confirmarSenha}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || !isFormValid()}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Processando...
              </>
            ) : (
              <>
                <span>{isLogin ? '🚀' : '🌟'}</span>
                {isLogin ? 'Entrar' : 'Criar Conta'}
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin && (
            <button
              type="button"
              className="btn btn-text forgot-password"
              onClick={showForgotPasswordForm}
            >
              🔑 Esqueci minha senha
            </button>
          )}
          
          <div className="auth-switch">
            <button
              type="button"
              className="btn btn-text"
              onClick={toggleMode}
            >
              {isLogin 
                ? '📝 Não tem uma conta? Criar conta'
                : '🔑 Já tem uma conta? Fazer login'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthForm 