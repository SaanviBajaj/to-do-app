FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

RUN chgrp -R 0 /app && chmod -R g+rwX /app

ENV NODE_ENV=production \
    PORT=8080

EXPOSE 8080

USER 1001

CMD ["node", "server.js"]
