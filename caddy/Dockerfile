FROM node:lts-alpine3.10 AS builder
WORKDIR /tmp/app
COPY . .
RUN npm install

FROM caddy:alpine
WORKDIR /root/
COPY --from=builder Caddyfile /etc/caddy/Caddyfile
CMD ["caddy", "run"]
# CMD ["caddy", "run", "-config", "/etc/caddy/Caddyfile"]