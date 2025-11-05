# Demonstração da WhatsApp API

Este documento mostra como usar a API do WhatsApp criada com Baileys através de exemplos práticos.

## URL da API

**Documentação Swagger**: https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api-docs

## Exemplos de Uso

### 1. Criar uma Nova Instância

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/instances" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Minha Primeira Instância",
    "webhook": "https://meusite.com/webhook"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "instance": {
    "id": "uuid-da-instancia",
    "name": "Minha Primeira Instância",
    "status": "disconnected",
    "phone": null,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "webhook": "https://meusite.com/webhook"
  }
}
```

### 2. Conectar a Instância

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/instances/{instanceId}/connect" \
  -H "Content-Type: application/json"
```

### 3. Obter QR Code para Autenticação

```bash
curl -X GET "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/instances/{instanceId}/qrcode"
```

**Resposta esperada:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "qrCodeUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 4. Gerar Código de Pareamento (Alternativa ao QR Code)

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/instances/{instanceId}/pairing-code" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "pairingCode": "ABCD-EFGH",
  "phone": "5511999999999"
}
```

### 5. Verificar Status da Conexão

```bash
curl -X GET "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/instances/{instanceId}/status"
```

**Resposta esperada:**
```json
{
  "success": true,
  "status": "connected",
  "phone": "5511999999999",
  "lastSeen": "2023-12-01T10:30:00.000Z",
  "hasQRCode": false,
  "hasPairingCode": false
}
```

### 6. Enviar Mensagem de Texto

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/messages/text" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "uuid-da-instancia",
    "to": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste da API."
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "messageId": "message-id-123",
  "timestamp": "2023-12-01T10:35:00.000Z",
  "to": "5511999999999",
  "message": "Olá! Esta é uma mensagem de teste da API."
}
```

### 7. Enviar Mídia (Imagem, Vídeo, Documento)

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/messages/media" \
  -H "Content-Type: multipart/form-data" \
  -F "instanceId=uuid-da-instancia" \
  -F "to=5511999999999" \
  -F "caption=Confira esta imagem!" \
  -F "file=@/caminho/para/imagem.jpg"
```

### 8. Enviar Localização

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/messages/location" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "uuid-da-instancia",
    "to": "5511999999999",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "name": "São Paulo",
    "address": "São Paulo, SP, Brasil"
  }'
```

### 9. Enviar Contato

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/messages/contact" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "uuid-da-instancia",
    "to": "5511999999999",
    "contact": {
      "name": "João Silva",
      "phone": "5511888888888",
      "email": "joao@exemplo.com"
    }
  }'
```

### 10. Configurar Webhook

```bash
curl -X POST "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/webhooks" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "uuid-da-instancia",
    "url": "https://meusite.com/webhook",
    "events": ["message", "connection", "qr"],
    "secret": "minha-chave-secreta"
  }'
```

### 11. Listar Todas as Instâncias

```bash
curl -X GET "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/instances"
```

### 12. Deletar uma Instância

```bash
curl -X DELETE "https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api/v1/instances/{instanceId}"
```

## Fluxo Completo de Uso

1. **Criar instância** → Receber ID da instância
2. **Conectar instância** → Iniciar processo de conexão
3. **Obter QR Code** ou **Gerar código de pareamento** → Autenticar no WhatsApp
4. **Verificar status** → Confirmar que está conectado
5. **Enviar mensagens** → Usar a API para enviar conteúdo
6. **Configurar webhooks** → Receber eventos em tempo real

## Eventos de Webhook

Quando configurado, o webhook receberá eventos no seguinte formato:

```json
{
  "event": "message",
  "instanceId": "uuid-da-instancia",
  "data": {
    "message": {...},
    "from": "5511999999999@s.whatsapp.net",
    "timestamp": 1234567890
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### Tipos de Eventos:
- `message` - Nova mensagem recebida
- `connection` - Mudanças na conexão
- `qr` - Novo QR Code gerado
- `pairing_code` - Código de pareamento gerado
- `connected` - Instância conectada
- `disconnected` - Instância desconectada
- `message_update` - Atualização de mensagem
- `presence` - Mudança de presença

## Testando com Swagger

A maneira mais fácil de testar a API é através da interface Swagger:

1. Acesse: https://3000-i7kegxjyxjdjay87ccx6g-a2910c06.manus.computer/api-docs
2. Expanda qualquer endpoint
3. Clique em "Try it out"
4. Preencha os parâmetros necessários
5. Clique em "Execute"
6. Veja a resposta em tempo real

## Códigos de Status HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `404` - Recurso não encontrado
- `429` - Muitas requisições (rate limit)
- `500` - Erro interno do servidor

## Limitações e Considerações

- Use uma conta WhatsApp secundária para testes
- Respeite os limites de rate limiting
- Mantenha as credenciais de webhook seguras
- Monitore os logs para debugging
- Faça backup das sessões importantes

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte a documentação Swagger
3. Teste os endpoints individualmente
4. Verifique a conectividade de rede

