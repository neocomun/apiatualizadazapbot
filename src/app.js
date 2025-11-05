const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Zapbot',
      version: '1.0.0',
      description: 'API para gerenciamento de instâncias do Whatsapp da Zapbot',
      contact: {
        name: 'API Support',
        email: 'sac@zapatendimento.com.br'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desenvolvimento'
      },
      {
        url: `https://apizapbot.com.br:${PORT}`,
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Rota para servir o arquivo de especificação OpenAPI
app.get('/api-docs/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Middleware para remover headers que forçam HTTPS
app.use((req, res, next) => {
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Origin-Agent-Cluster');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Helmet com CSP ajustado para Swagger
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// Middleware CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Muitas requisições deste IP, tente novamente em alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Middlewares básicos
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));

// Documentação Swagger com URLs absolutas
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'WhatsApp API Documentation',
  swaggerOptions: {
    urls: [{ url: '/api-docs/openapi.json', name: 'WhatsApp API' }]
  }
}));

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota principal
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp API está funcionando!',
    documentation: '/api-docs',
    health: '/health',
    version: '1.0.0'
  });
});

// Importar e usar rotas
const instanceRoutes = require('./routes/instances');
const messageRoutes = require('./routes/messages');
const webhookRoutes = require('./routes/webhooks');
const botRoutes = require('./routes/bot');

app.use('/api/v1/instances', instanceRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/bot', botRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON inválido',
      message: 'Verifique a sintaxe do JSON enviado'
    });
  }
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.method} ${req.originalUrl} não existe`,
    documentation: '/api-docs'
  });
});

const WhatsAppService = require('./services/whatsappService');

// Iniciar servidor (com fallback para HTTP se HTTPS falhar)
let server;
try {
  const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/apizapbot.com.br/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/apizapbot.com.br/fullchain.pem')
  };
  server = https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor HTTPS rodando na porta ${PORT}`);
    console.log(`📚 Documentação disponível em: https://apizapbot.com.br:${PORT}/api-docs`);
    console.log(`🏥 Health check em: https://apizapbot.com.br:${PORT}/health`);
    await WhatsAppService.loadExistingInstances(); // Carrega instâncias existentes
  });
} catch (err) {
  console.error('Erro ao iniciar HTTPS, usando HTTP como fallback:', err.message);
  server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
    console.log(`📚 Documentação disponível em: http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health check em: http://localhost:${PORT}/health`);
    await WhatsAppService.loadExistingInstances(); // Carrega instâncias existentes
  });
}

module.exports = app;