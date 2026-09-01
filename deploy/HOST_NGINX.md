# Host Nginx for production (3 vhosts)

TLS and routing on the host. Compose publishes loopback only:

| Service | Loopback | Container |
|---------|----------|-----------|
| API | `127.0.0.1:18080` | server:8080 |
| Dispensary ERP | `127.0.0.1:10080` | dispensary:3000 |
| Admin CRM | `127.0.0.1:10081` | admin:3000 |

## DNS

- `api.nammamedmate.com`
- `dispensary.nammamedmate.com`
- `admin.nammamedmate.com`

## Upstreams

```nginx
upstream namma_api {
    server 127.0.0.1:18080;
    keepalive 32;
}
upstream namma_dispensary {
    server 127.0.0.1:10080;
    keepalive 8;
}
upstream namma_admin {
    server 127.0.0.1:10081;
    keepalive 8;
}
```

## Example HTTPS blocks

```nginx
server {
    listen 443 ssl http2;
    server_name api.nammamedmate.com;
    ssl_certificate     /etc/letsencrypt/live/nammamedmate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nammamedmate.com/privkey.pem;
    location / {
        proxy_pass http://namma_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 443 ssl http2;
    server_name dispensary.nammamedmate.com;
    ssl_certificate     /etc/letsencrypt/live/nammamedmate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nammamedmate.com/privkey.pem;
    location / {
        proxy_pass http://namma_dispensary;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.nammamedmate.com;
    ssl_certificate     /etc/letsencrypt/live/nammamedmate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nammamedmate.com/privkey.pem;
    location / {
        proxy_pass http://namma_admin;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Spring Boot uses `server.forward-headers-strategy=framework` in prod.
