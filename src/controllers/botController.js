const botpressService = require('../services/botpressService');
const whatsappService = require('../services/whatsappService');

class BotController {
  /**
   * @swagger
   * /api/v1/bot/activate:
   *   post:
   *     summary: Ativar bot para uma instância
   *     description: Ativa o bot de atendimento automatizado para uma instância específica do WhatsApp
   *     tags: [Bot Management]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - instanceId
   *             properties:
   *               instanceId:
   *                 type: string
   *                 description: ID da instância WhatsApp
   *                 example: "instance-001"
   *               config:
   *                 type: object
   *                 description: Configurações específicas do bot
   *                 properties:
   *                   welcomeMessage:
   *                     type: string
   *                     description: Mensagem de boas-vindas personalizada
   *                     example: "Olá! Bem-vindo ao nosso atendimento automatizado."
   *                   businessHours:
   *                     type: object
   *                     properties:
   *                       enabled:
   *                         type: boolean
   *                         example: true
   *                       start:
   *                         type: string
   *                         example: "08:00"
   *                       end:
   *                         type: string
   *                         example: "18:00"
   *                   autoResponse:
   *                     type: boolean
   *                     description: Ativar respostas automáticas
   *                     example: true
   *     responses:
   *       200:
   *         description: Bot ativado com sucesso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: "Bot ativado com sucesso"
   *                 data:
   *                   type: object
   *                   properties:
   *                     instanceId:
   *                       type: string
   *                       example: "instance-001"
   *                     isActive:
   *                       type: boolean
   *                       example: true
   *                     activatedAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         description: Dados inválidos
   *       404:
   *         description: Instância não encontrada
   *       500:
   *         description: Erro interno do servidor
   */
  async activateBot(req, res) {
    try {
      const { instanceId, config = {} } = req.body;

      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: 'ID da instância é obrigatório'
        });
      }

      // Verificar se a instância existe
      const instance = whatsappService.getInstance(instanceId);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instância não encontrada'
        });
      }

      // Verificar se a instância está conectada
      if (instance.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Instância deve estar conectada para ativar o bot'
        });
      }

      const result = await botpressService.activateBot(instanceId, config);

      res.json({
        success: true,
        message: result.message,
        data: result.config
      });
    } catch (error) {
      console.error('Erro ao ativar bot:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/bot/deactivate:
   *   post:
   *     summary: Desativar bot para uma instância
   *     description: Desativa o bot de atendimento automatizado para uma instância específica
   *     tags: [Bot Management]
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - instanceId
   *             properties:
   *               instanceId:
   *                 type: string
   *                 description: ID da instância WhatsApp
   *                 example: "instance-001"
   *     responses:
   *       200:
   *         description: Bot desativado com sucesso
   *       400:
   *         description: Dados inválidos
   *       404:
   *         description: Bot não está ativo para esta instância
   *       500:
   *         description: Erro interno do servidor
   */
  async deactivateBot(req, res) {
    try {
      const { instanceId } = req.body;

      if (!instanceId) {
        return res.status(400).json({
          success: false,
          error: 'ID da instância é obrigatório'
        });
      }

      const result = await botpressService.deactivateBot(instanceId);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Erro ao desativar bot:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/bot/status/{instanceId}:
   *   get:
   *     summary: Verificar status do bot
   *     description: Verifica se o bot está ativo para uma instância e retorna informações de status
   *     tags: [Bot Management]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: instanceId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da instância WhatsApp
   *         example: "instance-001"
   *     responses:
   *       200:
   *         description: Status do bot
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     instanceId:
   *                       type: string
   *                       example: "instance-001"
   *                     isActive:
   *                       type: boolean
   *                       example: true
   *                     activatedAt:
   *                       type: string
   *                       format: date-time
   *                     uptime:
   *                       type: number
   *                       description: Tempo ativo em milissegundos
   *                       example: 3600000
   *       404:
   *         description: Bot não está ativo para esta instância
   *       500:
   *         description: Erro interno do servidor
   */
  async getBotStatus(req, res) {
    try {
      const { instanceId } = req.params;

      const stats = botpressService.getBotStats(instanceId);
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          error: 'Bot não está ativo para esta instância'
        });
      }

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao obter status do bot:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/bot/list:
   *   get:
   *     summary: Listar bots ativos
   *     description: Lista todas as instâncias que têm bot ativo
   *     tags: [Bot Management]
   *     security:
   *       - ApiKeyAuth: []
   *     responses:
   *       200:
   *         description: Lista de bots ativos
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       instanceId:
   *                         type: string
   *                         example: "instance-001"
   *                       isActive:
   *                         type: boolean
   *                         example: true
   *                       activatedAt:
   *                         type: string
   *                         format: date-time
   *       500:
   *         description: Erro interno do servidor
   */
  async listActiveBots(req, res) {
    try {
      const activeBots = botpressService.getActiveBots();

      res.json({
        success: true,
        data: activeBots,
        count: activeBots.length
      });
    } catch (error) {
      console.error('Erro ao listar bots ativos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/bot/config/{instanceId}:
   *   put:
   *     summary: Atualizar configuração do bot
   *     description: Atualiza as configurações do bot para uma instância específica
   *     tags: [Bot Management]
   *     security:
   *       - ApiKeyAuth: []
   *     parameters:
   *       - in: path
   *         name: instanceId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da instância WhatsApp
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               welcomeMessage:
   *                 type: string
   *                 example: "Nova mensagem de boas-vindas"
   *               businessHours:
   *                 type: object
   *                 properties:
   *                   enabled:
   *                     type: boolean
   *                   start:
   *                     type: string
   *                   end:
   *                     type: string
   *               autoResponse:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Configuração atualizada com sucesso
   *       400:
   *         description: Dados inválidos
   *       404:
   *         description: Bot não está ativo para esta instância
   *       500:
   *         description: Erro interno do servidor
   */
  async updateBotConfig(req, res) {
    try {
      const { instanceId } = req.params;
      const newConfig = req.body;

      const result = await botpressService.updateBotConfig(instanceId, newConfig);

      res.json({
        success: true,
        message: 'Configuração atualizada com sucesso',
        data: result.config
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração do bot:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * @swagger
   * /api/v1/bot/webhook/{instanceId}:
   *   post:
   *     summary: Webhook para receber respostas do Botpress
   *     description: Endpoint para o Botpress enviar respostas que devem ser enviadas via WhatsApp
   *     tags: [Bot Management]
   *     parameters:
   *       - in: path
   *         name: instanceId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID da instância WhatsApp
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               to:
   *                 type: string
   *                 description: Número do destinatário
   *                 example: "5511999999999"
   *               message:
   *                 type: string
   *                 description: Mensagem a ser enviada
   *                 example: "Olá! Como posso ajudá-lo?"
   *               messageType:
   *                 type: string
   *                 description: Tipo da mensagem
   *                 example: "text"
   *     responses:
   *       200:
   *         description: Mensagem processada e enviada
   *       400:
   *         description: Dados inválidos
   *       404:
   *         description: Instância não encontrada
   *       500:
   *         description: Erro interno do servidor
   */
  async handleBotpressWebhook(req, res) {
    try {
      const { instanceId } = req.params;
      const responseData = req.body;

      // Verificar se a instância existe e está conectada
      const instance = whatsappService.getInstance(instanceId);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instância não encontrada'
        });
      }

      if (instance.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Instância não está conectada'
        });
      }

      // Processar resposta do Botpress
      const result = await botpressService.processBotpressResponse(instanceId, responseData);

      // Enviar mensagem via WhatsApp
      const sendResult = await whatsappService.sendTextMessage(
        instanceId,
        responseData.to,
        responseData.message
      );

      res.json({
        success: true,
        message: 'Resposta do bot processada e enviada',
        data: {
          botpressResult: result,
          whatsappResult: sendResult
        }
      });
    } catch (error) {
      console.error('Erro ao processar webhook do Botpress:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new BotController();
