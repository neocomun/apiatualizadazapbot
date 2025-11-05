const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Ativar bot para uma instância
router.post('/activate', botController.activateBot);

// Desativar bot para uma instância
router.post('/deactivate', botController.deactivateBot);

// Verificar status do bot
router.get('/status/:instanceId', botController.getBotStatus);

// Listar bots ativos
router.get('/list', botController.listActiveBots);

// Atualizar configuração do bot
router.put('/config/:instanceId', botController.updateBotConfig);

// Webhook para receber respostas do Botpress
router.post('/webhook/:instanceId', botController.handleBotpressWebhook);

module.exports = router;
