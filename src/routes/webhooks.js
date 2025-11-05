const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

/**
 * @swagger
 * components:
 *   schemas:
 *     WebhookConfig:
 *       type: object
 *       properties:
 *         instanceId:
 *           type: string
 *           description: ID da instância
 *         url:
 *           type: string
 *           description: URL do webhook
 *         events:
 *           type: array
 *           items:
 *             type: string
 *           description: Eventos para enviar ao webhook
 *         secret:
 *           type: string
 *           description: Chave secreta para validação
 *     
 *     WebhookEvent:
 *       type: object
 *       properties:
 *         event:
 *           type: string
 *           description: Tipo do evento
 *         instanceId:
 *           type: string
 *           description: ID da instância
 *         data:
 *           type: object
 *           description: Dados do evento
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/webhooks:
 *   post:
 *     summary: Configurar webhook para uma instância
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instanceId
 *               - url
 *             properties:
 *               instanceId:
 *                 type: string
 *                 description: ID da instância
 *               url:
 *                 type: string
 *                 description: URL do webhook
 *                 example: "https://meusite.com/webhook"
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Eventos para enviar
 *                 example: ["message", "connection", "qr"]
 *               secret:
 *                 type: string
 *                 description: Chave secreta para validação
 *     responses:
 *       200:
 *         description: Webhook configurado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookConfig'
 *       400:
 *         description: Dados inválidos
 */
router.post('/', webhookController.configureWebhook);

/**
 * @swagger
 * /api/v1/webhooks/{instanceId}:
 *   get:
 *     summary: Obter configuração do webhook
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Configuração do webhook
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookConfig'
 *       404:
 *         description: Webhook não encontrado
 */
router.get('/:instanceId', webhookController.getWebhookConfig);

/**
 * @swagger
 * /api/v1/webhooks/{instanceId}:
 *   delete:
 *     summary: Remover webhook de uma instância
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Webhook removido com sucesso
 *       404:
 *         description: Webhook não encontrado
 */
router.delete('/:instanceId', webhookController.removeWebhook);

/**
 * @swagger
 * /api/v1/webhooks/test:
 *   post:
 *     summary: Testar webhook
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL do webhook para testar
 *               data:
 *                 type: object
 *                 description: Dados de teste para enviar
 *     responses:
 *       200:
 *         description: Teste realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 response:
 *                   type: object
 *                 responseTime:
 *                   type: number
 */
router.post('/test', webhookController.testWebhook);

module.exports = router;

