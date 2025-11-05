const whatsappService = require('../services/whatsappService');

class WebhookController {
  async configureWebhook(req, res) {
    try {
      const { instanceId, url, events, secret } = req.body;

      if (!instanceId || !url) {
        return res.status(400).json({
          success: false,
          error: 'instanceId e url são obrigatórios'
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

      // Validar URL
      try {
        new URL(url);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'URL inválida'
        });
      }

      const validEvents = ['message', 'connection', 'qr', 'pairing_code', 'disconnected', 'connected', 'message_update', 'presence'];
      const webhookEvents = events || ['message', 'connection', 'qr'];
      
      // Validar eventos
      for (const event of webhookEvents) {
        if (!validEvents.includes(event)) {
          return res.status(400).json({
            success: false,
            error: `Evento inválido: ${event}. Eventos válidos: ${validEvents.join(', ')}`
          });
        }
      }

      whatsappService.configureWebhook(instanceId, url, webhookEvents, secret);

      res.json({
        success: true,
        webhook: {
          instanceId,
          url,
          events: webhookEvents,
          secret: secret ? '***' : null,
          configuredAt: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getWebhookConfig(req, res) {
    try {
      const { instanceId } = req.params;

      const webhook = whatsappService.getWebhookConfig(instanceId);
      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Webhook não encontrado para esta instância'
        });
      }

      res.json({
        success: true,
        webhook: {
          instanceId,
          url: webhook.url,
          events: webhook.events,
          secret: webhook.secret ? '***' : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async removeWebhook(req, res) {
    try {
      const { instanceId } = req.params;

      const removed = whatsappService.removeWebhook(instanceId);
      if (!removed) {
        return res.status(404).json({
          success: false,
          error: 'Webhook não encontrado para esta instância'
        });
      }

      res.json({
        success: true,
        message: 'Webhook removido com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async testWebhook(req, res) {
    try {
      const { url, data } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL é obrigatória'
        });
      }

      // Validar URL
      try {
        new URL(url);
      } catch (urlError) {
        return res.status(400).json({
          success: false,
          error: 'URL inválida'
        });
      }

      const testData = data || {
        message: 'Este é um teste do webhook',
        timestamp: new Date().toISOString()
      };

      const result = await whatsappService.testWebhook(url, testData);

      res.json({
        success: result.success,
        test: {
          url,
          responseTime: result.responseTime,
          status: result.status,
          response: result.response,
          error: result.error,
          testedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new WebhookController();

