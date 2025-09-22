/**
 * @fileoverview List Service - Microsserviço para gerenciamento de listas de compras
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
 * Microsserviço responsável pelo gerenciamento de listas de compras
 * @class ListService
 */
class ListService {
    /**
     * Construtor do List Service
     * Inicializa Express app e banco de dados
     */
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3002;
        this.serviceName = 'list-service';
        this.serviceUrl = `http://localhost:${this.port}`;
        
        this.setupDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupDatabase() {
        const dbPath = path.join(__dirname, 'database');
        this.listsDb = new JsonDatabase(dbPath, 'lists');
        console.log('List Service: Banco NoSQL inicializado');
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
                const listCount = await this.listsDb.count();
                const activeLists = await this.listsDb.count({ status: 'active' });
                
                res.json({
                    status: 'healthy',
                    service: this.serviceName,
                    version: '1.0.0',
                    timestamp: new Date().toISOString(),
                    database: {
                        type: 'JSON-NoSQL',
                        listCount,
                        activeLists
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
                service: 'List Service',
                version: '1.0.0',
                description: 'Microsserviço para gerenciamento de listas de compras com NoSQL',
                database: 'JSON-NoSQL',
                endpoints: [
                    'POST /lists',
                    'GET /lists',
                    'GET /lists/:id',
                    'PUT /lists/:id',
                    'DELETE /lists/:id',
                    'POST /lists/:id/items',
                    'PUT /lists/:id/items/:itemId',
                    'DELETE /lists/:id/items/:itemId',
                    'GET /lists/:id/summary'
                ]
            });
        });

        this.app.post('/lists', this.authMiddleware.bind(this), this.createList.bind(this));
        this.app.get('/lists', this.authMiddleware.bind(this), this.getLists.bind(this));
        this.app.get('/lists/:id', this.authMiddleware.bind(this), this.getList.bind(this));
        this.app.put('/lists/:id', this.authMiddleware.bind(this), this.updateList.bind(this));
        this.app.delete('/lists/:id', this.authMiddleware.bind(this), this.deleteList.bind(this));

        this.app.post('/lists/:id/items', this.authMiddleware.bind(this), this.addItemToList.bind(this));
        this.app.put('/lists/:id/items/:itemId', this.authMiddleware.bind(this), this.updateItemInList.bind(this));
        this.app.delete('/lists/:id/items/:itemId', this.authMiddleware.bind(this), this.removeItemFromList.bind(this));

        this.app.get('/lists/:id/summary', this.authMiddleware.bind(this), this.getListSummary.bind(this));
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
            console.error('List Service Error:', error);
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

    async createList(req, res) {
        try {
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome da lista é obrigatório'
                });
            }

            const listData = {
                id: uuidv4(),
                userId: req.user.id,
                name,
                description: description || '',
                status: 'active',
                items: [],
                summary: {
                    totalItems: 0,
                    purchasedItems: 0,
                    estimatedTotal: 0
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const newList = await this.listsDb.create(listData);

            res.status(201).json({
                success: true,
                message: 'Lista criada com sucesso',
                data: newList
            });
        } catch (error) {
            console.error('Erro ao criar lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao criar lista'
            });
        }
    }

    async getLists(req, res) {
        try {
            const lists = await this.listsDb.find({ userId: req.user.id });

            res.json({
                success: true,
                data: lists
            });
        } catch (error) {
            console.error('Erro ao buscar listas:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar listas'
            });
        }
    }

    async getList(req, res) {
        try {
            const { id } = req.params;
            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            // Verificar se o usuário é o dono da lista
            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            res.json({
                success: true,
                data: list
            });
        } catch (error) {
            console.error('Erro ao buscar lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar lista'
            });
        }
    }

    async updateList(req, res) {
        try {
            const { id } = req.params;
            const { name, description, status } = req.body;

            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            const updates = { ...list };
            if (name) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (status) updates.status = status;
            updates.updatedAt = new Date().toISOString();

            const updatedList = await this.listsDb.update(id, updates);

            res.json({
                success: true,
                message: 'Lista atualizada com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao atualizar lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar lista'
            });
        }
    }

    async deleteList(req, res) {
        try {
            const { id } = req.params;
            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            await this.listsDb.delete(id);

            res.json({
                success: true,
                message: 'Lista removida com sucesso'
            });
        } catch (error) {
            console.error('Erro ao remover lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao remover lista'
            });
        }
    }

    async addItemToList(req, res) {
        try {
            const { id } = req.params;
            const { itemId, quantity, estimatedPrice, notes } = req.body;

            if (!itemId || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'ItemId e quantity são obrigatórios'
                });
            }

            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Buscar dados do item no Item Service
            let itemData = null;
            try {
                const itemService = serviceRegistry.discover('item-service');
                
                if (!itemService) {
                    return res.status(503).json({
                        success: false,
                        message: 'Item Service indisponível'
                    });
                }
                
                const itemResponse = await axios.get(`${itemService.url}/items/${itemId}`, { timeout: 5000 });
                itemData = itemResponse.data.data;
            } catch (error) {
                console.log('Erro ao buscar item:', error.message);
                
                // Se o item não foi encontrado (404), retornar erro
                if (error.response && error.response.status === 404) {
                    return res.status(404).json({
                        success: false,
                        message: `Item com ID '${itemId}' não encontrado no catálogo`
                    });
                }
                
                // Se houve outro erro de conexão, retornar erro de serviço
                return res.status(503).json({
                    success: false,
                    message: 'Erro ao verificar item no catálogo'
                });
            }

            // Verificar se o item foi encontrado
            if (!itemData) {
                return res.status(404).json({
                    success: false,
                    message: `Item com ID '${itemId}' não encontrado no catálogo`
                });
            }

            // Verificar se item já existe na lista
            const existingItemIndex = list.items.findIndex(item => item.itemId === itemId);
            if (existingItemIndex !== -1) {
                return res.status(409).json({
                    success: false,
                    message: 'Item já existe na lista'
                });
            }

            const newItem = {
                itemId,
                itemName: itemData.name,
                quantity: parseFloat(quantity),
                unit: itemData.unit,
                estimatedPrice: estimatedPrice || itemData.averagePrice,
                purchased: false,
                notes: notes || '',
                addedAt: new Date().toISOString()
            };

            list.items.push(newItem);
            
            // Recalcular resumo
            this.updateListSummary(list);
            list.updatedAt = new Date().toISOString();

            const updatedList = await this.listsDb.update(id, list);

            res.status(201).json({
                success: true,
                message: 'Item adicionado à lista com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao adicionar item à lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao adicionar item à lista'
            });
        }
    }

    async updateItemInList(req, res) {
        try {
            const { id, itemId } = req.params;
            const { quantity, estimatedPrice, purchased, notes } = req.body;

            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            const itemIndex = list.items.findIndex(item => item.itemId === itemId);
            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado na lista'
                });
            }

            // Atualizar campos do item
            if (quantity !== undefined) list.items[itemIndex].quantity = parseFloat(quantity);
            if (estimatedPrice !== undefined) list.items[itemIndex].estimatedPrice = parseFloat(estimatedPrice);
            if (purchased !== undefined) list.items[itemIndex].purchased = purchased;
            if (notes !== undefined) list.items[itemIndex].notes = notes;

            // Recalcular resumo
            this.updateListSummary(list);
            list.updatedAt = new Date().toISOString();

            const updatedList = await this.listsDb.update(id, list);

            res.json({
                success: true,
                message: 'Item atualizado com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao atualizar item na lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao atualizar item na lista'
            });
        }
    }

    async removeItemFromList(req, res) {
        try {
            const { id, itemId } = req.params;

            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            const itemIndex = list.items.findIndex(item => item.itemId === itemId);
            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado na lista'
                });
            }

            list.items.splice(itemIndex, 1);

            // Recalcular resumo
            this.updateListSummary(list);
            list.updatedAt = new Date().toISOString();

            const updatedList = await this.listsDb.update(id, list);

            res.json({
                success: true,
                message: 'Item removido da lista com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao remover item da lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao remover item da lista'
            });
        }
    }

    async getListSummary(req, res) {
        try {
            const { id } = req.params;
            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            // Recalcular resumo atualizado
            this.updateListSummary(list);

            res.json({
                success: true,
                data: {
                    listId: list.id,
                    listName: list.name,
                    summary: list.summary,
                    status: list.status,
                    updatedAt: list.updatedAt
                }
            });
        } catch (error) {
            console.error('Erro ao buscar resumo da lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao buscar resumo da lista'
            });
        }
    }

    // Método auxiliar para atualizar resumo da lista
    updateListSummary(list) {
        const totalItems = list.items.length;
        const purchasedItems = list.items.filter(item => item.purchased).length;
        const estimatedTotal = list.items.reduce((total, item) => {
            return total + (item.quantity * item.estimatedPrice);
        }, 0);

        list.summary = {
            totalItems,
            purchasedItems,
            estimatedTotal: parseFloat(estimatedTotal.toFixed(2))
        };
    }

    registerWithRegistry() {
        serviceRegistry.register(this.serviceName, {
            url: this.serviceUrl,
            version: '1.0.0',
            endpoints: ['/health', '/lists', '/lists/:id/items', '/lists/:id/summary']
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
            console.log(`List Service iniciado na porta ${this.port}`);
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
    const service = new ListService();
    service.start();

    process.on('SIGTERM', () => {
        serviceRegistry.unregister('list-service');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('list-service');
        process.exit(0);
    });
}

module.exports = ListService;