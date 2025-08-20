import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FiltersToggle from './FiltersToggle';

const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#3B82F6',
    icone: 'money'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados dos filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    tipo: 'todos', // 'todos', 'sistema', 'personalizada'
    cor: '',
    ordenacao: 'nome' // 'nome', 'data', 'tipo'
  });
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);

  const icones = [
    { value: 'money-bill', label: 'Dinheiro' },
    { value: 'utensils', label: 'Comida' },
    { value: 'car', label: 'Carro' },
    { value: 'home', label: 'Casa' },
    { value: 'heartbeat', label: 'Saúde' },
    { value: 'graduation-cap', label: 'Educação' },
    { value: 'gamepad', label: 'Entretenimento' },
    { value: 'tshirt', label: 'Roupas' },
    { value: 'wrench', label: 'Serviços' },
    { value: 'dollar-sign', label: 'Salário' },
    { value: 'laptop', label: 'Freelance' },
    { value: 'chart-line', label: 'Investimento' },
    { value: 'ellipsis-h', label: 'Outros' }
  ];

  // Mapeamento de ícones antigos para novos (compatibilidade)
  const iconMapping = {
    'money': 'money-bill',
    'food': 'utensils',
    'health': 'heartbeat',
    'education': 'graduation-cap',
    'entertainment': 'gamepad',
    'clothing': 'tshirt',
    'services': 'wrench',
    'salary': 'dollar-sign',
    'freelance': 'laptop',
    'investment': 'chart-line',
    'other': 'ellipsis-h'
  };

  // Função para obter o ícone correto
  const getIconClass = (icone) => {
    // Se já tem o ícone mapeado, usa ele
    const mappedIcon = iconMapping[icone] || icone;
    // Verifica se tem o prefixo fas
    if (mappedIcon.startsWith('fas ') || mappedIcon.startsWith('fa-')) {
      return mappedIcon;
    }
    // Adiciona o prefixo fas fa-
    return `fas fa-${mappedIcon}`;
  };

  const cores = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
    '#06B6D4', '#84CC16', '#6B7280', '#F97316', '#A855F7', '#14B8A6'
  ];

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Você precisa fazer login para ver as categorias');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/categorias', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const categorias = data.categories || [];
        setCategorias(categorias);
        console.log('Categorias carregadas:', categorias.length);
      } else {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          setError('Sessão expirada. Faça login novamente.');
        } else {
          setError('Erro ao carregar categorias');
        }
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      setError('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    let resultado = [...categorias];

    // Filtro por busca
    if (filtros.busca) {
      resultado = resultado.filter(categoria =>
        categoria.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        (categoria.descricao && categoria.descricao.toLowerCase().includes(filtros.busca.toLowerCase()))
      );
    }

    // Filtro por tipo
    if (filtros.tipo !== 'todos') {
      resultado = resultado.filter(categoria => categoria.origem === filtros.tipo);
    }

    // Filtro por cor
    if (filtros.cor) {
      resultado = resultado.filter(categoria => categoria.cor === filtros.cor);
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (filtros.ordenacao) {
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'data':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'tipo':
          if (a.origem === b.origem) {
            return a.nome.localeCompare(b.nome);
          }
          return a.origem === 'sistema' ? -1 : 1;
        default:
          return 0;
      }
    });

    setCategoriasFiltradas(resultado);
  };

  // Aplicar filtros sempre que categorias ou filtros mudarem
  useEffect(() => {
    aplicarFiltros();
  }, [categorias, filtros]);

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      cor: '#3B82F6',
      icone: 'money'
    });
    setEditingId(null);
    setError('');
    setSuccess('');
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      tipo: 'todos',
      cor: '',
      ordenacao: 'nome'
    });
  };

  // Obter cores únicas das categorias
  const coresDisponiveis = [...new Set(categorias.map(cat => cat.cor))].sort();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/categorias/${editingId}` : '/api/categorias';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingId ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!');
        setShowModal(false);
        resetForm();
        fetchCategorias(); // Recarregar lista
      } else {
        setError(data.error || 'Erro ao salvar categoria');
      }
    } catch (error) {
      setError('Erro ao salvar categoria');
    }
  };

  const handleEdit = (categoria) => {
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || '',
      cor: categoria.cor,
      icone: categoria.icone
    });
    setEditingId(categoria.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/categorias/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Categoria excluída com sucesso!');
        fetchCategorias();
      } else {
        const data = await response.json();
        setError(data.error || 'Erro ao excluir categoria');
      }
    } catch (error) {
      setError('Erro ao excluir categoria');
    }
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando categorias...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="categorias-container">
          <div className="categorias-header">
            <h1>Gerenciar Categorias</h1>
          </div>

      {error && (
        <div className="alert alert-error">
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

      {/* Filtros */}
      <FiltersToggle title="Filtros de Categorias">
        <div className="filters-container">
          <div className="filters-header">
            <div>
              <h3 className="filters-title">
                Filtros de Categorias
                <span className="filters-count">
                  {Object.values(filtros).filter(v => v !== '' && v !== 'todos' && v !== 'nome').length}
                </span>
              </h3>
              <p className="filters-subtitle">Filtre suas categorias por diferentes critérios</p>
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={limparFiltros}
              title="Limpar todos os filtros"
            >
              <i className="fas fa-eraser"></i>
              Limpar Filtros
            </button>
          </div>
        
          <div className="filters-row">
            <div className={`filter-group ${filtros.busca ? 'has-value' : ''}`} data-tooltip="Buscar por nome ou descrição">
              <label>Buscar</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nome ou descrição..."
                value={filtros.busca}
                onChange={(e) => handleFiltroChange('busca', e.target.value)}
              />
            </div>

            <div className={`filter-group ${filtros.tipo !== 'todos' ? 'has-value' : ''}`} data-tooltip="Filtrar por tipo de categoria">
              <label>Tipo</label>
              <select
                className="form-control"
                value={filtros.tipo}
                onChange={(e) => handleFiltroChange('tipo', e.target.value)}
              >
                <option value="todos">Todas</option>
                <option value="sistema">Sistema</option>
                <option value="personalizada">Personalizadas</option>
              </select>
            </div>

            <div className={`filter-group ${filtros.cor ? 'has-value' : ''}`} data-tooltip="Filtrar por cor">
              <label>Cor</label>
              <select
                className="form-control"
                value={filtros.cor}
                onChange={(e) => handleFiltroChange('cor', e.target.value)}
              >
                <option value="">Todas as cores</option>
                {coresDisponiveis.map(cor => (
                  <option key={cor} value={cor}>
                    {cor}
                  </option>
                ))}
              </select>
            </div>

            <div className={`filter-group ${filtros.ordenacao !== 'nome' ? 'has-value' : ''}`} data-tooltip="Ordenar categorias">
              <label>Ordenar por</label>
              <select
                className="form-control"
                value={filtros.ordenacao}
                onChange={(e) => handleFiltroChange('ordenacao', e.target.value)}
              >
                <option value="nome">Nome (A-Z)</option>
                <option value="data">Data de criação</option>
                <option value="tipo">Tipo (Sistema primeiro)</option>
              </select>
            </div>
          </div>
          
          <div className="filter-actions">
            <div className="filter-summary">
              <span className="results-count">
                📊 Mostrando {categoriasFiltradas.length} de {categorias.length} categorias
              </span>
              {(filtros.busca || filtros.tipo !== 'todos' || filtros.cor || filtros.ordenacao !== 'nome') && (
                <span className="filters-active">
                  <i className="fas fa-filter"></i>
                  Filtros ativos
                </span>
              )}
            </div>
          </div>
        </div>
      </FiltersToggle>

      {/* Seção de Ações */}
      <div className="actions-section">
        <div className="actions-header">
          <h3>Ações</h3>
          <p>Gerencie suas categorias de receitas e despesas</p>
        </div>
        <div className="actions-content">
          <button className="btn btn-primary" onClick={openModal}>
            <i className="fas fa-plus"></i>
            Nova Categoria
          </button>
        </div>
      </div>

      <div className="categorias-grid">
        {categoriasFiltradas && categoriasFiltradas.length > 0 ? (
          categoriasFiltradas.map((categoria) => (
          <div key={categoria.id} className="categoria-card">
            <div className="categoria-header">
              <div 
                className="categoria-icon" 
                style={{ backgroundColor: categoria.cor }}
              >
                <i className={getIconClass(categoria.icone)}></i>
              </div>
              <div className="categoria-info">
                <h3>{categoria.nome}</h3>
                <p>{categoria.descricao || 'Sem descrição'}</p>
                <span className={`badge ${categoria.origem === 'sistema' ? 'badge-system' : 'badge-custom'}`}>
                  {categoria.origem === 'sistema' ? 'Sistema' : 'Personalizada'}
                </span>
              </div>
            </div>
            
            <div className="categoria-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => handleEdit(categoria)}
                title="Editar categoria"
              >
                <i className="fas fa-edit"></i>
                Editar
              </button>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(categoria.id)}
                title="Excluir categoria"
              >
                <i className="fas fa-trash"></i>
                Excluir
              </button>
            </div>

            <div className="categoria-meta">
              <small>
                Criada em: {formatDate(categoria.created_date)}
              </small>
            </div>
          </div>
        ))
        ) : (
          <div className="empty-state">
            <p>Nenhuma categoria encontrada.</p>
          </div>
        )}
      </div>

      {/* Modal de Categoria */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="nome">Nome da Categoria *</label>
                <input
                  type="text"
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Alimentação, Transporte, etc."
                  required
                  maxLength={255}
                />
              </div>

              <div className="form-group">
                <label htmlFor="descricao">Descrição</label>
                <textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descrição opcional da categoria"
                  rows="3"
                  maxLength={500}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="icone">Ícone</label>
                  <select
                    id="icone"
                    value={formData.icone}
                    onChange={(e) => setFormData({...formData, icone: e.target.value})}
                  >
                    {icones.map((icone) => (
                      <option key={icone.value} value={icone.value}>
                        {icone.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="cor">Cor</label>
                  <div className="color-picker">
                    {cores.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        className={`color-option ${formData.cor === cor ? 'selected' : ''}`}
                        style={{ backgroundColor: cor }}
                        onClick={() => setFormData({...formData, cor})}
                        title={cor}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingId ? 'Atualizar' : 'Criar'} Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>

            <style jsx>{`
        /* Estilos específicos da tela de categorias */
        .categorias-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .categorias-header h1 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }
        
        .categorias-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        
        @media (max-width: 768px) {
          .categorias-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Categorias; 