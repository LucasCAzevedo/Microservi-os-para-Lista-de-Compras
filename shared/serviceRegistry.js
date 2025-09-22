/**
 * @fileoverview Service Registry baseado em arquivo para descoberta de microsserviços
 * Sistema de Lista de Compras - PUC Minas
 * @author Lucas Cerqueira Azevedo
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Implementação de Service Registry usando arquivo compartilhado
 * Permite registro, descoberta e health checks de microsserviços
 * @class FileBasedServiceRegistry
 */
class FileBasedServiceRegistry {
    /**
     * Construtor do Service Registry
     * Inicializa o arquivo de registro se não existir
     */
    constructor() {
        this.registryFile = path.join(__dirname, 'services-registry.json');
        this.ensureRegistryFile();
        console.log('File-based Service Registry inicializado:', this.registryFile);
    }

    /**
     * Garante que o arquivo de registro existe
     * @private
     */
    ensureRegistryFile() {
        if (!fs.existsSync(this.registryFile)) {
            this.writeRegistry({});
        }
    }

    /**
     * Lê o arquivo de registro de serviços
     * @private
     * @returns {Object} Objeto com serviços registrados
     */
    readRegistry() {
        try {
            const data = fs.readFileSync(this.registryFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Erro ao ler registry file:', error.message);
            return {};
        }
    }

    /**
     * Escreve dados no arquivo de registro
     * @private
     * @param {Object} services - Objeto com serviços para salvar
     */
    writeRegistry(services) {
        try {
            fs.writeFileSync(this.registryFile, JSON.stringify(services, null, 2));
        } catch (error) {
            console.error('Erro ao escrever registry file:', error.message);
        }
    }

    /**
     * Registra um novo serviço no registry
     * @param {string} serviceName - Nome do serviço
     * @param {Object} serviceInfo - Informações do serviço (url, version, endpoints)
     */
    register(serviceName, serviceInfo) {
        const services = this.readRegistry();
        
        services[serviceName] = {
            ...serviceInfo,
            registeredAt: Date.now(),
            lastHealthCheck: Date.now(),
            healthy: true,
            pid: process.pid
        };
        
        this.writeRegistry(services);
        console.log(`Serviço registrado: ${serviceName} - ${serviceInfo.url} (PID: ${process.pid})`);
        console.log(`Total de serviços: ${Object.keys(services).length}`);
    }

    /**
     * Descobre um serviço pelo nome
     * @param {string} serviceName - Nome do serviço a ser descoberto
     * @returns {Object} Informações do serviço encontrado
     * @throws {Error} Se o serviço não for encontrado ou estiver indisponível
     */
    discover(serviceName) {
        const services = this.readRegistry();
        console.log(`Procurando serviço: ${serviceName}`);
        console.log(`Serviços disponíveis: ${Object.keys(services).join(', ')}`);
        
        const service = services[serviceName];
        if (!service) {
            console.error(`Serviço não encontrado: ${serviceName}`);
            console.error(`Serviços registrados:`, Object.keys(services));
            throw new Error(`Serviço não encontrado: ${serviceName}`);
        }
        
        if (!service.healthy) {
            console.error(`Serviço indisponível: ${serviceName}`);
            throw new Error(`Serviço indisponível: ${serviceName}`);
        }
        
        console.log(`Serviço encontrado: ${serviceName} - ${service.url}`);
        return service;
    }

    /**
     * Lista todos os serviços registrados
     * @returns {Object} Objeto com informações de todos os serviços
     */
    listServices() {
        const services = this.readRegistry();
        const serviceList = {};
        
        Object.entries(services).forEach(([name, service]) => {
            serviceList[name] = {
                url: service.url,
                healthy: service.healthy,
                registeredAt: new Date(service.registeredAt).toISOString(),
                uptime: Date.now() - service.registeredAt,
                pid: service.pid
            };
        });
        
        return serviceList;
    }

    /**
     * Remove um serviço do registry
     * @param {string} serviceName - Nome do serviço a ser removido
     * @returns {boolean} true se removido com sucesso
     */
    unregister(serviceName) {
        const services = this.readRegistry();
        if (services[serviceName]) {
            delete services[serviceName];
            this.writeRegistry(services);
            console.log(`Serviço removido: ${serviceName}`);
            return true;
        }
        return false;
    }

    /**
     * Atualiza o status de saúde de um serviço
     * @param {string} serviceName - Nome do serviço
     * @param {boolean} healthy - Status de saúde do serviço
     */
    updateHealth(serviceName, healthy) {
        const services = this.readRegistry();
        if (services[serviceName]) {
            services[serviceName].healthy = healthy;
            services[serviceName].lastHealthCheck = Date.now();
            this.writeRegistry(services);
            const status = healthy ? 'OK' : 'FAIL';
            console.log(`Health check: ${serviceName} - ${status}`);
        }
    }

    /**
     * Executa health checks em todos os serviços registrados
     * @async
     */
    async performHealthChecks() {
        const axios = require('axios');
        const services = this.readRegistry();
        
        console.log(`Executando health checks de ${Object.keys(services).length} serviços...`);
        
        for (const [serviceName, service] of Object.entries(services)) {
            try {
                await axios.get(`${service.url}/health`, { 
                    timeout: 5000,
                    family: 4
                });
                this.updateHealth(serviceName, true);
            } catch (error) {
                console.error(`Health check falhou para ${serviceName}:`, error.message);
                this.updateHealth(serviceName, false);
            }
        }
    }

    /**
     * Exibe lista de serviços registrados para debug
     */
    debugListServices() {
        const services = this.readRegistry();
        console.log('DEBUG - Serviços registrados:');
        Object.entries(services).forEach(([name, service]) => {
            console.log(`   ${name}: ${service.url} (${service.healthy ? 'healthy' : 'unhealthy'}) PID:${service.pid}`);
        });
    }

    /**
     * Verifica se um serviço existe no registry
     * @param {string} serviceName - Nome do serviço
     * @returns {boolean} true se o serviço existe
     */
    hasService(serviceName) {
        const services = this.readRegistry();
        return services.hasOwnProperty(serviceName);
    }

    /**
     * Obtém estatísticas dos serviços registrados
     * @returns {Object} Estatísticas (total, healthy, unhealthy)
     */
    getStats() {
        const services = this.readRegistry();
        const total = Object.keys(services).length;
        let healthy = 0;
        let unhealthy = 0;

        Object.values(services).forEach(service => {
            if (service.healthy) {
                healthy++;
            } else {
                unhealthy++;
            }
        });

        return { total, healthy, unhealthy };
    }

    /**
     * Limpa todos os serviços do registry (para desenvolvimento)
     */
    clear() {
        this.writeRegistry({});
        console.log('Registry limpo');
    }

    /**
     * Remove serviços do PID atual ao sair do processo
     */
    cleanup() {
        // Remove serviços deste PID ao sair
        const services = this.readRegistry();
        const currentPid = process.pid;
        let changed = false;

        Object.entries(services).forEach(([name, service]) => {
            if (service.pid === currentPid) {
                delete services[name];
                changed = true;
                console.log(`Removendo serviço ${name} do PID ${currentPid}`);
            }
        });

        if (changed) {
            this.writeRegistry(services);
        }
    }
}

/**
 * Instância singleton do Service Registry
 * @type {FileBasedServiceRegistry}
 */
const registry = new FileBasedServiceRegistry();

/**
 * Configura cleanup automático na saída do processo
 */
process.on('exit', () => registry.cleanup());
process.on('SIGINT', () => {
    registry.cleanup();
    process.exit(0);
});
process.on('SIGTERM', () => {
    registry.cleanup();
    process.exit(0);
});

module.exports = registry;
