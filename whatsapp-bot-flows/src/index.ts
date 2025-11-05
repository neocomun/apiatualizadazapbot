import * as bp from '.botpress'
import axios from 'axios'

const bot = new bp.Bot({
  actions: {
    sendMessage: async ({ input, ctx }) => {
      try {
        const { instanceId, to, message } = input
        const config = ctx.configuration
        
        console.log(`Enviando mensagem para ${to} via instância ${instanceId}`)
        
        // Fazer requisição para a API WhatsApp
        const response = await axios.post(
          `${config.whatsappApiUrl}/api/v1/messages/send-text`,
          {
            instanceId,
            to,
            message
          },
          {
            headers: {
              'Content-Type': 'application/json',
              ...(config.apiKey && { 'X-API-Key': config.apiKey })
            }
          }
        )
        
        console.log('Mensagem enviada com sucesso:', response.data)
        
        return {
          success: true,
          messageId: response.data.messageId || 'unknown',
          error: null
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error)
        
        return {
          success: false,
          messageId: null,
          error: error.message || 'Erro desconhecido'
        }
      }
    }
  }
})

// Handler para mensagens recebidas
bot.message(async ({ message, client, ctx }) => {
  console.log('Mensagem recebida:', message.payload.text)
  
  // Extrair informações da conversa
  const conversation = await client.getConversation({ id: ctx.conversationId })
  const instanceId = conversation.tags?.instanceId
  const userPhone = conversation.tags?.userPhone
  
  if (!instanceId) {
    console.error('ID da instância não encontrado na conversa')
    return
  }

  // Processar mensagem baseada no conteúdo
  const messageText = message.payload.text?.toLowerCase() || ''
  
  let responseText = ''
  
  if (messageText.includes('oi') || messageText.includes('olá') || messageText.includes('hello')) {
    responseText = `Olá! 👋 Bem-vindo ao nosso atendimento automatizado. Como posso ajudá-lo hoje?

Você pode me perguntar sobre:
• Informações sobre produtos
• Suporte técnico
• Horários de funcionamento
• Falar com um atendente

Digite sua dúvida ou escolha uma das opções acima.`
  } else if (messageText.includes('produto') || messageText.includes('serviço')) {
    responseText = `📦 Nossos Produtos e Serviços:

• Desenvolvimento de sistemas
• Consultoria em tecnologia
• Suporte técnico especializado
• Integração de APIs

Gostaria de saber mais sobre algum produto específico?`
  } else if (messageText.includes('suporte') || messageText.includes('ajuda') || messageText.includes('problema')) {
    responseText = `🛠️ Suporte Técnico:

Estou aqui para ajudar! Por favor, descreva seu problema com mais detalhes:

• Qual sistema está apresentando problema?
• Quando o problema começou?
• Você tem alguma mensagem de erro?

Ou digite "atendente" para falar com nossa equipe.`
  } else if (messageText.includes('horário') || messageText.includes('funcionamento')) {
    responseText = `🕒 Horários de Funcionamento:

Segunda a Sexta: 8h às 18h
Sábado: 8h às 12h
Domingo: Fechado

Fora do horário comercial, deixe sua mensagem que retornaremos assim que possível!`
  } else if (messageText.includes('atendente') || messageText.includes('humano') || messageText.includes('pessoa')) {
    responseText = `👨‍💼 Transferindo para Atendente Humano:

Entendi que você gostaria de falar com um de nossos atendentes. Estou transferindo sua conversa agora.

Um membro da nossa equipe entrará em contato em breve. Obrigado pela paciência!`
    
    // Aqui você pode implementar lógica para notificar a equipe de atendimento
    // Por exemplo, enviar um webhook ou email
  } else {
    responseText = `Obrigado pela sua mensagem! 😊

Não consegui entender exatamente o que você precisa. Você pode:

• Reformular sua pergunta
• Escolher uma das opções:
  - "produtos" - Para conhecer nossos serviços
  - "suporte" - Para ajuda técnica
  - "horários" - Para saber quando funcionamos
  - "atendente" - Para falar com nossa equipe

Como posso ajudá-lo?`
  }

  // Enviar resposta através da ação personalizada
  await client.callAction({
    type: 'sendMessage',
    input: {
      instanceId,
      to: userPhone,
      message: responseText
    }
  })
})

// Handler para eventos personalizados (mensagens recebidas do WhatsApp)
bot.event('messageReceived', async ({ event, client }) => {
  try {
    const { instanceId, from, message, messageType, timestamp } = event.payload
    
    console.log(`Evento messageReceived: ${from} -> ${message}`)
    
    // Criar ou obter conversa
    const conversationId = `${instanceId}-${from}`
    
    let conversation
    try {
      conversation = await client.getConversation({ id: conversationId })
    } catch {
      // Conversa não existe, criar nova
      conversation = await client.createConversation({
        id: conversationId,
        tags: {
          instanceId,
          userPhone: from,
          source: 'whatsapp'
        }
      })
    }
    
    // Criar ou obter usuário
    let user
    try {
      user = await client.getUser({ id: from })
    } catch {
      // Usuário não existe, criar novo
      user = await client.createUser({
        id: from,
        tags: {
          phone: from,
          source: 'whatsapp'
        }
      })
    }
    
    // Criar mensagem na conversa
    await client.createMessage({
      conversationId: conversation.id,
      userId: user.id,
      type: 'text',
      payload: {
        text: message
      },
      tags: {
        messageType,
        timestamp,
        source: 'whatsapp'
      }
    })
    
    console.log(`Mensagem processada e adicionada à conversa ${conversationId}`)
    
  } catch (error) {
    console.error('Erro ao processar evento messageReceived:', error)
  }
})

export default bot
