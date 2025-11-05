const express = require('express');
const router = express.Router();
const instanceController = require('../controllers/instanceController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Instance:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID único da instância
 *         name:
 *           type: string
 *           description: Nome da instância
 *         status:
 *           type: string
 *           enum: [disconnected, connecting, connected, qr_code]
 *           description: Status da conexão
 *         phone:
 *           type: string
 *           description: Número do telefone conectado
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Data de criação da instância
 *     
 *     CreateInstanceRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Nome da instância
 *           example: "Minha Instância"
 *         webhook:
 *           type: string
 *           description: URL do webhook para receber eventos
 *           example: "https://meusite.com/webhook"
 *     
 *     QRCodeResponse:
 *       type: object
 *       properties:
 *         qrCode:
 *           type: string
 *           description: QR Code em base64
 *         qrCodeUrl:
 *           type: string
 *           description: URL da imagem do QR Code
 *     
 *     PairingCodeRequest:
 *       type: object
 *       required:
 *         - phone
 *       properties:
 *         phone:
 *           type: string
 *           description: Número do telefone (formato internacional)
 *           example: "5511999999999"
 */

/**
 * @swagger
 * /api/v1/instances:
 *   get:
 *     summary: Listar todas as instâncias
 *     tags: [Instâncias]
 *     responses:
 *       200:
 *         description: Lista de instâncias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 instances:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Instance'
 */
router.get('/', instanceController.listInstances);

/**
 * @swagger
 * /api/v1/instances:
 *   post:
 *     summary: Criar nova instância
 *     tags: [Instâncias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInstanceRequest'
 *     responses:
 *       201:
 *         description: Instância criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Instance'
 *       400:
 *         description: Dados inválidos
 */
router.post('/', instanceController.createInstance);

/**
 * @swagger
 * /api/v1/instances/{instanceId}:
 *   get:
 *     summary: Obter informações de uma instância
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Informações da instância
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Instance'
 *       404:
 *         description: Instância não encontrada
 */
router.get('/:instanceId', instanceController.getInstance);

/**
 * @swagger
 * /api/v1/instances/{instanceId}:
 *   delete:
 *     summary: Deletar uma instância
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Instância deletada com sucesso
 *       404:
 *         description: Instância não encontrada
 */
router.delete('/:instanceId', instanceController.deleteInstance);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/connect:
 *   post:
 *     summary: Conectar instância
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Conexão iniciada
 *       404:
 *         description: Instância não encontrada
 */
router.post('/:instanceId/connect', instanceController.connectInstance);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/disconnect:
 *   post:
 *     summary: Desconectar instância
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Instância desconectada
 *       404:
 *         description: Instância não encontrada
 */
router.post('/:instanceId/disconnect', instanceController.disconnectInstance);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/qrcode:
 *   get:
 *     summary: Obter QR Code para autenticação
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: QR Code gerado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QRCodeResponse'
 *       404:
 *         description: Instância não encontrada
 *       400:
 *         description: QR Code não disponível
 */
router.get('/:instanceId/qrcode', instanceController.getQRCode);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/pairing-code:
 *   post:
 *     summary: Gerar código de pareamento
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PairingCodeRequest'
 *     responses:
 *       200:
 *         description: Código de pareamento gerado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pairingCode:
 *                   type: string
 *                   description: Código de pareamento
 *       404:
 *         description: Instância não encontrada
 */
router.post('/:instanceId/pairing-code', instanceController.generatePairingCode);

/**
 * @swagger
 * /api/v1/instances/{instanceId}/status:
 *   get:
 *     summary: Verificar status da conexão
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Status da conexão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [disconnected, connecting, connected, qr_code]
 *                 phone:
 *                   type: string
 *                 lastSeen:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Instância não encontrada
 */
router.get('/:instanceId/status', instanceController.getStatus);

module.exports = router;



/**
 * @swagger
 * /api/v1/instances/{instanceId}/qrcode/image:
 *   get:
 *     summary: Obter imagem do QR Code para autenticação
 *     tags: [Instâncias]
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da instância
 *     responses:
 *       200:
 *         description: Imagem do QR Code
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Instância não encontrada
 *       400:
 *         description: QR Code não disponível
 */
router.get("/:instanceId/qrcode/image", instanceController.getQRCodeImage);


