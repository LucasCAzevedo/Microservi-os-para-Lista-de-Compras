/**
 * @fileoverview Item Service - Microsserviço para gerenciamento de itens/catálogo
 * Sistema de Lista de Compras - PUC Minas
 * @author Lucas Cerqueira Azevedo
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const axios = require('axios');

const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');

/**
 * Microsserviço responsável pelo gerenciamento de itens/catálogo de produtos
 * @class ItemService
 */
class ItemService {
    /**
     * Construtor do Item Service
     * Inicializa Express app, banco de dados e dados iniciais
     */
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3003;
        this.serviceName = 'item-service';
        this.serviceUrl = `http://localhost:${this.port}`;
        
        this.setupDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.seedInitialData();
    }

    setupDatabase() {
        const dbPath = path.join(__dirname, 'database');
        this.itemsDb = new JsonDatabase(dbPath, 'items');
        console.log('Item Service: Banco NoSQL inicializado');
    }

    async seedInitialData() {
        setTimeout(async () => {
            try {
                const existingItems = await this.itemsDb.find();
                
                if (existingItems.length === 0) {
                    const sampleItems = [
                        // Alimentos
                        {
                            id: uuidv4(),
                            name: 'Arroz Branco',
                            category: 'Alimentos',
                            brand: 'Tio João',
                            unit: 'kg',
                            averagePrice: 4.50,
                            barcode: '7891234567890',
                            description: 'Arroz branco tipo 1, pacote de 1kg',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Feijão Preto',
                            category: 'Alimentos',
                            brand: 'Camil',
                            unit: 'kg',
                            averagePrice: 6.80,
                            barcode: '7891234567891',
                            description: 'Feijão preto tipo 1, pacote de 1kg',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Óleo de Soja',
                            category: 'Alimentos',
                            brand: 'Liza',
                            unit: 'litro',
                            averagePrice: 8.90,
                            barcode: '7891234567892',
                            description: 'Óleo de soja refinado, garrafa de 900ml',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Açúcar Cristal',
                            category: 'Alimentos',
                            brand: 'União',
                            unit: 'kg',
                            averagePrice: 3.20,
                            barcode: '7891234567893',
                            description: 'Açúcar cristal especial, pacote de 1kg',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Sal Refinado',
                            category: 'Alimentos',
                            brand: 'Cisne',
                            unit: 'kg',
                            averagePrice: 1.50,
                            barcode: '7891234567894',
                            description: 'Sal refinado iodado, pacote de 1kg',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Macarrão Espaguete',
                            category: 'Alimentos',
                            brand: 'Barilla',
                            unit: 'un',
                            averagePrice: 4.20,
                            barcode: '7891234567895',
                            description: 'Macarrão espaguete nº8, pacote de 500g',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Molho de Tomate',
                            category: 'Alimentos',
                            brand: 'Quero',
                            unit: 'un',
                            averagePrice: 2.80,
                            barcode: '7891234567896',
                            description: 'Molho de tomate tradicional, lata de 340g',
                            active: true
                        },

                        // Limpeza
                        {
                            id: uuidv4(),
                            name: 'Detergente Líquido',
                            category: 'Limpeza',
                            brand: 'Ypê',
                            unit: 'un',
                            averagePrice: 2.50,
                            barcode: '7891234567897',
                            description: 'Detergente líquido neutro, frasco de 500ml',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Sabão em Pó',
                            category: 'Limpeza',
                            brand: 'OMO',
                            unit: 'un',
                            averagePrice: 12.90,
                            barcode: '7891234567898',
                            description: 'Sabão em pó concentrado, caixa de 1kg',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Desinfetante',
                            category: 'Limpeza',
                            brand: 'Pinho Sol',
                            unit: 'litro',
                            averagePrice: 7.50,
                            barcode: '7891234567899',
                            description: 'Desinfetante original, frasco de 1L',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Esponja de Aço',
                            category: 'Limpeza',
                            brand: 'Bombril',
                            unit: 'un',
                            averagePrice: 3.80,
                            barcode: '7891234567900',
                            description: 'Esponja de aço inox, pacote com 8 unidades',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Água Sanitária',
                            category: 'Limpeza',
                            brand: 'Candida',
                            unit: 'litro',
                            averagePrice: 4.20,
                            barcode: '7891234567901',
                            description: 'Água sanitária 2%, frasco de 1L',
                            active: true
                        },

                        // Higiene
                        {
                            id: uuidv4(),
                            name: 'Papel Higiênico',
                            category: 'Higiene',
                            brand: 'Personal',
                            unit: 'un',
                            averagePrice: 18.90,
                            barcode: '7891234567902',
                            description: 'Papel higiênico folha dupla, pacote com 12 rolos',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Sabonete',
                            category: 'Higiene',
                            brand: 'Dove',
                            unit: 'un',
                            averagePrice: 3.50,
                            barcode: '7891234567903',
                            description: 'Sabonete em barra hidratante, 90g',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Shampoo',
                            category: 'Higiene',
                            brand: 'Pantene',
                            unit: 'un',
                            averagePrice: 12.90,
                            barcode: '7891234567904',
                            description: 'Shampoo hidratante, frasco de 400ml',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Pasta de Dente',
                            category: 'Higiene',
                            brand: 'Colgate',
                            unit: 'un',
                            averagePrice: 4.80,
                            barcode: '7891234567905',
                            description: 'Pasta de dente total 12, tubo de 90g',
                            active: true
                        },

                        // Bebidas
                        {
                            id: uuidv4(),
                            name: 'Refrigerante Cola',
                            category: 'Bebidas',
                            brand: 'Coca-Cola',
                            unit: 'litro',
                            averagePrice: 6.50,
                            barcode: '7891234567906',
                            description: 'Refrigerante cola original, garrafa de 2L',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Suco de Laranja',
                            category: 'Bebidas',
                            brand: 'Del Valle',
                            unit: 'litro',
                            averagePrice: 4.90,
                            barcode: '7891234567907',
                            description: 'Suco de laranja integral, caixa de 1L',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Água Mineral',
                            category: 'Bebidas',
                            brand: 'Crystal',
                            unit: 'litro',
                            averagePrice: 2.80,
                            barcode: '7891234567908',
                            description: 'Água mineral sem gás, garrafa de 1,5L',
                            active: true
                        },

                        // Padaria
                        {
                            id: uuidv4(),
                            name: 'Pão de Forma',
                            category: 'Padaria',
                            brand: 'Panco',
                            unit: 'un',
                            averagePrice: 5.90,
                            barcode: '7891234567909',
                            description: 'Pão de forma integral, pacote de 500g',
                            active: true
                        },
                        {
                            id: uuidv4(),
                            name: 'Biscoito Cream Cracker',
                            category: 'Padaria',
                            brand: 'Adria',
                            unit: 'un',
                            averagePrice: 3.20,
                            barcode: '7891234567910',
                            description: 'Biscoito cream cracker, pacote de 200g',
                            active: true
                        }
                    ];

                    for (const item of sampleItems) {
                        await this.itemsDb.create({
                            ...item,
                            createdAt: new Date().toISOString()
                        });
                    }

                    console.log('Item Service: 22 itens de exemplo criados nas 5 categorias');
                }
            } catch (error) {
                console.error('Erro ao criar itens exemplo:', error);
            }
        }, 2000);
    }

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

    setupRoutes() {
        this.app.get('/health', async (req, res) => {
            try {
                const itemCount = await this.itemsDb.count();
                const activeItems = await this.itemsDb.count({ active: true });
                
                res.json({
                    status: 'healthy',
                    service: this.serviceName,
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    database: {
                        type: 'JSON-NoSQL',
                        itemCount,
                        activeItems
                    }
                });
            } catch (error) {
                res.status(500).json({
                    status: 'unhealthy',
                    service: this.serviceName,
                    error: error.message
                });
            }
        });

        this.app.get('/', (req, res) => {
            res.json({
                service: 'Item Service',
                version: '1.0.0',
                description: 'Microsserviço para gerenciamento de itens/catálogo com NoSQL',
                database: 'JSON-NoSQL',
                endpoints: [
                    'GET /items',
                    'GET /items/:id',
                    'POST /items',
                    'PUT /items/:id',
                    'GET /categories',
                    'GET /search?q=termo'
                ]
            });
        });

        this.app.get('/items', this.getItems.bind(this));
        this.app.get('/items/:id', this.getItem.bind(this));
        this.app.post('/items', this.authMiddleware.bind(this), this.createItem.bind(this));
        this.app.put('/items/:id', this.authMiddleware.bind(this), this.updateItem.bind(this));

        this.app.get('/categories', this.getCategories.bind(this));
        this.app.get('/search', this.searchItems.bind(this));
    }

    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: this.serviceName
            });
        });

        this.app.use((error, req, res, next) => {
            console.error('Item Service Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do serviço',
                service: this.serviceName
            });
        });
    }

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

    async getItems(req, res) {
        try {
            const { 
                category,
                name
            } = req.query;
            
            let filters = { active: true };

            if (category) {
                filters.category = category;
            }

            let items = await this.itemsDb.find(filters);

            // Filtro por nome (busca parcial)
            if (name) {
                const searchTerm = name.toLowerCase();
                items = items.filter(item => 
                    item.name?.toLowerCase().includes(searchTerm)
                );
            }

            res.json({
                success: true,
                data: items
            });
        } catch (error) {
            console.error('Erro ao buscar itens:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar itens'
            });
        }
    }

    async getItem(req, res) {
        try {
            const { id } = req.params;
            const item = await this.itemsDb.findById(id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado'
                });
            }

            res.json({
                success: true,
                data: item
            });
        } catch (error) {
            console.error('Erro ao buscar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar item'
            });
        }
    }

    async createItem(req, res) {
        try {
            const itemData = {
                id: uuidv4(),
                ...req.body,
                active: req.body.active !== undefined ? req.body.active : true,
                createdAt: new Date().toISOString()
            };

            const newItem = await this.itemsDb.create(itemData);

            res.status(201).json({
                success: true,
                message: 'Item criado com sucesso',
                data: newItem
            });
        } catch (error) {
            console.error('Erro ao criar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao criar item'
            });
        }
    }

    async updateItem(req, res) {
        try {
            const { id } = req.params;
            const updates = {
                ...req.body,
                updatedAt: new Date().toISOString()
            };

            const updatedItem = await this.itemsDb.update(id, updates);

            if (!updatedItem) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado'
                });
            }

            res.json({
                success: true,
                message: 'Item atualizado com sucesso',
                data: updatedItem
            });
        } catch (error) {
            console.error('Erro ao atualizar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar item'
            });
        }
    }

    async getCategories(req, res) {
        try {
            const items = await this.itemsDb.find({ active: true });
            const categories = [...new Set(items.map(item => item.category))].filter(Boolean);

            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar categorias'
            });
        }
    }

    async searchItems(req, res) {
        try {
            const { q: query } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro de busca "q" é obrigatório'
                });
            }

            const searchTerm = query.toLowerCase();
            const allItems = await this.itemsDb.find({ active: true });

            const results = allItems.filter(item => {
                const matchName = item.name?.toLowerCase().includes(searchTerm);
                const matchDescription = item.description?.toLowerCase().includes(searchTerm);
                const matchCategory = item.category?.toLowerCase().includes(searchTerm);
                const matchBrand = item.brand?.toLowerCase().includes(searchTerm);

                return matchName || matchDescription || matchCategory || matchBrand;
            });

            res.json({
                success: true,
                data: {
                    query,
                    results,
                    total: results.length
                }
            });
        } catch (error) {
            console.error('Erro na busca de itens:', error);
            res.status(500).json({
                success: false,
                message: 'Erro na busca de itens'
            });
        }
    }

    registerWithRegistry() {
        serviceRegistry.register(this.serviceName, {
            url: this.serviceUrl,
            version: '1.0.0',
            endpoints: ['/health', '/items', '/categories', '/search']
        });
    }

    startHealthReporting() {
        setInterval(() => {
            serviceRegistry.updateHealth(this.serviceName, true);
        }, 30000);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log('=====================================');
            console.log(`Item Service iniciado na porta ${this.port}`);
            console.log(`URL: ${this.serviceUrl}`);
            console.log(`Health: ${this.serviceUrl}/health`);
            console.log(`Database: JSON-NoSQL`);
            console.log('=====================================');
            
            this.registerWithRegistry();
            this.startHealthReporting();
        });
    }
}

if (require.main === module) {
    const service = new ItemService();
    service.start();

    process.on('SIGTERM', () => {
        serviceRegistry.unregister('item-service');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('item-service');
        process.exit(0);
    });
}

module.exports = ItemService;