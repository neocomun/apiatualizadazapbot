#!/bin/bash

echo "🧹 Iniciando limpeza completa..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar processos atuais
echo -e "${BLUE}1. Verificando processos atuais...${NC}"
echo "Processos PM2:"
pm2 list 2>/dev/null || echo "PM2 não está rodando ou não instalado"
echo ""
echo "Processos na porta 3000:"
sudo netstat -tlnp | grep :3000 || echo "Porta 3000 está livre"
echo ""

# 2. Parar e limpar PM2
echo -e "${BLUE}2. Limpando PM2...${NC}"
if command -v pm2 >/dev/null 2>&1; then
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    pm2 flush 2>/dev/null || true
    echo -e "${GREEN}✅ PM2 limpo${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 não encontrado, pulando...${NC}"
fi

# 3. Matar processos na porta 3000
echo -e "${BLUE}3. Liberando porta 3000...${NC}"
PID=$(sudo lsof -t -i:3000 2>/dev/null)
if [ ! -z "$PID" ]; then
    echo "Matando processo $PID"
    sudo kill -9 $PID
    sleep 2
    echo -e "${GREEN}✅ Porta 3000 liberada${NC}"
else
    echo -e "${GREEN}✅ Porta 3000 já está livre${NC}"
fi

# 4. Verificar se ainda há processos do app antigo
echo -e "${BLUE}4. Verificando processos Node.js restantes...${NC}"
OLD_PROCESSES=$(ps aux | grep -E "(whatsapp|baileys)" | grep -v grep | wc -l)
if [ $OLD_PROCESSES -gt 0 ]; then
    echo "Encontrados $OLD_PROCESSES processos antigos. Removendo..."
    sudo pkill -f "whatsapp" 2>/dev/null || true
    sudo pkill -f "baileys" 2>/dev/null || true
    echo -e "${GREEN}✅ Processos antigos removidos${NC}"
fi

# 5. Verificar se a porta está realmente livre
echo -e "${BLUE}5. Verificação final da porta...${NC}"
if sudo netstat -tlnp | grep -q :3000; then
    echo -e "${RED}❌ Porta 3000 ainda ocupada!${NC}"
    sudo netstat -tlnp | grep :3000
    echo ""
    echo "Processos encontrados:"
    sudo lsof -i :3000
    echo ""
    echo "Tentando forçar liberação..."
    sudo fuser -k 3000/tcp 2>/dev/null || true
    sleep 3
    
    if sudo netstat -tlnp | grep -q :3000; then
        echo -e "${RED}❌ Não foi possível liberar a porta 3000${NC}"
        echo "Você pode tentar usar uma porta diferente alterando a variável PORT no .env"
        exit 1
    else
        echo -e "${GREEN}✅ Porta 3000 liberada com sucesso${NC}"
    fi
else
    echo -e "${GREEN}✅ Porta 3000 completamente livre${NC}"
fi

# 6. Verificar diretório atual
echo -e "${BLUE}6. Verificando diretório atual...${NC}"
echo "Diretório atual: $(pwd)"
echo "Arquivos no diretório:"
ls -la | head -10

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json não encontrado!${NC}"
    echo "Certifique-se de estar no diretório correto do projeto"
    echo ""
    echo "Procurando por package.json em subdiretórios..."
    find . -name "package.json" -type f 2>/dev/null | head -5
    exit 1
fi

# Verificar se app.js existe
if [ ! -f "app.js" ]; then
    echo -e "${RED}❌ app.js não encontrado!${NC}"
    echo "Procurando por app.js..."
    find . -name "app.js" -type f 2>/dev/null | head -5
    
    # Verificar se existe app_modified.js
    if [ -f "app_modified.js" ]; then
        echo -e "${YELLOW}⚠️  Encontrado app_modified.js. Copiando para app.js...${NC}"
        cp app_modified.js app.js
        echo -e "${GREEN}✅ app.js criado a partir de app_modified.js${NC}"
    else
        exit 1
    fi
fi

echo -e "${GREEN}✅ Arquivos necessários encontrados${NC}"

# 7. Instalar dependências se necessário
echo -e "${BLUE}7. Verificando dependências...${NC}"
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erro ao instalar dependências${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ node_modules já existe${NC}"
fi

# 8. Verificar arquivo .env
echo -e "${BLUE}8. Verificando configuração...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"
    echo "Configurações principais:"
    grep -E "^(PORT|BOT_ENABLED|NODE_ENV)" .env 2>/dev/null || echo "Configurações padrão serão usadas"
else
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
    if [ -f ".env.example" ] || [ -f ".env.complete.example" ]; then
        echo "Arquivo de exemplo encontrado. Criando .env..."
        cp .env.example .env 2>/dev/null || cp .env.complete.example .env 2>/dev/null
        echo -e "${GREEN}✅ Arquivo .env criado${NC}"
    else
        echo "Continuando com configurações padrão..."
    fi
fi

# 9. Iniciar aplicação
echo -e "${BLUE}9. Iniciando nova versão com bot...${NC}"

# Iniciar aplicação
echo "🚀 Iniciando aplicação..."
npm start &
APP_PID=$!

# Aguardar inicialização
echo "⏳ Aguardando inicialização (15 segundos)..."
sleep 15

# Verificar se a aplicação está rodando
if ps -p $APP_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Aplicação iniciada com sucesso!${NC}"
    echo "PID: $APP_PID"
    
    # Testar conectividade
    echo "🔍 Testando conectividade..."
    
    # Teste básico
    if curl -s --connect-timeout 5 http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Servidor respondendo na porta 3000${NC}"
        
        # Teste health check
        if curl -s --connect-timeout 5 http://localhost:3000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check funcionando${NC}"
        else
            echo -e "${YELLOW}⚠️  Health check não respondeu (normal se rota não existir)${NC}"
        fi
        
        # Teste API docs
        if curl -s --connect-timeout 5 -I http://localhost:3000/api-docs | grep -q "200\|302"; then
            echo -e "${GREEN}✅ API docs acessível${NC}"
        else
            echo -e "${YELLOW}⚠️  API docs não acessível (normal se rota não existir)${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️  Servidor ainda não está respondendo (pode estar inicializando)${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🌐 URLs disponíveis:${NC}"
    echo "• Principal: http://localhost:3000"
    echo "• Health: http://localhost:3000/health"
    echo "• API Docs: http://localhost:3000/api-docs"
    echo "• Instâncias: http://localhost:3000/api/v1/instances"
    
else
    echo -e "${RED}❌ Falha ao iniciar aplicação${NC}"
    echo ""
    echo "Verificando logs de erro..."
    
    # Tentar capturar logs de erro
    if [ -f "app.log" ]; then
        echo "Últimas linhas do log:"
        tail -20 app.log
    fi
    
    # Verificar se há erros de sintaxe
    echo ""
    echo "Testando sintaxe do app.js..."
    node -c app.js
    
    echo ""
    echo "Para debug manual, execute:"
    echo "node app.js"
    
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Limpeza e inicialização concluídas!${NC}"
echo ""
echo -e "${BLUE}Para monitorar a aplicação:${NC}"
echo "• Ver logs: tail -f app.log (se existir)"
echo "• Status do processo: ps aux | grep app.js"
echo "• Parar aplicação: kill $APP_PID"
echo ""
echo -e "${BLUE}Para usar PM2 no futuro:${NC}"
echo "• pm2 start app.js --name whatsapp-bot"
echo "• pm2 logs whatsapp-bot"
echo "• pm2 restart whatsapp-bot"
