const axios = require('axios');

class BotpressService {
  constructor() {
    this.botpressUrl = process.env.BOTPRESS_URL || 'http://localhost:3001';
    this.botpressToken = process.env.BOTPRESS_TOKEN || '';
    this.activeBots = new Map();
    this.webhookUrl = process.env.WEBHOOK_URL || 'http://localhost:3000';
  }

  // Normalizar texto (remove acentos e caracteres especiais)
  normalizeText(text) {
    return text
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  async activateBot(instanceId, config = {}) {
    try {
      const botConfig = {
        instanceId,
        isActive: true,
        activatedAt: new Date(),
        config: {
          whatsappApiUrl: this.webhookUrl,
          apiKey: process.env.API_KEY || '',
          ...config
        }
      };

      this.activeBots.set(instanceId, botConfig);
      console.log(`Bot ativado para instância ${instanceId}`);
      return {
        success: true,
        message: 'Bot ativado com sucesso',
        config: botConfig
      };
    } catch (error) {
      console.error('Erro ao ativar bot:', error);
      throw new Error('Falha ao ativar bot: ' + error.message);
    }
  }

  async deactivateBot(instanceId) {
    try {
      if (!this.activeBots.has(instanceId)) {
        throw new Error('Bot não está ativo para esta instância');
      }
      this.activeBots.delete(instanceId);
      console.log(`Bot desativado para instância ${instanceId}`);
      return {
        success: true,
        message: 'Bot desativado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao desativar bot:', error);
      throw new Error('Falha ao desativar bot: ' + error.message);
    }
  }

  isBotActive(instanceId) {
    return this.activeBots.has(instanceId);
  }

  getBotConfig(instanceId) {
    return this.activeBots.get(instanceId);
  }

  getActiveBots() {
    return Array.from(this.activeBots.entries()).map(([instanceId, config]) => ({
      instanceId,
      ...config
    }));
  }

  async processIncomingMessage(instanceId, messageData) {
    try {
      if (!this.isBotActive(instanceId)) {
        console.log(`Bot não está ativo para instância ${instanceId}, ignorando mensagem`);
        return { processed: false, reason: 'Bot não ativo' };
      }

      const { message, from, messageType, timestamp } = messageData;
      const messageText = message.conversation ||
                         message.text ||
                         message.extendedTextMessage?.text ||
                         message.imageMessage?.caption ||
                         message.videoMessage?.caption ||
                         'Mensagem não textual';

      console.log(`Mensagem recebida: ${JSON.stringify(messageData, null, 2)}`);
      console.log(`Texto extraído: "${messageText}"`);
      console.log(`Texto normalizado: "${this.normalizeText(messageText)}"`);

      const response = await this.generateAutoResponse(messageText, from, instanceId);
      console.log(`Resposta gerada: "${response}"`);

      if (response) {
        await this.sendResponseToWhatsApp(instanceId, from, response);
      }

      return {
        processed: true,
        messageText,
        response,
        from,
        timestamp
      };
    } catch (error) {
      console.error('Erro ao processar mensagem para Botpress:', error);
      return {
        processed: false,
        error: error.message
      };
    }
  }

  async generateAutoResponse(messageText, from, instanceId) {
    try {
      const text = this.normalizeText(messageText);

      if (this.botpressUrl && this.botpressToken) {
        const botpressResponse = await this.sendToBotpress({
          type: 'text',
          text,
          from,
          instanceId
        });
        return botpressResponse.data.text || 'Resposta padrão do Botpress';
      }

      if (this.containsAny(text, ['oi', 'ola', 'hello', 'hi', 'bom dia', 'boa tarde', 'boa noite'])) {
        return `Olá! 👋 Bem-vindo ao nosso atendimento automatizado.

Como posso ajudá-lo hoje? Você pode:

🔹 Digitar "produtos" para conhecer nossos serviços
🔹 Digitar "suporte" para ajuda técnica  
🔹 Digitar "horários" para saber quando funcionamos
🔹 Digitar "atendente" para falar com nossa equipe

Ou simplesmente me conte o que você precisa!`;
      }

      if (this.containsAny(text, ['produto', 'servico', 'produtos', 'servicos', 'o que voces fazem'])) {
        return `📦 Nossos Produtos e Serviços:

🔸 Desenvolvimento de sistemas personalizados
🔸 APIs e integrações WhatsApp
🔸 Consultoria em tecnologia
🔸 Suporte técnico especializado
🔸 Automação de processos

Gostaria de saber mais detalhes sobre algum serviço específico? Digite o nome do serviço ou "mais informações".`;
      }

      if (this.containsAny(text, ['suporte', 'ajuda', 'problema', 'erro', 'bug', 'nao funciona'])) {
        return `🛠️ Suporte Técnico Disponível:

Para melhor atendê-lo, preciso de algumas informações:

1️⃣ Qual sistema está apresentando problema?
2️⃣ Quando o problema começou?
3️⃣ Você tem alguma mensagem de erro?
4️⃣ Já tentou reiniciar o sistema?

Ou digite "atendente" para falar diretamente com nossa equipe técnica.`;
      }

      if (this.containsAny(text, ['horario', 'funcionamento', 'quando', 'aberto', 'fechado'])) {
        const now = new Date();
        const hour = now.getHours();
        const isBusinessHour = hour >= 8 && hour < 18;
        const dayOfWeek = now.getDay();
        const isBusinessDay = dayOfWeek >= 1 && dayOfWeek <= 5;

        let status = isBusinessDay && isBusinessHour
          ? '🟢 Estamos ABERTOS agora!'
          : '🔴 Estamos FECHADOS no momento.';

        return `🕒 Horários de Funcionamento:

${status}

📅 Segunda a Sexta: 8h às 18h
📅 Sábado: 8h às 12h  
📅 Domingo: Fechado

Fora do horário comercial, deixe sua mensagem que retornaremos assim que possível!`;
      }

      if (this.containsAny(text, ['atendente', 'humano', 'pessoa', 'falar com alguem', 'transferir'])) {
        return `👨‍💼 Transferindo para Atendente Humano:

Entendi que você gostaria de falar com um de nossos atendentes. 

✅ Sua conversa foi marcada como "Atendimento Humano Solicitado"
✅ Um membro da nossa equipe será notificado
✅ Você receberá uma resposta em breve

Enquanto isso, pode deixar sua mensagem detalhada que nosso atendente verá todo o histórico da conversa.

Obrigado pela paciência! 😊`;
      }

      if (this.containsAny(text, ['preco', 'valor', 'quanto custa', 'orcamento', 'cotacao'])) {
        return `💰 Informações sobre Preços:

Nossos valores variam conforme a complexidade e escopo do projeto.

Para um orçamento personalizado, preciso saber:

🔹 Que tipo de solução você precisa?
🔹 Qual o prazo desejado?
🔹 Há algum requisito específico?

Digite "orçamento detalhado" ou fale com nosso atendente para uma cotação precisa!`;
      }

      if (this.containsAny(text, ['obrigado', 'obrigada', 'valeu', 'thanks', 'thank you'])) {
        return `😊 Por nada! Fico feliz em ajudar!

Se precisar de mais alguma coisa, estarei aqui. Você também pode:

🔹 Falar com um atendente
🔹 Conhecer nossos produtos
🔹 Solicitar suporte técnico

Como mais posso ajudá-lo?`;
      }

      if (this.containsAny(text, ['tchau', 'bye', 'ate logo', 'falou', 'ate mais'])) {
        return `👋 Até logo! Foi um prazer atendê-lo.

Lembre-se: estamos sempre aqui quando precisar!

Tenha um ótimo dia! 😊`;
      }

      return `Obrigado pela sua mensagem! 😊

Não consegui entender exatamente o que você precisa, mas estou aqui para ajudar!

Você pode tentar:
🔹 Reformular sua pergunta
🔹 Usar palavras-chave como: "produtos", "suporte", "horários", "atendente"
🔹 Ou me contar com mais detalhes o que você precisa

Como posso ajudá-lo melhor?`;
    } catch (error) {
      console.error('Erro ao gerar resposta automática:', error);
      return `Desculpe, ocorreu um erro ao processar sua mensagem. 😔

Por favor, tente novamente ou digite "atendente" para falar com nossa equipe.`;
    }
  }

  containsAny(text, keywords) {
    return keywords.some(keyword => {
      const normalizedKeyword = this.normalizeText(keyword);
      return text.includes(normalizedKeyword);
    });
  }

  async sendResponseToWhatsApp(instanceId, to, message) {
    try {
      const whatsappService = require('./whatsappService');
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      const result = await whatsappService.sendTextMessage(instanceId, to, message);
      console.log(`Resposta automática enviada para ${to}: ${result.success ? 'Sucesso' : 'Falha'}`);
      return result;
    } catch (error) {
      console.error('Erro ao enviar resposta automática:', error);
      throw error;
    }
  }

  async sendToBotpress(eventPayload) {
    try {
      const response = await axios.post(
        `${this.botpressUrl}/api/v1/events`,
        eventPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.botpressToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Resposta do Botpress:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro ao enviar para Botpress:', error);
      throw error;
    }
  }

  async configureBotpressWebhook(instanceId) {
    try {
      const webhookUrl = `${this.webhookUrl}/api/v1/bot/webhook/${instanceId}`;
      console.log(`Configurando webhook do Botpress para ${instanceId}: ${webhookUrl}`);
      return {
        success: true,
        webhookUrl
      };
    } catch (error) {
      console.error('Erro ao configurar webhook do Botpress:', error);
      throw error;
    }
  }

  async processBotpressResponse(instanceId, responseData) {
    try {
      const { to, message, messageType = 'text' } = responseData;
      console.log(`Processando resposta do Botpress para ${instanceId}: ${to} -> ${message}`);
      return {
        success: true,
        instanceId,
        to,
        message,
        messageType,
        processedAt: new Date()
      };
    } catch (error) {
      console.error('Erro ao processar resposta do Botpress:', error);
      throw error;
    }
  }

  getBotStats(instanceId) {
    const config = this.getBotConfig(instanceId);
    if (!config) {
      return null;
    }
    return {
      instanceId,
      isActive: config.isActive,
      activatedAt: config.activatedAt,
      uptime: Date.now() - new Date(config.activatedAt).getTime(),
    };
  }

  async updateBotConfig(instanceId, newConfig) {
    try {
      const currentConfig = this.getBotConfig(instanceId);
      if (!currentConfig) {
        throw new Error('Bot não está ativo para esta instância');
      }
      const updatedConfig = {
        ...currentConfig,
        config: {
          ...currentConfig.config,
          ...newConfig
        },
        updatedAt: new Date()
      };
      this.activeBots.set(instanceId, updatedConfig);
      console.log(`Configuração do bot atualizada para instância ${instanceId}`);
      return {
        success: true,
        config: updatedConfig
      };
    } catch (error) {
      console.error('Erro ao atualizar configuração do bot:', error);
      throw error;
    }
  }
}

module.exports = new BotpressService();