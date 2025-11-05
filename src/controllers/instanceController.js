const whatsappService = require('../services/whatsappService');
const { v4: uuidv4 } = require('uuid');

class InstanceController {
  async listInstances(req, res) {
    try {
      const instances = whatsappService.getAllInstances();
      
      const instancesData = instances.map(instance => ({
        id: instance.id,
        name: instance.name,
        status: instance.status,
        phone: instance.phone,
        createdAt: instance.createdAt,
        lastSeen: instance.lastSeen
      }));

      res.json({
        success: true,
        instances: instancesData,
        total: instancesData.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createInstance(req, res) {
    try {
      const { name, webhook } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Nome da instância é obrigatório'
        });
      }

      const instanceId = uuidv4();
      const instance = await whatsappService.createInstance(instanceId, name, webhook);

      res.status(201).json({
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status,
          phone: instance.phone,
          createdAt: instance.createdAt,
          webhook: instance.webhook
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getInstance(req, res) {
    try {
      const { instanceId } = req.params;
      const instance = whatsappService.getInstance(instanceId);

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instância não encontrada'
        });
      }

      res.json({
        success: true,
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status,
          phone: instance.phone,
          createdAt: instance.createdAt,
          lastSeen: instance.lastSeen,
          webhook: instance.webhook
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteInstance(req, res) {
    try {
      const { instanceId } = req.params;
      
      await whatsappService.deleteInstance(instanceId);

      res.json({
        success: true,
        message: 'Instância deletada com sucesso'
      });
    } catch (error) {
      if (error.message === 'Instância não encontrada') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async connectInstance(req, res) {
    try {
      const { instanceId } = req.params;
      
      const instance = await whatsappService.connectInstance(instanceId);

      res.json({
        success: true,
        message: 'Conexão iniciada',
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status
        }
      });
    } catch (error) {
      if (error.message === 'Instância não encontrada') {
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

  async disconnectInstance(req, res) {
    try {
      const { instanceId } = req.params;
      
      const instance = await whatsappService.disconnectInstance(instanceId);

      res.json({
        success: true,
        message: 'Instância desconectada',
        instance: {
          id: instance.id,
          name: instance.name,
          status: instance.status
        }
      });
    } catch (error) {
      if (error.message === 'Instância não encontrada') {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getQRCode(req, res) {
    try {
      const { instanceId } = req.params;
      
      const instance = whatsappService.getInstance(instanceId);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instância não encontrada'
        });
      }

      const qrCode = whatsappService.getQRCode(instanceId);
      if (!qrCode) {
        return res.status(400).json({
          success: false,
          error: 'QR Code não disponível. Conecte a instância primeiro.'
        });
      }

      res.json({
        success: true,
        qrCode: qrCode,
        qrCodeUrl: qrCode // Base64 data URL
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async generatePairingCode(req, res) {
    try {
      const { instanceId } = req.params;
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: 'Número do telefone é obrigatório'
        });
      }

      // Limpar o número (remover caracteres especiais)
      const cleanPhone = phone.replace(/\D/g, '');

      const pairingCode = await whatsappService.generatePairingCode(instanceId, cleanPhone);

      res.json({
        success: true,
        pairingCode: pairingCode,
        phone: cleanPhone
      });
    } catch (error) {
      if (error.message === 'Instância não encontrada ou não conectada') {
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

  async getStatus(req, res) {
    try {
      const { instanceId } = req.params;
      
      const instance = whatsappService.getInstance(instanceId);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instância não encontrada'
        });
      }

      res.json({
        success: true,
        status: instance.status,
        phone: instance.phone,
        lastSeen: instance.lastSeen,
        hasQRCode: !!whatsappService.getQRCode(instanceId),
        hasPairingCode: !!whatsappService.getPairingCode(instanceId)
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  async getQRCodeImage(req, res) {
    try {
      const { instanceId } = req.params;
      const qrCodeDataURL = whatsappService.getQRCode(instanceId);

      if (!qrCodeDataURL) {
        return res.status(400).json({
          success: false,
          error: 'QR Code não disponível. Conecte a instância primeiro.'
        });
      }

      // Extrair o tipo de imagem e os dados base64
      const matches = qrCodeDataURL.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(500).json({
          success: false,
          error: 'Formato de QR Code inválido.'
        });
      }

      const imageType = matches[1];
      const base64Data = matches[2];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      res.writeHead(200, {
        'Content-Type': imageType,
        'Content-Length': imageBuffer.length
      });
      res.end(imageBuffer);

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new InstanceController();
