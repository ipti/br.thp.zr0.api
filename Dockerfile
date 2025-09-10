FROM node:22.16-slim

WORKDIR /home/api

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .

RUN apt-get update && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

RUN npx prisma generate
RUN npm run build

RUN mkdir -p ./archives && chown -R www-data:www-data ./archives

EXPOSE 80
CMD ["npm", "run", "start:migrate:prod"]
