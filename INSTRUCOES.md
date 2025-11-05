# Instruções para Correção da API WhatsApp

Este documento descreve os passos para corrigir e executar a aplicação `whatsapp-api` corretamente.

## 1. Ajuste na Estrutura de Arquivos

O problema principal é que o PM2 está configurado para executar um arquivo `app.js` na raiz do projeto, mas o arquivo principal da aplicação está em `src/app.js`.

Para resolver isso, crie um arquivo `app.js` na raiz do projeto com o seguinte conteúdo:

```javascript
// Arquivo de redirecionamento para manter compatibilidade com PM2
// O arquivo principal está em src/app.js

module.exports = require('./src/app.js');
```

## 2. Configuração do PM2

Para garantir que o PM2 execute a aplicação corretamente, crie um arquivo `ecosystem.config.js` na raiz do projeto com a seguinte configuração:

```javascript
module.exports = {
  apps: [{
    name: 'whatsapp-api',
    script: './src/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 3. Criação de Diretórios

Crie os diretórios necessários para logs, uploads e sessões:

```bash
mkdir -p logs uploads sessions
```

## 4. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```dotenv
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações da API
API_PREFIX=/api/v1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Diretórios
SESSIONS_DIR=./sessions
UPLOADS_DIR=./uploads

# Webhook (opcional)
WEBHOOK_URL=
WEBHOOK_SECRET=

# Log
LOG_LEVEL=info
```

## 5. Instalação e Execução

Após realizar as correções, instale as dependências e inicie a aplicação com o PM2:

```bash
npm install
pm2 start ecosystem.config.js
```

## Resumo das Correções

- **`app.js` na raiz:** Redireciona para `src/app.js`.
- **`ecosystem.config.js`:** Configuração correta para o PM2.
- **Criação de diretórios:** `logs`, `uploads`, `sessions`.
- **`.env`:** Arquivo de variáveis de ambiente.

Com essas correções, a aplicação deve iniciar corretamente e o Swagger UI estará acessível em `http://seu-ip:3000/api-docs`.

