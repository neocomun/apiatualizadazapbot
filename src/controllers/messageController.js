const whatsappService = require('../services/whatsappService');
const path = require('path');

class MessageController {
  async sendTextMessage(req, res) {
    try {
      const { instanceId, to, message } = req.body;

      if (!instanceId || !to || !message) {
        return res.status(400).json({
          success: false,
          error: 'instanceId, to e message são obrigatórios'
        });
      }

      const result = await whatsappService.sendTextMessage(instanceId, to, message);

      res.json({
        success: true,
        messageId: result.messageId,
        timestamp: result.timestamp,
        to: to,
        message: message
      });
    } catch (error) {
      if (error.message.includes('não encontrada') || error.message.includes('não conectada')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendMediaMessage(req, res) {
    try {
      const { instanceId, to, caption } = req.body;
      const file = req.file;

      if (!instanceId || !to || !file) {
        return res.status(400).json({
          success: false,
          error: 'instanceId, to e file são obrigatórios'
        });
      }

      const mediaPath = path.resolve(file.path);
      const result = await whatsappService.sendMediaMessage(instanceId, to, mediaPath, caption || '');

      res.json({
        success: true,
        messageId: result.messageId,
        timestamp: result.timestamp,
        to: to,
        mediaType: file.mimetype,
        fileName: file.originalname,
        caption: caption || ''
      });
    } catch (error) {
      if (error.message.includes('não encontrada') || error.message.includes('não conectada')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendLocation(req, res) {
    try {
      const { instanceId, to, latitude, longitude, name, address } = req.body;

      if (!instanceId || !to || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          error: 'instanceId, to, latitude e longitude são obrigatórios'
        });
      }

      const result = await whatsappService.sendLocation(
        instanceId, 
        to, 
        parseFloat(latitude), 
        parseFloat(longitude), 
        name || '', 
        address || ''
      );

      res.json({
        success: true,
        messageId: result.messageId,
        timestamp: result.timestamp,
        to: to,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          name: name || '',
          address: address || ''
        }
      });
    } catch (error) {
      if (error.message.includes('não encontrada') || error.message.includes('não conectada')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async sendContact(req, res) {
    try {
      const { instanceId, to, contact } = req.body;

      if (!instanceId || !to || !contact || !contact.name || !contact.phone) {
        return res.status(400).json({
          success: false,
          error: 'instanceId, to e contact (com name e phone) são obrigatórios'
        });
      }

      const result = await whatsappService.sendContact(instanceId, to, contact);

      res.json({
        success: true,
        messageId: result.messageId,
        timestamp: result.timestamp,
        to: to,
        contact: contact
      });
    } catch (error) {
      if (error.message.includes('não encontrada') || error.message.includes('não conectada')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getMessageHistory(req, res) {
    try {
      const { instanceId } = req.params;
      const { chatId, limit = 50 } = req.query;

      const instance = whatsappService.getInstance(instanceId);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instância não encontrada'
        });
      }

      if (!instance.socket || instance.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: 'Instância não está conectada'
        });
      }

      try {
        let messages = [];
        
        if (chatId) {
          // Buscar mensagens de um chat específico
          const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
          const chatMessages = await instance.socket.fetchMessagesFromWA(jid, parseInt(limit));
          messages = chatMessages;
        } else {
          // Buscar chats recentes
          const chats = await instance.socket.getOrderedChats();
          messages = chats.slice(0, parseInt(limit));
        }

        res.json({
          success: true,
          messages: messages,
          total: messages.length,
          instanceId: instanceId,
          chatId: chatId || null
        });
      } catch (fetchError) {
        // Se não conseguir buscar mensagens, retornar array vazio
        res.json({
          success: true,
          messages: [],
          total: 0,
          instanceId: instanceId,
          chatId: chatId || null,
          note: 'Não foi possível buscar o histórico de mensagens'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new MessageController();

