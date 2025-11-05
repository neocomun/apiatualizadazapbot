const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require("uuid");
const { Buffer } = require("buffer");

class WhatsAppService {
  constructor() {
    this.instances = new Map();
    this.qrCodes = new Map();
    this.pairingCodes = new Map();
    this.webhooks = new Map();
    this.sessionsDir = process.env.SESSIONS_DIR || './sessions';
    this.metadataFile = path.join(this.sessionsDir, 'instances.json');

    // Criar diretório de sessões se não existir
    this.ensureSessionsDir();
  }

  async ensureSessionsDir() {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
      console.log(`Diretório de sessões criado/verificado: ${this.sessionsDir}`);
    } catch (error) {
      console.error(`Erro ao criar diretório de sessões ${this.sessionsDir}:`, error);
    }
  }

  async saveInstanceMetadata(instanceId, name = 'Unnamed Instance', webhook = null) {
    try {
      const metadata = await this.loadInstanceMetadata();
      const existing = metadata.find(m => m.instanceId === instanceId);
      if (!existing) {
        metadata.push({ instanceId, name, webhook, createdAt: new Date().toISOString() });
        await fs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2));
        console.log(`Metadados da instância ${instanceId} salvos em ${this.metadataFile}`);
      }
    } catch (error) {
      console.error(`Erro ao salvar metadados da instância ${instanceId}:`, error);
    }
  }

  async loadInstanceMetadata() {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf8').catch(() => '[]');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Erro ao carregar metadados de ${this.metadataFile}:`, error);
      return [];
    }
  }

  async loadExistingInstances() {
    try {
      const metadata = await this.loadInstanceMetadata();
      console.log(`Carregando instâncias existentes. Metadados encontrados: ${metadata.length}`);
      
      // Scan sessions directory for existing session folders
      const sessionDirs = await fs.readdir(this.sessionsDir).catch(() => []);
      const sessionIds = sessionDirs.filter(async dir => {
        const stat = await fs.stat(path.join(this.sessionsDir, dir)).catch(() => null);
        return stat && stat.isDirectory();
      });

      // Add missing sessions to metadata
      for (const instanceId of sessionIds) {
        if (!metadata.find(m => m.instanceId === instanceId)) {
          console.log(`Instância ${instanceId} encontrada no diretório, mas não nos metadados. Adicionando...`);
          await this.saveInstanceMetadata(instanceId);
        }
      }

      // Reload metadata after adding missing sessions
      const updatedMetadata = await this.loadInstanceMetadata();
      
      for (const { instanceId, name, webhook } of updatedMetadata) {
        const sessionDir = path.join(this.sessionsDir, instanceId);
        if (await fs.stat(sessionDir).catch(() => null)) {
          console.log(`Carregando instância ${instanceId} do diretório ${sessionDir}`);
          await this.createInstance(instanceId, name, webhook);
          await this.connectInstance(instanceId);
        } else {
          console.warn(`Pasta da sessão ${sessionDir} não encontrada, ignorando instância ${instanceId}`);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias existentes:', error);
    }
  }

  async createInstance(instanceId, name, webhook = null) {
    if (this.instances.has(instanceId)) {
      throw new Error('Instância já existe');
    }

    const sessionDir = path.join(this.sessionsDir, instanceId);
    
    // Criar diretório da sessão
    await fs.mkdir(sessionDir, { recursive: true });
    console.log(`Diretório da sessão criado: ${sessionDir}`);

    const instance = {
      id: instanceId,
      name: name || 'Unnamed Instance',
      status: 'disconnected',
      phone: null,
      socket: null,
      qrCode: null,
      pairingCode: null,
      createdAt: new Date(),
      lastSeen: null,
      webhook: webhook
    };

    this.instances.set(instanceId, instance);
    
    if (webhook) {
      this.webhooks.set(instanceId, {
        url: webhook,
        events: ['message', 'connection', 'qr'],
        secret: null
      });
    }

    // Salvar metadados
    await this.saveInstanceMetadata(instanceId, name, webhook);

    return instance;
  }

  async connectInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instância não encontrada');
    }

    if (instance.socket) {
      throw new Error('Instância já está conectada');
    }

    try {
      const sessionDir = path.join(this.sessionsDir, instanceId);
      console.log(`[${instanceId}] Tentando conectar. Diretório de sessão: ${sessionDir}`);

      // Garante que o diretório de sessão exista
      await fs.mkdir(sessionDir, { recursive: true });

      console.log(`[${instanceId}] Carregando estado de autenticação...`);
      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      console.log(`[${instanceId}] Estado de autenticação carregado. Credenciais salvas: ${Object.keys(state.creds).length > 0}`);

      const { version } = await fetchLatestBaileysVersion();

      const socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, console)
        },
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async (key) => {
          return { conversation: 'Mensagem não encontrada' };
        }
      });

      instance.socket = socket;
      instance.status = 'connecting';

      // Event handlers
      socket.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(instanceId, update);
      });

      socket.ev.on("creds.update", async () => {
        console.log(`[${instanceId}] creds.update event disparado. Tentando salvar credenciais...`);
        try {
          await saveCreds();
          console.log(`[${instanceId}] Credenciais salvas com sucesso.`);
        } catch (error) {
          console.error(`[${instanceId}] Erro ao salvar credenciais:`, error);
        }
      });

      socket.ev.on('messages.upsert', async (m) => {
        await this.handleMessages(instanceId, m);
      });

      socket.ev.on('messages.update', async (messageUpdate) => {
        await this.handleMessageUpdate(instanceId, messageUpdate);
      });

      socket.ev.on('presence.update', async (presenceUpdate) => {
        await this.handlePresenceUpdate(instanceId, presenceUpdate);
      });

      return instance;
    } catch (error) {
      instance.status = 'disconnected';
      instance.socket = null;
      throw error;
    }
  }

  async handleConnectionUpdate(instanceId, update) {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    const { connection, lastDisconnect, qr } = update;
    console.log(`[${instanceId}] Connection update: connection=${connection}, qr=${qr ? 'disponível' : 'não disponível'}`);

    if (qr) {
      try {
        const qrCodeDataURL = await QRCode.toDataURL(qr);
        instance.qrCode = qrCodeDataURL;
        instance.status = 'qr_code';
        this.qrCodes.set(instanceId, qrCodeDataURL);
        console.log(`[${instanceId}] QR Code gerado e armazenado.`);
        
        await this.sendWebhookEvent(instanceId, 'qr', {
          qrCode: qrCodeDataURL,
          qrString: qr
        });
      } catch (error) {
        console.error(`[${instanceId}] Erro ao gerar QR Code:`, error);
      }
    }

    if (connection === 'close') {
      console.log(`[${instanceId}] Conexão fechada. Última desconexão:`, lastDisconnect);

      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      
      instance.status = 'disconnected';
      instance.socket = null;
      instance.qrCode = null;
      instance.phone = null;
      
      if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
        console.log(`[${instanceId}] Instância fez logout. Removendo dados de sessão e instância do mapa.`);
        this.qrCodes.delete(instanceId);
        this.pairingCodes.delete(instanceId);
        this.instances.delete(instanceId);
        // Não remover metadados para permitir recriação
      } else {
        console.log(`[${instanceId}] Instância desconectada por outro motivo. Mantendo no mapa para reconexão.`);
      }

      await this.sendWebhookEvent(instanceId, 'disconnected', {
        reason: lastDisconnect?.error?.output?.statusCode,
        shouldReconnect
      });

      if (shouldReconnect) {
        console.log(`Instância ${instanceId} desconectada. Tentando reconectar em 3 segundos...`);
        setTimeout(async () => {
          try {
            await this.connectInstance(instanceId);
            console.log(`Instância ${instanceId} reconectada com sucesso.`);
          } catch (reconnectError) {
            console.error(`Erro ao reconectar instância ${instanceId}:`, reconnectError.message);
          }
        }, 3000);
      }
    } else if (connection === 'open') {
      instance.status = 'connected';
      instance.lastSeen = new Date();
      instance.qrCode = null;
      
      try {
        const user = instance.socket.user;
        if (user) {
          instance.phone = user.id.split(':')[0];
        }
      } catch (error) {
        console.error('Erro ao obter informações do usuário:', error);
      }

      this.qrCodes.delete(instanceId);
      this.pairingCodes.delete(instanceId);

      await this.sendWebhookEvent(instanceId, 'connected', {
        phone: instance.phone,
        user: instance.socket.user
      });
    }
  }

  async handleMessages(instanceId, messageUpdate) {
    const { messages } = messageUpdate;
    
    for (const message of messages) {
      //if (message.key.fromMe) continue;
      
      const messageData = {
        message: message,
        messageType: Object.keys(message.message || {})[0],
        from: message.key.remoteJid,
        timestamp: message.messageTimestamp
      };
      
      await this.sendWebhookEvent(instanceId, 'message', messageData);
      
      try {
        const botpressService = require('./botpressService');
        if (botpressService.isBotActive(instanceId)) {
          console.log(`Bot ativo para instância ${instanceId}, processando mensagem...`);
          await botpressService.processIncomingMessage(instanceId, messageData);
        }
      } catch (error) {
        console.error('Erro ao processar mensagem no bot:', error);
      }
    }
  }

  async handleMessageUpdate(instanceId, messageUpdate) {
    await this.sendWebhookEvent(instanceId, 'message_update', {
      updates: messageUpdate
    });
  }

  async handlePresenceUpdate(instanceId, presenceUpdate) {
    await this.sendWebhookEvent(instanceId, 'presence', presenceUpdate);
  }

  async disconnectInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instância não encontrada');
    }

    if (instance.socket) {
      await instance.socket.logout();
      instance.socket = null;
    }

    instance.status = 'disconnected';
    instance.qrCode = null;
    instance.phone = null;
    
    this.qrCodes.delete(instanceId);
    this.pairingCodes.delete(instanceId);

    return instance;
  }

  async deleteInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Instância não encontrada');
    }

    if (instance.socket) {
      await this.disconnectInstance(instanceId);
    }

    const sessionDir = path.join(this.sessionsDir, instanceId);
    if (await fs.stat(sessionDir).catch(() => null)) {
      await fs.rm(sessionDir, { recursive: true, force: true });
    }

    this.instances.delete(instanceId);
    this.qrCodes.delete(instanceId);
    this.pairingCodes.delete(instanceId);
    this.webhooks.delete(instanceId);

    // Atualizar metadados
    const metadata = await this.loadInstanceMetadata();
    const updatedMetadata = metadata.filter(m => m.instanceId !== instanceId);
    await fs.writeFile(this.metadataFile, JSON.stringify(updatedMetadata, null, 2));

    return true;
  }

  async generatePairingCode(instanceId, phoneNumber) {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.socket) {
      throw new Error('Instância não encontrada ou não conectada');
    }

    try {
      const code = await instance.socket.requestPairingCode(phoneNumber);
      instance.pairingCode = code;
      this.pairingCodes.set(instanceId, code);
      
      await this.sendWebhookEvent(instanceId, 'pairing_code', {
        code: code,
        phone: phoneNumber
      });

      return code;
    } catch (error) {
      throw new Error('Erro ao gerar código de pareamento: ' + error.message);
    }
  }

  async sendTextMessage(instanceId, to, message) {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.socket) {
      throw new Error('Instância não encontrada ou não conectada');
    }

    if (instance.status !== 'connected') {
      throw new Error('Instância não está conectada');
    }

    try {
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      const result = await instance.socket.sendMessage(jid, { text: message });
      
      return {
        success: true,
        messageId: result.key.id,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error('Erro ao enviar mensagem: ' + error.message);
    }
  }

  async sendMediaMessage(instanceId, to, mediaPath, caption = '') {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.socket) {
      throw new Error('Instância não encontrada ou não conectada');
    }

    if (instance.status !== 'connected') {
      throw new Error('Instância não está conectada');
    }

    try {
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      
      const mediaMessage = {
        caption: caption
      };

      const ext = path.extname(mediaPath).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
        mediaMessage.image = { url: mediaPath };
      } else if (['.mp4', '.avi', '.mov', '.mkv'].includes(ext)) {
        mediaMessage.video = { url: mediaPath };
      } else if (['.mp3', '.wav', '.ogg', '.aac'].includes(ext)) {
        mediaMessage.audio = { url: mediaPath };
      } else {
        mediaMessage.document = { 
          url: mediaPath,
          fileName: path.basename(mediaPath)
        };
      }

      const result = await instance.socket.sendMessage(jid, mediaMessage);
      
      return {
        success: true,
        messageId: result.key.id,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error('Erro ao enviar mídia: ' + error.message);
    }
  }

  async sendLocation(instanceId, to, latitude, longitude, name = '', address = '') {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.socket) {
      throw new Error('Instância não encontrada ou não conectada');
    }

    try {
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      const result = await instance.socket.sendMessage(jid, {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
          name: name,
          address: address
        }
      });
      
      return {
        success: true,
        messageId: result.key.id,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error('Erro ao enviar localização: ' + error.message);
    }
  }

  async sendContact(instanceId, to, contact) {
    const instance = this.instances.get(instanceId);
    if (!instance || !instance.socket) {
      throw new Error('Instância não encontrada ou não conectada');
    }

    try {
      const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
      
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${contact.name}
TEL:${contact.phone}
${contact.email ? `EMAIL:${contact.email}` : ''}
END:VCARD`;

      const result = await instance.socket.sendMessage(jid, {
        contacts: {
          displayName: contact.name,
          contacts: [{ vcard }]
        }
      });
      
      return {
        success: true,
        messageId: result.key.id,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error('Erro ao enviar contato: ' + error.message);
    }
  }

  getInstance(instanceId) {
    return this.instances.get(instanceId);
  }

  getAllInstances() {
    return Array.from(this.instances.values());
  }

  getQRCode(instanceId) {
    return this.qrCodes.get(instanceId);
  }

  getPairingCode(instanceId) {
    return this.pairingCodes.get(instanceId);
  }

  configureWebhook(instanceId, url, events = ['message', 'connection', 'qr'], secret = null) {
    this.webhooks.set(instanceId, {
      url,
      events,
      secret
    });
  }

  getWebhookConfig(instanceId) {
    return this.webhooks.get(instanceId);
  }

  removeWebhook(instanceId) {
    return this.webhooks.delete(instanceId);
  }

  async sendWebhookEvent(instanceId, event, data) {
    const webhook = this.webhooks.get(instanceId);
    if (!webhook || !webhook.events.includes(event)) {
      return;
    }

    try {
      const payload = {
        event,
        instanceId,
        data,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhook.secret && { 'X-Webhook-Secret': webhook.secret })
        },
        body: JSON.stringify(payload)
      });

      console.log(`Webhook enviado para ${webhook.url}: ${response.status}`);
    } catch (error) {
      console.error('Erro ao enviar webhook:', error);
    }
  }

  async testWebhook(url, data = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'test',
          data: data,
          timestamp: new Date().toISOString()
        })
      });

      const responseTime = Date.now() - startTime;
      
      return {
        success: response.ok,
        status: response.status,
        responseTime,
        response: await response.text()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }
}

module.exports = new WhatsAppService();