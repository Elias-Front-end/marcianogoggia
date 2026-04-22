FROM node:18

# Criar diretório do app
WORKDIR /usr/src/app

# Instalar dependências
# Copiamos apenas o package.json e package-lock.json primeiro para aproveitar o cache do Docker
COPY package*.json ./

RUN npm install

# Copiar o restante do código
COPY . .

# Garantir que o banco de dados seja gravável se ele for copiado
RUN chmod 666 apoiadores.db || true

# Porta padrão
ENV PORT=3000
EXPOSE 3000

# Comando para iniciar
CMD [ "npm", "start" ]
