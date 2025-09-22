/**
 * @fileoverview API Gateway - Ponto único de entrada para microsserviços
 * Sistema de Lista de Compras - PUC Minas
 * @author Lucas Cerqueira Azevedo
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');

const serviceRegistry = require('../shared/serviceRegistry');

/**
 * API Gateway com roteamento, circuit breaker e agregação de dados
 * @class APIGateway
 */
class APIGateway {
    /**
     * Construtor do API Gateway
     * Inicializa Express app, circuit breakers e health checks
     */
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        
        this.circuitBreakers = new Map();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        setTimeout(() => {
            this.startHealthChecks();
        }, 3000);
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.app.use((req, res, next) => {
            res.setHeader('X-Gateway', 'api-gateway');
            res.setHeader('X-Gateway-Version', '1.0.0');
            res.setHeader('X-Architecture', 'Microservices-NoSQL');
            next();
        });

        this.app.use((req, res, next) => {
            console.log(`${req.method} ${req.originalUrl} - ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        this.app.get('/health', (req, res) => {
            const services = serviceRegistry.listServices();
            res.json({
                service: 'api-gateway',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                architecture: 'Microservices with NoSQL',
                services: services,
                serviceCount: Object.keys(services).length
            });
        });

        this.app.get('/', (req, res) => {
            res.json({
                service: 'API Gateway',
                version: '1.0.0',
                description: 'Gateway para Sistema de Lista de Compras com microsserviços NoSQL',
                architecture: 'Microservices with NoSQL databases',
                database_approach: 'Database per Service (JSON-NoSQL)',
                endpoints: {
                    users: '/api/users/*',
                    auth: '/api/auth/*',
                    items: '/api/items/*',
                    lists: '/api/lists/*',
                    health: '/health',
                    registry: '/registry',
                    dashboard: '/api/dashboard',
                    search: '/api/search'
                },
                services: serviceRegistry.listServices()
            });
        });

        this.app.get('/registry', (req, res) => {
            const services = serviceRegistry.listServices();
            res.json({
                success: true,
                services: services,
                count: Object.keys(services).length,
                timestamp: new Date().toISOString()
            });
        });

        this.app.get('/debug/services', (req, res) => {
            serviceRegistry.debugListServices();
            res.json({
                success: true,
                message: 'Veja o console para debug dos serviços'
            });
        });

        // Dashboard agregado com autenticação
        this.app.get('/api/dashboard', this.authMiddleware.bind(this), async (req, res) => {
            try {
                const dashboard = await this.aggregateDashboardData(req.user);
                res.json({
                    success: true,
                    data: dashboard
                });
            } catch (error) {
                console.error('Erro no dashboard:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao carregar dashboard'
                });
            }
        });

        // Busca global
        this.app.get('/api/search', async (req, res) => {
            try {
                const { q, type = 'all' } = req.query;
                
                if (!q) {
                    return res.status(400).json({
                        success: false,
                        message: 'Parâmetro de busca "q" é obrigatório'
                    });
                }

                const results = await this.performGlobalSearch(q, type);
                
                res.json({
                    success: true,
                    data: {
                        query: q,
                        type: type,
                        results: results
                    }
                });
            } catch (error) {
                console.error('Erro na busca global:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na busca'
                });
            }
        });

        // Rota específica para busca de itens
        this.app.get('/api/items/search', async (req, res) => {
            try {
                const itemService = serviceRegistry.discover('item-service');
                if (!itemService) {
                    return res.status(503).json({
                        success: false,
                        message: 'Item service indisponível'
                    });
                }
                
                const queryString = new URLSearchParams(req.query).toString();
                const url = `${itemService.url}/search${queryString ? '?' + queryString : ''}`;
                
                const response = await axios.get(url);
                res.json(response.data);
            } catch (error) {
                console.error('Erro na busca de itens:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na busca de itens'
                });
            }
        });

        // Roteamento para serviços
        this.app.all('/api/users/*', this.proxyToService.bind(this, 'user-service'));
        this.app.all('/api/users', this.proxyToService.bind(this, 'user-service'));
        this.app.all('/api/auth/*', this.proxyToService.bind(this, 'user-service'));
        this.app.all('/api/auth', this.proxyToService.bind(this, 'user-service'));

        this.app.all('/api/items/*', this.proxyToService.bind(this, 'item-service'));
        this.app.all('/api/items', this.proxyToService.bind(this, 'item-service'));
        this.app.all('/api/categories/*', this.proxyToService.bind(this, 'item-service'));
        this.app.all('/api/categories', this.proxyToService.bind(this, 'item-service'));

        this.app.all('/api/lists/*', this.proxyToService.bind(this, 'list-service'));
        this.app.all('/api/lists', this.proxyToService.bind(this, 'list-service'));
    }

    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: 'api-gateway',
                availableEndpoints: [
                    '/health',
                    '/registry',
                    '/api/dashboard',
                    '/api/search',
                    '/api/users',
                    '/api/users/*',
                    '/api/auth',
                    '/api/auth/*',
                    '/api/items',
                    '/api/items/*',
                    '/api/categories',
                    '/api/categories/*',
                    '/api/lists',
                    '/api/lists/*'
                ]
            });
        });

        this.app.use((error, req, res, next) => {
            console.error('API Gateway Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do gateway',
                service: 'api-gateway'
            });
        });
    }

    // Middleware de autenticação
    async authMiddleware(req, res, next) {
        const authHeader = req.header('Authorization');
        
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token obrigatório'
            });
        }

        try {
            const userService = serviceRegistry.discover('user-service');
            
            const response = await axios.post(`${userService.url}/auth/validate`, {
                token: authHeader.replace('Bearer ', '')
            }, { timeout: 5000 });

            if (response.data.success) {
                req.user = response.data.data.user;
                next();
            } else {
                res.status(401).json(response.data);
            }
        } catch (error) {
            console.error('Erro na validação do token:', error.message);
            res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    }

    async executeWithCircuitBreaker(serviceName, operation) {
        const circuitBreaker = this.getCircuitBreaker(serviceName);
        
        if (circuitBreaker.state === 'open') {
            if (Date.now() - circuitBreaker.lastFailTime > 30000) {
                circuitBreaker.state = 'half-open';
                console.log(`Circuit breaker para ${serviceName}: half-open`);
            } else {
                throw new Error(`Circuit breaker aberto para ${serviceName}`);
            }
        }

        try {
            const result = await operation();
            
            if (circuitBreaker.state === 'half-open') {
                circuitBreaker.state = 'closed';
                circuitBreaker.failureCount = 0;
                console.log(`Circuit breaker para ${serviceName}: fechado`);
            }
            
            return result;
        } catch (error) {
            circuitBreaker.failureCount++;
            circuitBreaker.lastFailTime = Date.now();
            
            if (circuitBreaker.failureCount >= 3) {
                circuitBreaker.state = 'open';
                console.log(`Circuit breaker para ${serviceName}: aberto`);
            }
            
            throw error;
        }
    }

    getCircuitBreaker(serviceName) {
        if (!this.circuitBreakers.has(serviceName)) {
            this.circuitBreakers.set(serviceName, {
                state: 'closed',
                failureCount: 0,
                lastFailTime: 0
            });
        }
        return this.circuitBreakers.get(serviceName);
    }

    async proxyToService(serviceName, req, res) {
        try {
            const service = serviceRegistry.discover(serviceName);
            
            let targetPath = req.originalUrl;
            if (targetPath.startsWith('/api/users')) {
                targetPath = targetPath.replace('/api/users', '/users');
            } else if (targetPath.startsWith('/api/auth')) {
                targetPath = targetPath.replace('/api/auth', '/auth');
            } else if (targetPath.startsWith('/api/items')) {
                targetPath = targetPath.replace('/api/items', '/items');
            } else if (targetPath.startsWith('/api/categories')) {
                targetPath = targetPath.replace('/api/categories', '/categories');
            } else if (targetPath.startsWith('/api/lists')) {
                targetPath = targetPath.replace('/api/lists', '/lists');
            }

            const url = `${service.url}${targetPath}`;

            const result = await this.executeWithCircuitBreaker(serviceName, async () => {
                const response = await axios({
                    method: req.method,
                    url: url,
                    data: req.body,
                    headers: {
                        ...req.headers,
                        host: undefined,
                        'content-length': undefined
                    },
                    timeout: 10000
                });
                return response;
            });

            res.set('X-Proxied-By', 'api-gateway');
            res.set('X-Service-Source', serviceName);
            
            res.status(result.status).json(result.data);
            
        } catch (error) {
            console.error(`Erro no proxy para ${serviceName}:`, error.message);
            
            if (error.message.includes('Circuit breaker aberto')) {
                res.status(503).json({
                    success: false,
                    message: 'Serviço temporariamente indisponível',
                    service: serviceName,
                    error: 'Circuit breaker aberto'
                });
            } else if (error.code === 'ECONNREFUSED' || error.message.includes('não encontrado')) {
                res.status(503).json({
                    success: false,
                    message: 'Serviço indisponível',
                    service: serviceName
                });
            } else if (error.response) {
                res.status(error.response.status).json(error.response.data);
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erro interno do gateway',
                    service: serviceName
                });
            }
        }
    }

    async aggregateDashboardData(user) {
        const dashboard = {
            timestamp: new Date().toISOString(),
            user: user ? {
                id: user.id,
                name: `${user.firstName} ${user.lastName}`,
                email: user.email
            } : null,
            services: {},
            summary: {
                totalUsers: 0,
                totalItems: 0,
                activeItems: 0,
                totalLists: 0,
                activeLists: 0,
                userLists: 0,
                categories: 0
            }
        };

        // User Service stats
        try {
            const userService = serviceRegistry.discover('user-service');
            const userHealth = await axios.get(`${userService.url}/health`, { timeout: 5000 });
            dashboard.services.userService = {
                status: 'healthy',
                userCount: userHealth.data.database?.userCount || 0
            };
            dashboard.summary.totalUsers = userHealth.data.database?.userCount || 0;
        } catch (error) {
            dashboard.services.userService = {
                status: 'unhealthy',
                error: error.message
            };
        }

        // Item Service stats
        try {
            const itemService = serviceRegistry.discover('item-service');
            const itemHealth = await axios.get(`${itemService.url}/health`, { timeout: 5000 });
            dashboard.services.itemService = {
                status: 'healthy',
                itemCount: itemHealth.data.database?.itemCount || 0,
                activeItems: itemHealth.data.database?.activeItems || 0
            };
            dashboard.summary.totalItems = itemHealth.data.database?.itemCount || 0;
            dashboard.summary.activeItems = itemHealth.data.database?.activeItems || 0;

            const categoriesResponse = await axios.get(`${itemService.url}/categories`, { timeout: 5000 });
            dashboard.summary.categories = categoriesResponse.data.data?.length || 0;
        } catch (error) {
            dashboard.services.itemService = {
                status: 'unhealthy',
                error: error.message
            };
        }

        // List Service stats (com dados do usuário se autenticado)
        try {
            const listService = serviceRegistry.discover('list-service');
            const listHealth = await axios.get(`${listService.url}/health`, { timeout: 5000 });
            dashboard.services.listService = {
                status: 'healthy',
                listCount: listHealth.data.database?.listCount || 0,
                activeLists: listHealth.data.database?.activeLists || 0
            };
            dashboard.summary.totalLists = listHealth.data.database?.listCount || 0;
            dashboard.summary.activeLists = listHealth.data.database?.activeLists || 0;

            // Se usuário autenticado, buscar suas listas
            if (user) {
                try {
                    const userListsResponse = await axios.get(`${listService.url}/lists`, {
                        headers: { Authorization: `Bearer ${user.token || ''}` },
                        timeout: 5000
                    });
                    dashboard.summary.userLists = userListsResponse.data.data?.length || 0;
                } catch (error) {
                    dashboard.summary.userLists = 0;
                }
            }
        } catch (error) {
            dashboard.services.listService = {
                status: 'unhealthy',
                error: error.message
            };
        }

        return dashboard;
    }

    async performGlobalSearch(query, type) {
        const results = {
            items: [],
            lists: []
        };

        if (type === 'all' || type === 'items') {
            try {
                const itemService = serviceRegistry.discover('item-service');
                const itemResults = await axios.get(`${itemService.url}/search`, {
                    params: { q: query },
                    timeout: 5000
                });
                results.items = itemResults.data.data?.results || [];
            } catch (error) {
                console.log('Erro na busca de itens:', error.message);
            }
        }

        // Lists search requires authentication, so we can't do global search without user context
        if (type === 'lists') {
            results.lists = []; // Lists search would require user authentication
        }

        return results;
    }

    startHealthChecks() {
        console.log('Iniciando health checks periódicos...');
        
        setInterval(async () => {
            try {
                await serviceRegistry.performHealthChecks();
            } catch (error) {
                console.error('Erro nos health checks:', error);
            }
        }, 30000); // Health checks a cada 30 segundos
    }

    registerWithRegistry() {
        serviceRegistry.register('api-gateway', {
            url: `http://localhost:${this.port}`,
            version: '1.0.0',
            endpoints: ['/health', '/registry', '/api/dashboard', '/api/search', '/api/users/*', '/api/items/*', '/api/lists/*']
        });
    }

    startHealthReporting() {
        setInterval(() => {
            serviceRegistry.updateHealth('api-gateway', true);
        }, 30000);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log('=====================================');
            console.log(`API Gateway iniciado na porta ${this.port}`);
            console.log(`URL: http://localhost:${this.port}`);
            console.log(`Health: http://localhost:${this.port}/health`);
            console.log(`Registry: http://localhost:${this.port}/registry`);
            console.log(`Dashboard: http://localhost:${this.port}/api/dashboard`);
            console.log('=====================================');
            
            this.registerWithRegistry();
            this.startHealthReporting();
        });
    }
}

if (require.main === module) {
    const gateway = new APIGateway();
    gateway.start();

    process.on('SIGTERM', () => {
        serviceRegistry.unregister('api-gateway');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('api-gateway');
        process.exit(0);
    });
}

module.exports = APIGateway;