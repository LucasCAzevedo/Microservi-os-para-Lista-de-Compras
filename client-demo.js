/**
 * @fileoverview Cliente de demonstração para Sistema de Lista de Compras
 * Sistema de Lista de Compras - PUC Minas
 * @author Lucas Cerqueira Azevedo
 * @version 1.0.0
 */

const axios = require('axios');

/**
 * Cliente para demonstração completa do sistema de microsserviços
 * @class ShoppingListClient
 */
class ShoppingListClient {
    /**
     * Construtor do cliente
     * @param {string} [gatewayUrl='http://localhost:3000'] - URL do API Gateway
     */
    constructor(gatewayUrl = 'http://localhost:3000') {
        this.gatewayUrl = gatewayUrl;
        this.authToken = null;
        this.user = null;
        
        // Configurar axios
        this.api = axios.create({
            baseURL: gatewayUrl,
            timeout: 10000
        });

        // Interceptor para adicionar token automaticamente
        this.api.interceptors.request.use(config => {
            if (this.authToken) {
                config.headers.Authorization = `Bearer ${this.authToken}`;
            }
            return config;
        });

        // Interceptor para log de erros
        this.api.interceptors.response.use(
            response => response,
            error => {
                console.error('Erro na requisição:', {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Registra um novo usuário no sistema
     * @async
     * @param {Object} userData - Dados do usuário para registro
     * @returns {Promise<Object>} Resposta do registro
     */
    async register(userData) {
        try {
            console.log('\n🔐 Registrando usuário...');
            const response = await this.api.post('/api/auth/register', userData);
            
            if (response.data.success) {
                this.authToken = response.data.data.token;
                this.user = response.data.data.user;
                console.log('✅ Usuário registrado:', this.user.username);
                console.log(`   Email: ${this.user.email}`);
                console.log(`   Nome: ${this.user.firstName} ${this.user.lastName}`);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Falha no registro');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro no registro:', message);
            throw error;
        }
    }

    /**
     * Realiza login de usuário
     * @async
     * @param {Object} credentials - Credenciais de login
     * @returns {Promise<Object>} Resposta do login
     */
    async login(credentials) {
        try {
            console.log('\n🔑 Fazendo login...');
            const response = await this.api.post('/api/auth/login', credentials);
            
            if (response.data.success) {
                this.authToken = response.data.data.token;
                this.user = response.data.data.user;
                console.log('✅ Login realizado:', this.user.username);
                console.log(`   Loja padrão: ${this.user.preferences?.defaultStore || 'Não definida'}`);
                console.log(`   Moeda: ${this.user.preferences?.currency || 'BRL'}`);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Falha no login');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro no login:', message);
            throw error;
        }
    }

    // Buscar itens
    async getItems(filters = {}) {
        try {
            console.log('\n� Buscando itens do catálogo...');
            const response = await this.api.get('/api/items', { params: filters });
            
            if (response.data.success) {
                const items = response.data.data;
                console.log(`✅ Encontrados ${items.length} itens`);
                items.slice(0, 10).forEach((item, index) => {
                    console.log(`  ${index + 1}. ${item.name} (${item.brand}) - R$ ${item.averagePrice}/${item.unit} [${item.category}]`);
                });
                if (items.length > 10) {
                    console.log(`  ... e mais ${items.length - 10} itens`);
                }
                return response.data;
            } else {
                console.log('❌ Resposta inválida do servidor');
                return { data: [] };
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro ao buscar itens:', message);
            return { data: [] };
        }
    }

    // Buscar categorias
    async getCategories() {
        try {
            console.log('\n📂 Buscando categorias...');
            const response = await this.api.get('/api/categories');
            
            if (response.data.success) {
                const categories = response.data.data;
                console.log(`✅ Encontradas ${categories.length} categorias`);
                categories.forEach((category, index) => {
                    console.log(`  ${index + 1}. ${category}`);
                });
                return response.data;
            } else {
                console.log('❌ Resposta inválida do servidor');
                return { data: [] };
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro ao buscar categorias:', message);
            return { data: [] };
        }
    }

    // Criar lista de compras
    async createList(listData) {
        try {
            console.log('\n📝 Criando lista de compras...');
            
            if (!this.authToken) {
                throw new Error('Token de autenticação necessário');
            }

            const response = await this.api.post('/api/lists', listData);
            
            if (response.data.success) {
                console.log('✅ Lista criada:', response.data.data.name);
                console.log(`   ID: ${response.data.data.id}`);
                console.log(`   Descrição: ${response.data.data.description || 'Nenhuma'}`);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Falha na criação da lista');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro ao criar lista:', message);
            throw error;
        }
    }

    // Buscar listas do usuário
    async getLists() {
        try {
            console.log('\n� Buscando suas listas...');
            
            if (!this.authToken) {
                throw new Error('Token de autenticação necessário');
            }

            const response = await this.api.get('/api/lists');
            
            if (response.data.success) {
                const lists = response.data.data;
                console.log(`✅ Encontradas ${lists.length} listas`);
                lists.forEach((list, index) => {
                    const status = list.status === 'active' ? '🟢' : list.status === 'completed' ? '✅' : '📦';
                    console.log(`  ${index + 1}. ${status} ${list.name} - ${list.summary.totalItems} itens (R$ ${list.summary.estimatedTotal.toFixed(2)})`);
                });
                return response.data;
            } else {
                console.log('❌ Resposta inválida do servidor');
                return { data: [] };
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro ao buscar listas:', message);
            return { data: [] };
        }
    }

    // Adicionar item à lista
    async addItemToList(listId, itemData) {
        try {
            console.log(`\n➕ Adicionando item à lista...`);
            
            if (!this.authToken) {
                throw new Error('Token de autenticação necessário');
            }

            const response = await this.api.post(`/api/lists/${listId}/items`, itemData);
            
            if (response.data.success) {
                console.log('✅ Item adicionado à lista');
                console.log(`   Item: ${itemData.itemName || 'Item'}`);
                console.log(`   Quantidade: ${itemData.quantity}`);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Falha ao adicionar item');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro ao adicionar item:', message);
            throw error;
        }
    }

    // Buscar resumo da lista
    async getListSummary(listId) {
        try {
            console.log(`\n📊 Buscando resumo da lista...`);
            
            if (!this.authToken) {
                throw new Error('Token de autenticação necessário');
            }

            const response = await this.api.get(`/api/lists/${listId}/summary`);
            
            if (response.data.success) {
                const summary = response.data.data;
                console.log('✅ Resumo da lista:', summary.listName);
                console.log(`   Total de itens: ${summary.summary.totalItems}`);
                console.log(`   Itens comprados: ${summary.summary.purchasedItems}`);
                console.log(`   Total estimado: R$ ${summary.summary.estimatedTotal.toFixed(2)}`);
                console.log(`   Status: ${summary.status}`);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Falha ao buscar resumo');
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro ao buscar resumo:', message);
            throw error;
        }
    }

    // Busca global
    async globalSearch(query, type = 'all') {
        try {
            console.log(`\n🔍 Busca global por "${query}"...`);
            const response = await this.api.get('/api/search', { 
                params: { q: query, type: type } 
            });
            
            if (response.data.success) {
                const results = response.data.data.results;
                
                if (results.items?.length > 0) {
                    console.log(`� Itens encontrados (${results.items.length}):`);
                    results.items.forEach((item, index) => {
                        console.log(`  ${index + 1}. ${item.name} (${item.brand}) - R$ ${item.averagePrice}/${item.unit}`);
                    });
                }
                
                if (results.lists?.length > 0) {
                    console.log(`� Listas encontradas (${results.lists.length}):`);
                    results.lists.forEach((list, index) => {
                        console.log(`  ${index + 1}. ${list.name} - ${list.summary.totalItems} itens`);
                    });
                }
                
                if (results.items?.length === 0 && results.lists?.length === 0) {
                    console.log('❌ Nenhum resultado encontrado');
                }
                
                return response.data;
            } else {
                console.log('❌ Resposta inválida do servidor');
                return { data: { results: {} } };
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro na busca:', message);
            return { data: { results: {} } };
        }
    }

    // Dashboard
    async getDashboard() {
        try {
            console.log('\n📊 Carregando dashboard...');
            
            if (!this.authToken) {
                throw new Error('Token de autenticação necessário');
            }

            const response = await this.api.get('/api/dashboard');
            
            if (response.data.success) {
                const dashboard = response.data.data;
                console.log('✅ Dashboard carregado:');
                
                if (dashboard.user) {
                    console.log(`👤 Usuário: ${dashboard.user.name} (${dashboard.user.email})`);
                }
                
                console.log(`  👥 Total de usuários: ${dashboard.summary.totalUsers}`);
                console.log(`  � Total de itens: ${dashboard.summary.totalItems}`);
                console.log(`  ✅ Itens ativos: ${dashboard.summary.activeItems}`);
                console.log(`  📂 Categorias: ${dashboard.summary.categories}`);
                console.log(`  � Total de listas: ${dashboard.summary.totalLists}`);
                console.log(`  🟢 Listas ativas: ${dashboard.summary.activeLists}`);
                
                if (dashboard.summary.userLists !== undefined) {
                    console.log(`  👤 Suas listas: ${dashboard.summary.userLists}`);
                }
                
                console.log('\n🏥 Status dos serviços:');
                Object.entries(dashboard.services).forEach(([service, data]) => {
                    const status = data.status === 'healthy' ? '✅' : '❌';
                    console.log(`  ${status} ${service}: ${data.status}`);
                });
                
                return response.data;
            } else {
                console.log('❌ Resposta inválida do servidor');
                return { data: {} };
            }
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            console.log('❌ Erro ao carregar dashboard:', message);
            return { data: {} };
        }
    }

    // Verificar saúde dos serviços
    async healthCheck() {
        try {
            console.log('\n🏥 Verificando saúde dos serviços...');
            const response = await this.api.get('/health');
            
            console.log('✅ API Gateway OK');
            console.log(`📊 Serviços registrados: ${response.data.serviceCount}`);
            
            Object.entries(response.data.services).forEach(([name, service]) => {
                const status = service.healthy ? '✅' : '❌';
                console.log(`  ${status} ${name}: ${service.url}`);
            });
            
            return response.data;
        } catch (error) {
            console.log('❌ API Gateway indisponível');
            throw error;
        }
    }
}

/**
 * Executa demonstração completa do Sistema de Lista de Compras
 * @async
 */
async function runDemo() {
    const client = new ShoppingListClient();
    
    console.log('🚀 Demonstração do Sistema de Lista de Compras com Microsserviços');
    console.log('=================================================================');
    
    try {
        // 1. Health check inicial
        await client.healthCheck();

        // 2. Dashboard público inicial
        console.log('\n📊 Dashboard público inicial:');
        try {
            await client.getDashboard();
        } catch (error) {
            console.log('ℹ️ Dashboard requer autenticação');
        }

        // 3. Login com usuário admin (criado automaticamente)
        console.log('\n🔑 Fazendo login com usuário administrador...');
        await client.login({
            identifier: 'admin@microservices.com',
            password: 'admin123'
        });

        // 4. Dashboard autenticado
        await client.getDashboard();

        // 5. Buscar itens disponíveis
        const itemsResponse = await client.getItems();
        const availableItems = itemsResponse.data || [];

        // 6. Buscar categorias
        await client.getCategories();

        // 7. Buscar itens por categoria
        if (availableItems.length > 0) {
            console.log('\n🛒 Buscando itens da categoria "Alimentos"...');
            await client.getItems({ category: 'Alimentos' });
        }

        // 8. Criar uma nova lista de compras
        const listResponse = await client.createList({
            name: 'Lista de Compras Semanal',
            description: 'Compras para a semana'
        });
        
        const listId = listResponse.data?.id;

        // 9. Adicionar itens à lista (se temos itens disponíveis)
        if (listId && availableItems.length > 0) {
            console.log('\n➕ Adicionando itens à lista...');
            
            // Adicionar alguns itens de exemplo
            const itemsToAdd = availableItems.slice(0, 3);
            
            for (const item of itemsToAdd) {
                await client.addItemToList(listId, {
                    itemId: item.id,
                    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 unidades
                    estimatedPrice: item.averagePrice,
                    notes: `Adicionado automaticamente na demo`
                });
            }

            // 10. Ver resumo da lista
            await client.getListSummary(listId);
        }

        // 11. Ver todas as listas do usuário
        await client.getLists();

        // 12. Registrar um novo usuário
        console.log('\n👤 Registrando novo usuário...');
        await client.register({
            email: 'usuario@exemplo.com',
            username: 'usuario_exemplo',
            password: 'senha123',
            firstName: 'João',
            lastName: 'Silva',
            defaultStore: 'Supermercado Extra',
            currency: 'BRL'
        });

        // 13. Criar lista como novo usuário
        const newUserListResponse = await client.createList({
            name: 'Minha Primeira Lista',
            description: 'Lista de teste do novo usuário'
        });

        // 14. Busca global por itens
        await client.globalSearch('arroz');
        await client.globalSearch('limpeza', 'items');

        // 15. Dashboard final com novo usuário
        await client.getDashboard();

        console.log('\n🎉 Demonstração concluída com sucesso!');
        console.log('=================================================================');
        console.log('✅ Funcionalidades demonstradas:');
        console.log('   • Registro e login de usuários');
        console.log('   • Busca de itens no catálogo');
        console.log('   • Criação de listas de compras');  
        console.log('   • Adição de itens às listas');
        console.log('   • Visualização do dashboard');
        console.log('   • Health checks dos serviços');
        console.log('   • Service discovery');
        console.log('   • Circuit breaker');
        console.log('   • Busca global');
        
    } catch (error) {
        console.error('\n💥 Erro na demonstração:', error.message);
        process.exit(1);
    }
}

/**
 * Execução principal quando chamado diretamente
 */
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log('🚀 Cliente de demonstração dos microsserviços');
        console.log('=====================================');
        console.log('Uso: node client-demo.js [opções]');
        console.log('');
        console.log('Opções:');
        console.log('  --help, -h     Mostra esta ajuda');
        console.log('  --health       Apenas verifica saúde dos serviços');
        console.log('  --dashboard    Apenas mostra o dashboard');
        console.log('  --products     Apenas lista produtos');
        console.log('');
        console.log('Sem opções: executa demonstração completa');
        process.exit(0);
    }
    
    // Aguardar um pouco para garantir que os serviços estejam prontos
    setTimeout(async () => {
        const client = new ShoppingListClient();
        
        try {
            if (args.includes('--health')) {
                await client.healthCheck();
            } else if (args.includes('--dashboard')) {
                await client.getDashboard();
            } else if (args.includes('--items')) {
                await client.getItems();
            } else {
                await runDemo();
            }
        } catch (error) {
            console.error('💥 Erro:', error.message);
            console.log('\n💡 Dica: Certifique-se de que todos os serviços estão rodando:');
            console.log('   npm start');
            process.exit(1);
        }
    }, 2000);
}

module.exports = ShoppingListClient;
