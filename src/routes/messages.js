const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const multer = require('multer');
const path = require('path');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Aceitar todos os tipos de arquivo
    cb(null, true);
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     SendTextMessageRequest:
 *       type: object
 *       required:
 *         - instanceId
 *         - to
 *         - message
 *       properties:
 *         instanceId:
 *           type: string
 *           description: ID da instância
 *         to:
 *           type: string
 *           description: Número do destinatário (formato internacional)
 *           example: "5511999999999"
 *         message:
 *           type: string
 *           description: Texto da mensagem
 *           example: "Olá! Como você está?"
 *     
 *     SendMediaMessageRequest:
 *       type: object
 *       required:
 *         - instanceId
 *         - to
 *       properties:
 *         instanceId:
 *           type: string
 *           description: ID da instância
 *         to:
 *           type: string
 *           description: Número do destinatário (formato internacional)
 *           example: "5511999999999"
 *         caption:
 *           type: string
 *           description: Legenda da mídia
 *           example: "Confira esta imagem!"
 *         file:
 *           type: string
 *           format: binary
 *           description: Arquivo de mídia
 *     
 *     MessageResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         messageId:
 *           type: string
 *           description: ID da mensagem enviada
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/messages/text:
 *   post:
 *     summary: Enviar mensagem de texto
 *     tags: [Mensagens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendTextMessageRequest'
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Instância não encontrada
 */
router.post('/text', messageController.sendTextMessage);

/**
 * @swagger
 * /api/v1/messages/media:
 *   post:
 *     summary: Enviar mensagem com mídia
 *     tags: [Mensagens]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - instanceId
 *               - to
 *               - file
 *             properties:
 *               instanceId:
 *                 type: string
 *                 description: ID da instância
 *               to:
 *                 type: string
 *                 description: Número do destinatário
 *               caption:
 *                 type: string
 *                 description: Legenda da mídia
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de mídia
 *     responses:
 *       200:
 *         description: Mídia enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Dados inválidos
 *       404:
 *         description: Instância não encontrada
 */
router.post('/media', upload.single('file'), messageController.sendMediaMessage);

/**
 * @swagger
 * /api/v1/messages/location:
 *   post:
 *     summary: Enviar localização
 *     tags: [Mensagens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instanceId
 *               - to
 *               - latitude
 *               - longitude
 *             properties:
 *               instanceId:
 *                 type: string
 *                 description: ID da instância
 *               to:
 *                 type: string
 *                 description: Número do destinatário
 *               latitude:
 *                 type: number
 *                 description: Latitude
 *                 example: -23.5505
 *               longitude:
 *                 type: number
 *                 description: Longitude
 *                 example: -46.6333
 *               name:
 *                 type: string
 *                 description: Nome do local
 *                 example: "São Paulo, SP"
 *               address:
 *                 type: string
 *                 description: Endereço do local
 *                 example: "São Paulo, SP, Brasil"
 *     responses:
 *       200:
 *         description: Localização enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
router.post('/location', messageController.sendLocation);

/**
 * @swagger
 * /api/v1/messages/contact:
 *   post:
 *     summary: Enviar contato
 *     tags: [Mensagens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instanceId
 *               - to
 *               - contact
 *             properties:
 *               instanceId:
 *                 type: string
 *                 description: ID da instância
 *               to:
 *                 type: string
 *                 description: Número do destinatário
 *               contact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Nome do contato
 *                   phone:
 *                     type: string
 *                     description: Telefone do contato
 *                   email:
 *                     type: string
 *                     description: Email do contato
 *     responses:
 *       200:
 *         description: Contato enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
router.post('/contact', messageController.sendContact);

/**
 * @swagger
 * /api/v1/messages/{instanceId}/history:
 *   get:
 *     summary: Obter histórico de mensagens
 *     tags: [Mensagens]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *       - in: query
 *         name: chatId
 *         schema:
 *           type: string
 *         description: ID do chat
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limite de mensagens
 *     responses:
 *       200:
 *         description: Histórico de mensagens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/:instanceId/history', messageController.getMessageHistory);

module.exports = router;

