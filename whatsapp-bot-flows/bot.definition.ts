import { BotDefinition } from '@botpress/sdk'

export default new BotDefinition({
  name: 'WhatsApp Bot',
  description: 'Bot de atendimento integrado com API WhatsApp usando Baileys',
  version: '1.0.0',
  configuration: {
    schema: {
      type: 'object',
      properties: {
        whatsappApiUrl: {
          type: 'string',
          title: 'URL da API WhatsApp',
          description: 'URL base da sua API WhatsApp',
          default: 'http://localhost:3000'
        },
        apiKey: {
          type: 'string',
          title: 'Chave da API',
          description: 'Chave de autenticação para a API WhatsApp (se necessário)'
        }
      },
      required: ['whatsappApiUrl']
    }
  },
  events: {
    messageReceived: {
      title: 'Mensagem Recebida',
      description: 'Disparado quando uma mensagem é recebida do WhatsApp',
      schema: {
        type: 'object',
        properties: {
          instanceId: { type: 'string' },
          from: { type: 'string' },
          message: { type: 'string' },
          messageType: { type: 'string' },
          timestamp: { type: 'string' }
        }
      }
    }
  },
  actions: {
    sendMessage: {
      title: 'Enviar Mensagem',
      description: 'Envia uma mensagem através da API WhatsApp',
      input: {
        schema: {
          type: 'object',
          properties: {
            instanceId: { type: 'string', title: 'ID da Instância' },
            to: { type: 'string', title: 'Destinatário' },
            message: { type: 'string', title: 'Mensagem' }
          },
          required: ['instanceId', 'to', 'message']
        }
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            messageId: { type: 'string' },
            error: { type: 'string' }
          }
        }
      }
    }
  },
  states: {
    conversation: {
      type: 'conversation',
      schema: {
        type: 'object',
        properties: {
          instanceId: { type: 'string' },
          userPhone: { type: 'string' },
          userName: { type: 'string' },
          lastActivity: { type: 'string' }
        }
      }
    },
    user: {
      type: 'user',
      schema: {
        type: 'object',
        properties: {
          phone: { type: 'string' },
          name: { type: 'string' },
          preferredLanguage: { type: 'string', default: 'pt-BR' }
        }
      }
    }
  }
})
