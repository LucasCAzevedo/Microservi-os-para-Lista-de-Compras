/**
 * @fileoverview Implementação de um banco de dados NoSQL baseado em arquivos JSON
 * Sistema de Lista de Compras - PUC Minas
 * @author Lucas Cerqueira Azevedo
 * @version 1.0.0
 */

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Classe que implementa um banco de dados NoSQL usando arquivos JSON
 * Fornece operações CRUD com suporte a indexação e busca
 * @class JsonDatabase
 */
class JsonDatabase {
    /**
     * Construtor da classe JsonDatabase
     * @param {string} dbPath - Caminho do diretório do banco de dados
     * @param {string} collectionName - Nome da coleção/tabela
     */
    constructor(dbPath, collectionName) {
        this.dbPath = dbPath;
        this.collectionName = collectionName;
        this.filePath = path.join(dbPath, `${collectionName}.json`);
        this.indexPath = path.join(dbPath, `${collectionName}_index.json`);

        this.ensureDatabase();
    }

    /**
     * Garante que o banco de dados e seus arquivos existam
     * Cria diretório e arquivos de coleção e índice se necessário
     * @async
     * @returns {Promise<void>}
     */
    async ensureDatabase() {
        try {
            // Criar diretório do banco se não existir
            await fs.ensureDir(this.dbPath);

            // Criar arquivo da coleção se não existir
            if (!await fs.pathExists(this.filePath)) {
                await fs.writeJson(this.filePath, []);
            }

            // Criar índice se não existir
            if (!await fs.pathExists(this.indexPath)) {
                await fs.writeJson(this.indexPath, {});
            }
        } catch (error) {
            console.error('Erro ao inicializar banco:', error);
            throw error;
        }
    }

    /**
     * Cria um novo documento na coleção
     * @async
     * @param {Object} data - Dados do documento a ser criado
     * @returns {Promise<Object>} O documento criado com ID e timestamps
     */
    async create(data) {
        try {
            const documents = await this.readAll();
            const document = {
                id: data.id || uuidv4(),
                ...data,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            documents.push(document);
            await this.writeAll(documents);
            await this.updateIndex(document);

            return document;
        } catch (error) {
            console.error('Erro ao criar documento:', error);
            throw error;
        }
    }

    /**
     * Busca um documento pelo ID
     * @async
     * @param {string} id - ID do documento
     * @returns {Promise<Object|null>} O documento encontrado ou null
     */
    async findById(id) {
        try {
            const documents = await this.readAll();
            return documents.find(doc => doc.id === id) || null;
        } catch (error) {
            console.error('Erro ao buscar documento:', error);
            throw error;
        }
    }

    /**
     * Busca um documento que atenda aos critérios de filtro
     * @async
     * @param {Object} filter - Critérios de busca
     * @returns {Promise<Object|null>} O primeiro documento encontrado ou null
     */
    async findOne(filter) {
        try {
            const documents = await this.readAll();
            return documents.find(doc => this.matchesFilter(doc, filter)) || null;
        } catch (error) {
            console.error('Erro ao buscar documento:', error);
            throw error;
        }
    }

    /**
     * Busca múltiplos documentos com filtros e opções
     * @async
     * @param {Object} [filter={}] - Critérios de busca
     * @param {Object} [options={}] - Opções de busca (sort, skip, limit)
     * @param {Object} [options.sort] - Critérios de ordenação
     * @param {number} [options.skip] - Número de documentos para pular
     * @param {number} [options.limit] - Limite de documentos retornados
     * @returns {Promise<Array>} Array de documentos encontrados
     */
    async find(filter = {}, options = {}) {
        try {
            let documents = await this.readAll();

            // Aplicar filtro
            if (Object.keys(filter).length > 0) {
                documents = documents.filter(doc => this.matchesFilter(doc, filter));
            }

            // Aplicar ordenação
            if (options.sort) {
                documents = this.sortDocuments(documents, options.sort);
            }

            // Aplicar paginação
            if (options.skip || options.limit) {
                const skip = options.skip || 0;
                const limit = options.limit || documents.length;
                documents = documents.slice(skip, skip + limit);
            }

            return documents;
        } catch (error) {
            console.error('Erro ao buscar documentos:', error);
            throw error;
        }
    }

    /**
     * Conta o número de documentos que atendem aos critérios
     * @async
     * @param {Object} [filter={}] - Critérios de busca
     * @returns {Promise<number>} Número de documentos encontrados
     */
    async count(filter = {}) {
        try {
            const documents = await this.readAll();
            if (Object.keys(filter).length === 0) {
                return documents.length;
            }
            return documents.filter(doc => this.matchesFilter(doc, filter)).length;
        } catch (error) {
            console.error('Erro ao contar documentos:', error);
            throw error;
        }
    }

    /**
     * Atualiza um documento existente
     * @async
     * @param {string} id - ID do documento a ser atualizado
     * @param {Object} updates - Dados para atualização
     * @returns {Promise<Object|null>} O documento atualizado ou null se não encontrado
     */
    async update(id, updates) {
        try {
            const documents = await this.readAll();
            const index = documents.findIndex(doc => doc.id === id);

            if (index === -1) {
                return null;
            }

            documents[index] = {
                ...documents[index],
                ...updates,
                id: documents[index].id, // Preservar ID
                createdAt: documents[index].createdAt, // Preservar data de criação
                updatedAt: new Date().toISOString()
            };

            await this.writeAll(documents);
            await this.updateIndex(documents[index]);

            return documents[index];
        } catch (error) {
            console.error('Erro ao atualizar documento:', error);
            throw error;
        }
    }

    /**
     * Remove um documento da coleção
     * @async
     * @param {string} id - ID do documento a ser removido
     * @returns {Promise<boolean>} true se removido com sucesso, false se não encontrado
     */
    async delete(id) {
        try {
            const documents = await this.readAll();
            const index = documents.findIndex(doc => doc.id === id);

            if (index === -1) {
                return false;
            }

            documents.splice(index, 1);
            await this.writeAll(documents);
            await this.removeFromIndex(id);

            return true;
        } catch (error) {
            console.error('Erro ao deletar documento:', error);
            throw error;
        }
    }

    /**
     * Realiza busca de texto nos documentos
     * @async
     * @param {string} query - Termo de busca
     * @param {Array<string>} [fields=[]] - Campos específicos para buscar
     * @returns {Promise<Array>} Array de documentos que contêm o termo
     */
    async search(query, fields = []) {
        try {
            const documents = await this.readAll();
            const searchTerm = query.toLowerCase();

            return documents.filter(doc => {
                // Se campos específicos foram fornecidos, buscar apenas neles
                if (fields.length > 0) {
                    return fields.some(field => {
                        const value = this.getNestedValue(doc, field);
                        return value && value.toString().toLowerCase().includes(searchTerm);
                    });
                }

                // Buscar em todos os campos de string do documento
                return this.searchInObject(doc, searchTerm);
            });
        } catch (error) {
            console.error('Erro na busca:', error);
            throw error;
        }
    }

    /**
     * MÉTODOS AUXILIARES PRIVADOS
     */

    /**
     * Lê todos os documentos do arquivo
     * @async
     * @private
     * @returns {Promise<Array>} Array de documentos
     */
    async readAll() {
        try {
            return await fs.readJson(this.filePath);
        } catch (error) {
            return [];
        }
    }

    /**
     * Escreve todos os documentos no arquivo
     * @async
     * @private
     * @param {Array} documents - Array de documentos para salvar
     * @returns {Promise<void>}
     */
    async writeAll(documents) {
        await fs.writeJson(this.filePath, documents, { spaces: 2 });
    }

    /**
     * Atualiza o índice com informações do documento
     * @async
     * @private
     * @param {Object} document - Documento para indexar
     * @returns {Promise<void>}
     */
    async updateIndex(document) {
        try {
            let index = {};
            if (await fs.pathExists(this.indexPath)) {
                index = await fs.readJson(this.indexPath);
            }
            index[document.id] = {
                id: document.id,
                updatedAt: document.updatedAt
            };
            await fs.writeJson(this.indexPath, index, { spaces: 2 });
        } catch (error) {
            console.error('Erro ao atualizar índice:', error);
        }
    }

    /**
     * Remove documento do índice
     * @async
     * @private
     * @param {string} id - ID do documento a ser removido do índice
     * @returns {Promise<void>}
     */
    async removeFromIndex(id) {
        try {
            if (await fs.pathExists(this.indexPath)) {
                const index = await fs.readJson(this.indexPath);
                delete index[id];
                await fs.writeJson(this.indexPath, index, { spaces: 2 });
            }
        } catch (error) {
            console.error('Erro ao remover do índice:', error);
        }
    }

    /**
     * Verifica se um documento atende aos critérios de filtro
     * @private
     * @param {Object} document - Documento a ser verificado
     * @param {Object} filter - Critérios de filtro
     * @returns {boolean} true se o documento atende aos critérios
     */
    matchesFilter(document, filter) {
        return Object.entries(filter).every(([key, value]) => {
            const docValue = this.getNestedValue(document, key);

            if (typeof value === 'object' && value !== null) {
                // Operadores especiais
                if (value.$regex) {
                    const regex = new RegExp(value.$regex, value.$options || 'i');
                    return regex.test(docValue);
                }
                if (value.$in) {
                    return value.$in.includes(docValue);
                }
                if (value.$gt) {
                    return docValue > value.$gt;
                }
                if (value.$lt) {
                    return docValue < value.$lt;
                }
                if (value.$gte) {
                    return docValue >= value.$gte;
                }
                if (value.$lte) {
                    return docValue <= value.$lte;
                }
            }

            return docValue === value;
        });
    }

    /**
     * Obtém valor de propriedade aninhada usando notação de ponto
     * @private
     * @param {Object} obj - Objeto fonte
     * @param {string} path - Caminho da propriedade (ex: "user.name")
     * @returns {*} Valor da propriedade ou undefined
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Ordena documentos baseado nas opções de ordenação
     * @private
     * @param {Array} documents - Documentos a serem ordenados
     * @param {Object} sortOptions - Opções de ordenação
     * @returns {Array} Documentos ordenados
     */
    sortDocuments(documents, sortOptions) {
        return documents.sort((a, b) => {
            for (const [field, direction] of Object.entries(sortOptions)) {
                const valueA = this.getNestedValue(a, field);
                const valueB = this.getNestedValue(b, field);

                let comparison = 0;
                if (valueA < valueB) comparison = -1;
                if (valueA > valueB) comparison = 1;

                if (comparison !== 0) {
                    return direction === -1 ? -comparison : comparison;
                }
            }
            return 0;
        });
    }

    /**
     * Busca recursivamente por termo em objeto
     * @private
     * @param {Object} obj - Objeto para buscar
     * @param {string} searchTerm - Termo de busca
     * @returns {boolean} true se o termo foi encontrado
     */
    searchInObject(obj, searchTerm) {
        for (const value of Object.values(obj)) {
            if (typeof value === 'string' && value.toLowerCase().includes(searchTerm)) {
                return true;
            }
            if (typeof value === 'object' && value !== null && this.searchInObject(value, searchTerm)) {
                return true;
            }
        }
        return false;
    }
}

module.exports = JsonDatabase;
