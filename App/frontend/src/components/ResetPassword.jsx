import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    nova_senha: '',
    confirmar_senha: ''
  })

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Token de redefinição não encontrado')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (formData.nova_senha !== formData.confirmar_senha) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (formData.nova_senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          nova_senha: formData.nova_senha
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Senha redefinida com sucesso! Redirecionando para o login...')
        setTimeout(() => {
          navigate('/')
        }, 3000)
      } else {
        setError(data.error || 'Erro ao redefinir senha')
      }
    } catch (error) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const isFormValid = () => {
    return formData.nova_senha && formData.confirmar_senha && formData.nova_senha === formData.confirmar_senha
  }

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Token Inválido</h2>
          <p>O link de redefinição de senha é inválido ou expirou.</p>
          <button
            type="button"
            className="btn btn-primary w-100"
            onClick={() => navigate('/')}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Redefinir Senha</h2>
        <p>
          Digite sua nova senha para continuar
        </p>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nova_senha">Nova Senha</label>
            <input
              type="password"
              id="nova_senha"
              name="nova_senha"
              className="form-control"
              value={formData.nova_senha}
              onChange={handleInputChange}
              placeholder="Digite sua nova senha"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmar_senha">Confirmar Nova Senha</label>
            <input
              type="password"
              id="confirmar_senha"
              name="confirmar_senha"
              className="form-control"
              value={formData.confirmar_senha}
              onChange={handleInputChange}
              placeholder="Confirme sua nova senha"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading || !isFormValid()}
          >
            {loading ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            className="btn btn-text"
            onClick={() => navigate('/')}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword 