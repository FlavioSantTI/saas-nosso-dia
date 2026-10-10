# -------------------------------------------------------------
# Stage 1: Build da Aplicação React + Vite
# -------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY apps/web/package*.json ./
RUN npm install

# Copiar código fonte
COPY apps/web ./

# Argumentos de Build para o Vite
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_URL=https://nossodia.flaviosantiago.com.br

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_APP_URL=$VITE_APP_URL

# Compilar para produção
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Servidor Web Nginx para Produção
# -------------------------------------------------------------
FROM nginx:alpine

# Copiar configuração customizada do Nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar os arquivos gerados no build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
