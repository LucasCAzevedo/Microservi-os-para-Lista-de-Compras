/**
 * @fileoverview User Service - Microsserviço para gerenciamento de usuários
 * Sistema de Lista de Compras - PUC Minas
 * @author Lucas Cerqueira Azevedo
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');

/**
 * Microsserviço responsável pelo gerenciamento de usuários e autenticação
 * @class UserService
 */
class UserService {
    /**
     * Construtor do User Service
     * Inicializa Express app, banco de dados e configurações
     */
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.serviceName = 'user-service';
        this.serviceUrl = `http://localhost:${this.port}`;
        
        this.setupDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.seedInitialData();
    }

    /**
     * Configura o banco de dados NoSQL para usuários
     * @private
     */
    setupDatabase() {
        const dbPath = path.join(__dirname, 'database');
        this.usersDb = new JsonDatabase(dbPath, 'users');
        console.log('User Service: Banco NoSQL inicializado');
    }

    /**
     * Cria dados iniciais no banco (usuário administrador)
     * @async
     * @private
     */
    async seedInitialData() {
        setTimeout(async () => {
            try {
                const existingUsers = await this.usersDb.find();
                
                if (existingUsers.length === 0) {
                    const adminPassword = await bcrypt.hash('admin123', 12);
                    
                    await this.usersDb.create({
                        id: uuidv4(),
                        email: 'admin@microservices.com',
                        username: 'admin',
                        password: adminPassword,
                        firstName: 'Administrador',
                        lastName: 'Sistema',
                        preferences: {
                            defaultStore: 'Supermercado Central',
                            currency: 'BRL'
                        },
                        role: 'admin',
                        status: 'active'
                    });

                    console.log('Usuário administrador criado (admin@microservices.com / admin123)');
                }
            } catch (error) {
                console.error('Erro ao criar dados iniciais:', error);
            }
        }, 1000);
    }

    /**
     * Configura middlewares do Express
     * @private
     */
    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.app.use((req, res, next) => {
            res.setHeader('X-Service', this.serviceName);
            res.setHeader('X-Service-Version', '1.0.0');
            res.setHeader('X-Database', 'JSON-NoSQL');
            next();
        });
    }

    /**
     * Configura todas as rotas da API
     * @private
     */
    setupRoutes() {
        this.app.get('/health', async (req, res) => {
            try {
                const userCount = await this.usersDb.count();
                res.json({
                    service: this.serviceName,
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    version: '1.0.0',
                    database: {
                        type: 'JSON-NoSQL',
                        userCount: userCount
                    }
                });
            } catch (error) {
                res.status(503).json({
                    service: this.serviceName,
                    status: 'unhealthy',
                    error: error.message
                });
            }
        });

        this.app.get('/', (req, res) => {
            res.json({
                service: 'User Service',
                version: '1.0.0',
                description: 'Microsserviço para gerenciamento de usuários com NoSQL',
                database: 'JSON-NoSQL',
                endpoints: [
                    'POST /auth/register',
                    'POST /auth/login', 
                    'GET /users/:id',
                    'PUT /users/:id'
                ]
            });
        });

        this.app.post('/auth/register', this.register.bind(this));
        this.app.post('/auth/login', this.login.bind(this));
        this.app.post('/auth/validate', this.validateToken.bind(this));

        this.app.get('/users/:id', this.authMiddleware.bind(this), this.getUser.bind(this));
        this.app.put('/users/:id', this.authMiddleware.bind(this), this.updateUser.bind(this));
    }

    /**
     * Configura tratamento de erros
     * @private
     */
    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: this.serviceName
            });
        });

        this.app.use((error, req, res, next) => {
            console.error('User Service Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do serviço',
                service: this.serviceName
            });
        });
    }

    /**
     * Middleware de autenticação JWT
     * @param {Object} req - Request object
     * @param {Object} res - Response object  
     * @param {Function} next - Next middleware function
     */
    authMiddleware(req, res, next) {
        const authHeader = req.header('Authorization');
        
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token obrigatório'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'user-secret');
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    }

    /**
     * Endpoint para registro de novos usuários
     * @async
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async register(req, res) {
        try {
            const { email, username, password, firstName, lastName, defaultStore, currency } = req.body;

            if (!email || !username || !password || !firstName || !lastName) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos os campos são obrigatórios'
                });
            }

            const existingEmail = await this.usersDb.findOne({ email: email.toLowerCase() });
            const existingUsername = await this.usersDb.findOne({ username: username.toLowerCase() });

            if (existingEmail) {
                return res.status(409).json({
                    success: false,
                    message: 'Email já está em uso'
                });
            }

            if (existingUsername) {
                return res.status(409).json({
                    success: false,
                    message: 'Username já está em uso'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 12);

            const newUser = await this.usersDb.create({
                id: uuidv4(),
                email: email.toLowerCase(),
                username: username.toLowerCase(),
                password: hashedPassword,
                firstName,
                lastName,
                preferences: {
                    defaultStore: defaultStore || '',
                    currency: currency || 'BRL'
                },
                role: 'user',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            const { password: _, ...userWithoutPassword } = newUser;

            const token = jwt.sign(
                { 
                    id: newUser.id, 
                    email: newUser.email, 
                    username: newUser.username,
                    role: newUser.role 
                },
                process.env.JWT_SECRET || 'user-secret',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso',
                data: { user: userWithoutPassword, token }
            });
        } catch (error) {
            console.error('Erro no registro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Endpoint para login de usuários
     * @async
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async login(req, res) {
        try {
            const { identifier, password } = req.body;

            if (!identifier || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Identificador e senha obrigatórios'
                });
            }

            const users = await this.usersDb.find();
            const user = users.find(u => 
                u.email === identifier.toLowerCase() || 
                u.username === identifier.toLowerCase()
            );

            if (!user || !await bcrypt.compare(password, user.password)) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            if (user.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: 'Conta desativada'
                });
            }

            const updateData = {
                'updatedAt': new Date().toISOString()
            };
            
            const updatedUser = { ...user };
            updatedUser.updatedAt = new Date().toISOString();
            
            await this.usersDb.update(user.id, updatedUser);

            const { password: _, ...userWithoutPassword } = user;
            
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    username: user.username,
                    role: user.role 
                },
                process.env.JWT_SECRET || 'user-secret',
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: { user: userWithoutPassword, token }
            });
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Endpoint para validação de tokens JWT
     * @async
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async validateToken(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token obrigatório'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'user-secret');
            const user = await this.usersDb.findById(decoded.id);

            if (!user || user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não encontrado ou inativo'
                });
            }

            const { password: _, ...userWithoutPassword } = user;

            res.json({
                success: true,
                message: 'Token válido',
                data: { user: userWithoutPassword }
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    }

    /**
     * Endpoint para buscar dados de um usuário
     * @async
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async getUser(req, res) {
        try {
            const { id } = req.params;
            const user = await this.usersDb.findById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            // Verificar permissão (usuário só vê próprio perfil ou admin vê tudo)
            if (req.user.id !== id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            const { password, ...userWithoutPassword } = user;

            res.json({
                success: true,
                data: userWithoutPassword
            });
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Endpoint para atualizar dados de um usuário
     * @async
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { firstName, lastName, email, defaultStore, currency } = req.body;

            // Verificar permissão
            if (req.user.id !== id && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            const user = await this.usersDb.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            // Updates conforme schema da Parte 1
            const updates = { ...user };
            if (firstName) updates.firstName = firstName;
            if (lastName) updates.lastName = lastName;
            if (email) updates.email = email.toLowerCase();
            
            // Atualizar preferences
            if (defaultStore !== undefined || currency !== undefined) {
                updates.preferences = { 
                    ...updates.preferences,
                    ...(defaultStore !== undefined && { defaultStore }),
                    ...(currency !== undefined && { currency })
                };
            }

            updates.updatedAt = new Date().toISOString();

            const updatedUser = await this.usersDb.update(id, updates);
            const { password, ...userWithoutPassword } = updatedUser;

            res.json({
                success: true,
                message: 'Usuário atualizado com sucesso',
                data: userWithoutPassword
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    /**
     * Registra o serviço no Service Registry
     * @private
     */
    registerWithRegistry() {
        serviceRegistry.register(this.serviceName, {
            url: this.serviceUrl,
            version: '1.0.0',
            database: 'JSON-NoSQL',
            endpoints: ['/health', '/auth/register', '/auth/login', '/users/:id']
        });
    }

    /**
     * Inicia reportagem periódica de health check
     * @private
     */
    startHealthReporting() {
        setInterval(() => {
            serviceRegistry.updateHealth(this.serviceName, true);
        }, 30000);
    }

    /**
     * Inicia o servidor HTTP
     */
    start() {
        this.app.listen(this.port, () => {
            console.log('=====================================');
            console.log(`User Service iniciado na porta ${this.port}`);
            console.log(`URL: ${this.serviceUrl}`);
            console.log(`Health: ${this.serviceUrl}/health`);
            console.log(`Database: JSON-NoSQL`);
            console.log('=====================================');
            
            // Register with service registry
            this.registerWithRegistry();
            this.startHealthReporting();
        });
    }
}

/**
 * Inicialização do serviço se executado diretamente
 */
if (require.main === module) {
    const userService = new UserService();
    userService.start();

    /**
     * Graceful shutdown handlers
     */
    process.on('SIGTERM', () => {
        serviceRegistry.unregister('user-service');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('user-service');
        process.exit(0);
    });
}

module.exports = UserService;
