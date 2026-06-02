FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* ./

RUN npm install || npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=0 /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
