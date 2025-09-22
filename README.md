# Sistema de Lista de Compras com Microsserviços

**Laboratório de Desenvolvimento de Aplicações Móveis e Distribuídas**  
**Curso de Engenharia de Software - PUC Minas**

## Objetivos

Desenvolver um sistema distribuído para gerenciamento de listas de compras utilizando arquitetura de microsserviços com API Gateway, Service Discovery e bancos NoSQL independentes, conforme especificado no TarefaRoteiro03.MD.

## Estrutura do Projeto

```
lab03-microservices-nosql/
├── package.json                    # Scripts principais
├── client-demo.js                  # Cliente de demonstração
├── README.md                       # Documentação
├── TarefaRoteiro03.MD              # Especificação completa do projeto
├── shared/
│   ├── JsonDatabase.js             # Banco NoSQL genérico
│   └── serviceRegistry.js          # Service discovery
├── services/
│   ├── user-service/               # PARTE 1 - Gerenciamento de usuários
│   │   ├── server.js               # User Service
│   │   ├── package.json
│   │   └── database/               # Banco NoSQL do User Service
│   │       ├── users.json          # Coleção de usuários
│   │       └── users_index.json    # Índice
│   ├── item-service/               # PARTE 2 - Catálogo de itens/produtos
│   │   ├── server.js               # Item Service
│   │   ├── package.json
│   │   └── database/               # Banco NoSQL do Item Service
│   │       ├── items.json          # Coleção de itens
│   │       └── items_index.json    # Índice de itens
│   └── list-service/               # PARTE 3 - Listas de compras
│       ├── server.js               # List Service
│       ├── package.json
│       └── database/               # Banco NoSQL do List Service
│           ├── lists.json          # Coleção de listas
│           └── lists_index.json    # Índice de listas
└── api-gateway/
    ├── server.js                   # API Gateway
    └── package.json
```

## Instalação e Execução

### Pré-requisitos
- Node.js >= 16.0.0
- npm >= 8.0.0

### Instalação das dependências
```bash
npm run install:all
```

### Executar todos os serviços
```bash
npm start
```

### Executar em modo de desenvolvimento
```bash
npm run dev
```

### Executar cliente de demonstração
```bash
npm run demo
```

### Verificar saúde dos serviços
```bash
npm run health
```

## Portas dos Serviços

| Serviço | Porta | URL |
|---------|-------|-----|
| API Gateway | 3000 | http://localhost:3000 |
| User Service | 3001 | http://localhost:3001 |
| List Service | 3002 | http://localhost:3002 |
| Item Service | 3003 | http://localhost:3003 |

## Microsserviços Implementados

### PARTE 1: User Service (porta 3001)
**Gerenciamento de usuários com autenticação JWT**

- `POST /auth/register` - Cadastro de usuário
- `POST /auth/login` - Login com email/username + senha  
- `GET /users/:id` - Buscar dados do usuário
- `PUT /users/:id` - Atualizar perfil do usuário

**Schema do Usuário:**
```json
{
  "id": "uuid",
  "email": "string",
  "username": "string", 
  "password": "string (hash)",
  "firstName": "string",
  "lastName": "string",
  "preferences": {
    "defaultStore": "string",
    "currency": "string"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### PARTE 2: Item Service (porta 3003)  
**Catálogo de itens/produtos para listas de compras**

- `GET /items` - Listar itens com filtros (categoria, nome)
- `GET /items/:id` - Buscar item específico
- `POST /items` - Criar novo item (requer autenticação)
- `PUT /items/:id` - Atualizar item
- `GET /categories` - Listar categorias disponíveis
- `GET /search?q=termo` - Buscar itens por nome

**Schema do Item:**
```json
{
  "id": "uuid",
  "name": "string",
  "category": "string",
  "brand": "string", 
  "unit": "string",
  "averagePrice": "number",
  "barcode": "string",
  "description": "string",
  "active": "boolean",
  "createdAt": "timestamp"
}
```

**Dados Iniciais:** 22 itens distribuídos nas categorias:
- Alimentos (7 itens)
- Limpeza (5 itens)  
- Higiene (4 itens)
- Bebidas (3 itens)
- Padaria (3 itens)

### PARTE 3: List Service (porta 3002)
**Gerenciamento de listas de compras**

- `POST /lists` - Criar nova lista
- `GET /lists` - Listar listas do usuário
- `GET /lists/:id` - Buscar lista específica
- `PUT /lists/:id` - Atualizar lista (nome, descrição)
- `DELETE /lists/:id` - Deletar lista
- `POST /lists/:id/items` - Adicionar item à lista
- `PUT /lists/:id/items/:itemId` - Atualizar item na lista
- `DELETE /lists/:id/items/:itemId` - Remover item da lista
- `GET /lists/:id/summary` - Resumo da lista (total estimado)

**Schema da Lista:**
```json
{
  "id": "uuid",
  "userId": "string",
  "name": "string",
  "description": "string",
  "status": "active|completed|archived",
  "items": [
    {
      "itemId": "string",
      "itemName": "string",
      "quantity": "number",
      "unit": "string",
      "estimatedPrice": "number",
      "purchased": "boolean",
      "notes": "string",
      "addedAt": "timestamp"
    }
  ],
  "summary": {
    "totalItems": "number",
    "purchasedItems": "number", 
    "estimatedTotal": "number"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### API Gateway (porta 3000)
**Ponto único de entrada com roteamento inteligente**

#### Roteamento:
- `/api/auth/*` → User Service
- `/api/users/*` → User Service  
- `/api/items/*` → Item Service
- `/api/lists/*` → List Service

#### Endpoints Agregados:
- `GET /api/dashboard` - Dashboard com estatísticas do usuário
- `GET /api/search?q=termo` - Busca global (itens)
- `GET /health` - Status de todos os serviços
- `GET /registry` - Lista de serviços registrados

## Padrões Implementados

### Database per Service com NoSQL
- **Isolamento completo**: Cada serviço possui seu próprio banco
- **JSON-based storage**: Armazenamento baseado em documentos JSON
- **Schema flexível**: Estrutura de dados adaptável
- **Busca de texto**: Capacidades de full-text search
- **Indexação automática**: Índices para performance

### Padrões Arquiteturais
- **Service Discovery**: Registry centralizado
- **API Gateway**: Ponto único de entrada
- **Circuit Breaker**: Proteção contra falhas (3 falhas = abrir circuito)
- **REST Communication**: Comunicação entre serviços
- **JWT Authentication**: Autenticação distribuída
- **Health Checks**: Monitoramento automático a cada 30 segundos

## Regras de Negócio

### Segurança
- Usuário só pode ver suas próprias listas
- Tokens JWT para autenticação entre serviços
- Senhas hash com bcrypt

### Listas de Compras  
- Ao adicionar item, buscar dados no Item Service
- Calcular automaticamente totais estimados
- Permitir marcar itens como comprados
- Atualização automática de resumos

## Qualidade do Código

### Documentação JSDoc
Todo o código JavaScript está documentado seguindo padrões JSDoc:
- **@fileoverview** - Descrição e propósito de cada arquivo
- **@class** - Documentação de classes e construtores  
- **@param** - Tipos e descrições de parâmetros
- **@returns** - Tipos e descrições de retornos
- **@async** - Identificação de métodos assíncronos
- **@private** - Métodos internos documentados

### Estrutura de Código
- **Modularização**: Cada serviço é independente
- **Separação de responsabilidades**: Camadas bem definidas
- **Error handling**: Tratamento adequado de erros
- **Logging**: Logs estruturados para debugging
- **Security**: Hash de senhas, validação de tokens JWT

## Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| Iniciar todos | `npm start` | Inicia todos os microsserviços |
| Desenvolvimento | `npm run dev` | Inicia com auto-reload |
| Instalar deps | `npm run install:all` | Instala todas as dependências |
| Demonstração | `npm run demo` | Executa cliente de demo |
| Health Check | `npm run health` | Verifica saúde dos serviços |
| Limpar | `npm run clean` | Remove node_modules |

## Funcionalidades Demonstradas

O cliente de demonstração (`client-demo.js`) exibe:

1. **✅ Health Check** - Verificação de todos os serviços
2. **✅ Registro de Usuário** - Criação de conta com validações
3. **✅ Login** - Autenticação JWT
4. **✅ Dashboard** - Estatísticas agregadas do sistema
5. **✅ Catálogo de Itens** - Busca e filtros
6. **✅ Categorias** - Listagem de categorias disponíveis
7. **✅ Criação de Listas** - Gerenciamento de listas de compras
8. **✅ Adição de Itens** - Inclusão de produtos nas listas
9. **✅ Resumos** - Cálculos automáticos de totais
10. **✅ Busca Global** - Pesquisa em múltiplos serviços
11. **✅ Circuit Breaker** - Proteção contra falhas
12. **✅ Service Discovery** - Descoberta automática de serviços

## Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **JWT** - Autenticação stateless
- **bcryptjs** - Hash de senhas
- **Axios** - Cliente HTTP
- **Helmet** - Segurança HTTP
- **Morgan** - Logging de requisições
- **CORS** - Cross-Origin Resource Sharing

### Banco de Dados
- **JSON NoSQL** - Armazenamento baseado em arquivos
- **fs-extra** - Operações de sistema de arquivos
- **UUID** - Geração de identificadores únicos

### Ferramentas de Desenvolvimento
- **Nodemon** - Auto-reload em desenvolvimento
- **Concurrently** - Execução paralela de processos
- **JSDoc** - Documentação de código

## Arquitetura e Padrões

### Arquitetura de Microsserviços
```
┌─────────────────┐    ┌─────────────────┐
│   Client Demo   │────┤   API Gateway   │
└─────────────────┘    │  (Port 3000)    │
                       └─────────┬───────┘
                                 │
            ┌────────────────────┼────────────────────┐
            │                    │                    │
            ▼                    ▼                    ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ User Service │    │ Item Service │    │ List Service │
    │ (Port 3001)  │    │ (Port 3003)  │    │ (Port 3002)  │
    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
           │                   │                   │
           ▼                   ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │ Users NoSQL  │    │ Items NoSQL  │    │ Lists NoSQL  │
    │   Database   │    │   Database   │    │   Database   │
    └──────────────┘    └──────────────┘    └──────────────┘
```

### Service Registry
```
┌─────────────────────────────────────────┐
│           Service Registry              │
│         (services-registry.json)       │
├─────────────────────────────────────────┤
│ • Service Discovery                     │
│ • Health Monitoring                     │
│ • Automatic Registration                │
│ • Circuit Breaker Integration           │
└─────────────────────────────────────────┘
```

## Conformidade com Requisitos

### ✅ Requisitos Obrigatórios Atendidos

| Requisito | Status | Implementação |
|-----------|---------|---------------|
| **Microsserviços Independentes** | ✅ | 3 serviços + API Gateway |
| **Banco NoSQL por Serviço** | ✅ | JsonDatabase para cada serviço |
| **Service Discovery** | ✅ | Registry baseado em arquivo |
| **API Gateway** | ✅ | Roteamento e agregação |
| **Circuit Breaker** | ✅ | 3 falhas = circuito aberto |
| **Health Checks** | ✅ | Monitoramento a cada 30s |
| **Autenticação JWT** | ✅ | Tokens distribuídos |
| **Hash de Senhas** | ✅ | bcrypt com salt 12 |
| **Cliente Demo** | ✅ | Demonstração completa |
| **Documentação JSDoc** | ✅ | Código autodocumentado |

### 📊 Métricas de Qualidade

- **Cobertura de Documentação**: 100% dos arquivos JS
- **Padrões de Código**: JSDoc + boas práticas
- **Segurança**: JWT + bcrypt + validações
- **Escalabilidade**: Arquitetura distribuída
- **Manutenibilidade**: Código modular e documentado
- **Testabilidade**: Cliente demo com casos de uso

---

**Data de Entrega**: 29/09/2025  
**Projeto**: TarefaRoteiro03.MD - Sistema de Lista de Compras  
**Instituição**: PUC Minas - ICEI  
**Curso**: Engenharia de Software
