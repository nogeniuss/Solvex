const { query } = require('../database');
const logger = require('../config/logger');

class PaginationService {
  // Paginação baseada em cursor (mais eficiente para grandes datasets)
  async cursorPaginate(sql, params, options = {}) {
    try {
      const {
        limit = 20,
        cursor = null,
        cursorField = 'id',
        orderBy = 'DESC',
        search = null,
        filters = {}
      } = options;

      let finalSQL = sql;
      let finalParams = [...params];

      // Adicionar filtros de busca
      if (search) {
        finalSQL += ` AND (titulo LIKE ? OR descricao LIKE ?)`;
        finalParams.push(`%${search}%`, `%${search}%`);
      }

      // Adicionar filtros adicionais
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          finalSQL += ` AND ${key} = ?`;
          finalParams.push(filters[key]);
        }
      });

      // Adicionar cursor se fornecido
      if (cursor) {
        finalSQL += ` AND ${cursorField} ${orderBy === 'DESC' ? '<' : '>'} ?`;
        finalParams.push(cursor);
      }

      // Adicionar ordenação e limite
      finalSQL += ` ORDER BY ${cursorField} ${orderBy} LIMIT ?`;
      finalParams.push(limit + 1); // Buscar um extra para saber se há mais páginas

      // Executar query
      const results = await query(finalSQL, finalParams);
      
      // Verificar se há mais páginas
      const hasNextPage = results.length > limit;
      const items = hasNextPage ? results.slice(0, limit) : results;
      
      // Calcular cursor para próxima página
      const nextCursor = hasNextPage ? items[items.length - 1][cursorField] : null;
      const prevCursor = cursor;

      return {
        items,
        pagination: {
          hasNextPage,
          hasPreviousPage: !!cursor,
          nextCursor,
          prevCursor,
          totalItems: items.length,
          limit
        }
      };
    } catch (error) {
      logger.error('Error in cursor pagination:', error);
      throw error;
    }
  }

  // Paginação tradicional com offset
  async offsetPaginate(sql, params, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = null,
        filters = {},
        orderBy = 'id DESC'
      } = options;

      const offset = (page - 1) * limit;
      let finalSQL = sql;
      let finalParams = [...params];

      // Adicionar filtros de busca
      if (search) {
        finalSQL += ` AND (titulo LIKE ? OR descricao LIKE ?)`;
        finalParams.push(`%${search}%`, `%${search}%`);
      }

      // Adicionar filtros adicionais
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          finalSQL += ` AND ${key} = ?`;
          finalParams.push(filters[key]);
        }
      });

      // Query para contar total de registros
      const countSQL = finalSQL.replace(/SELECT .* FROM/, 'SELECT COUNT(*) as total FROM');
      const countResult = await query(countSQL, finalParams);
      const totalItems = countResult[0].total;

      // Adicionar ordenação, limite e offset
      finalSQL += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
      finalParams.push(limit, offset);

      // Executar query principal
      const items = await query(finalSQL, finalParams);

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalItems / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPreviousPage ? page - 1 : null,
          limit
        }
      };
    } catch (error) {
      logger.error('Error in offset pagination:', error);
      throw error;
    }
  }

  // Paginação com agrupamento
  async groupPaginate(sql, params, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        groupBy = 'categoria_id',
        orderBy = 'total DESC'
      } = options;

      const offset = (page - 1) * limit;

      // Query para dados agrupados
      const groupSQL = `
        ${sql}
        GROUP BY ${groupBy}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `;

      const groupParams = [...params, limit, offset];
      const items = await query(groupSQL, groupParams);

      // Query para contar total de grupos
      const countSQL = `
        SELECT COUNT(DISTINCT ${groupBy}) as total
        FROM (${sql}) as subquery
      `;
      const countResult = await query(countSQL, params);
      const totalItems = countResult[0].total;

      // Calcular informações de paginação
      const totalPages = Math.ceil(totalItems / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        items,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPreviousPage ? page - 1 : null,
          limit
        }
      };
    } catch (error) {
      logger.error('Error in group pagination:', error);
      throw error;
    }
  }

  // Paginação com cache
  async cachedPaginate(cacheKey, sql, params, options = {}) {
    try {
      const cache = require('../config/redis');
      const cacheKeyWithParams = `${cacheKey}:${JSON.stringify(params)}:${JSON.stringify(options)}`;
      
      // Tentar buscar do cache
      const cached = await cache.get(cacheKeyWithParams);
      if (cached) {
        logger.info('Pagination result served from cache', { cacheKey: cacheKeyWithParams });
        return cached;
      }

      // Executar paginação
      const result = await this.offsetPaginate(sql, params, options);
      
      // Salvar no cache por 5 minutos
      await cache.set(cacheKeyWithParams, result, 300);
      
      return result;
    } catch (error) {
      logger.error('Error in cached pagination:', error);
      throw error;
    }
  }

  // Middleware para adicionar paginação automática
  static paginate(options = {}) {
    return async (req, res, next) => {
      try {
        const {
          type = 'offset',
          defaultLimit = 20,
          maxLimit = 100
        } = options;

        // Extrair parâmetros de paginação da query
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit);
        const cursor = req.query.cursor || null;
        const search = req.query.search || null;

        // Adicionar à requisição
        req.pagination = {
          type,
          page,
          limit,
          cursor,
          search,
          filters: req.query.filters ? JSON.parse(req.query.filters) : {}
        };

        next();
      } catch (error) {
        logger.error('Error in pagination middleware:', error);
        res.status(400).json({ error: 'Parâmetros de paginação inválidos' });
      }
    };
  }

  // Helper para construir links de paginação
  static buildPaginationLinks(baseUrl, pagination, query = {}) {
    const links = {
      self: `${baseUrl}?${new URLSearchParams(query).toString()}`,
      first: null,
      last: null,
      next: null,
      prev: null
    };

    if (pagination.currentPage) {
      // Paginação com offset
      const firstQuery = { ...query, page: 1 };
      const lastQuery = { ...query, page: pagination.totalPages };
      const nextQuery = pagination.hasNextPage ? { ...query, page: pagination.nextPage } : null;
      const prevQuery = pagination.hasPreviousPage ? { ...query, page: pagination.prevPage } : null;

      links.first = `${baseUrl}?${new URLSearchParams(firstQuery).toString()}`;
      links.last = `${baseUrl}?${new URLSearchParams(lastQuery).toString()}`;
      if (nextQuery) links.next = `${baseUrl}?${new URLSearchParams(nextQuery).toString()}`;
      if (prevQuery) links.prev = `${baseUrl}?${new URLSearchParams(prevQuery).toString()}`;
    } else {
      // Paginação com cursor
      if (pagination.nextCursor) {
        const nextQuery = { ...query, cursor: pagination.nextCursor };
        links.next = `${baseUrl}?${new URLSearchParams(nextQuery).toString()}`;
      }
      if (pagination.prevCursor) {
        const prevQuery = { ...query, cursor: pagination.prevCursor };
        links.prev = `${baseUrl}?${new URLSearchParams(prevQuery).toString()}`;
      }
    }

    return links;
  }
}

module.exports = PaginationService; 