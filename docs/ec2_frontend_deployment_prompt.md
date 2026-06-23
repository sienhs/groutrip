# 프론트엔드를 EC2에 함께 배포하도록 변경하는 작업 프롬프트

아래 내용을 Codex, Claude, Cursor Agent 등에 그대로 전달해서 작업을 진행해라.

---

## 작업 목표

현재 프로젝트는 다음 구조를 가진다.

```text
enjoy-trip/
├─ backend/
├─ frontend/
├─ docker-compose.yml
└─ .env
```

현재 EC2 배포 구조는 다음과 같다.

```text
EC2
├─ backend 컨테이너
└─ postgres 컨테이너

S3
└─ 이미지/파일 저장
```

이 구조를 다음처럼 변경하고 싶다.

```text
EC2
├─ frontend 컨테이너
│  └─ React/Vite 빌드 결과물을 Nginx로 서빙
├─ backend 컨테이너
│  └─ Spring Boot API 서버
└─ postgres 컨테이너
   └─ PostgreSQL DB

S3
└─ 이미지/파일 저장
```

최종적으로 사용자는 다음 주소로 접속한다.

```text
http://EC2_PUBLIC_IP
```

그리고 프론트엔드에서 백엔드 API를 호출할 때는 다음처럼 상대 경로를 사용한다.

```text
/api/...
```

즉 브라우저 기준으로는 프론트와 백엔드가 같은 Origin에서 동작하게 만들고, Nginx가 `/api` 요청을 백엔드 컨테이너로 프록시하도록 구성한다.

---

## 현재 전제

- 백엔드: Spring Boot
- 프론트엔드: React + Vite
- DB: PostgreSQL 16
- 배포 서버: AWS EC2 Ubuntu
- 파일 저장소: AWS S3
- 컨테이너 관리: Docker Compose
- 루트에 `docker-compose.yml`이 존재한다.
- `backend/`와 `frontend/`가 루트 하위 폴더로 존재한다.
- 루트 `.env`는 EC2 Docker Compose 배포용 환경 변수 파일이다.
- 기존 `docker-compose.yml`은 PostgreSQL만 정의되어 있거나, backend까지만 정의되어 있을 수 있다.

---

## 해야 할 작업

### 1. `frontend/Dockerfile` 생성

`frontend/` 폴더 안에 Dockerfile을 생성해라.

요구사항:

- Node 이미지로 Vite 프로젝트를 빌드한다.
- 빌드 결과물인 `dist/`를 Nginx 이미지에 복사한다.
- Nginx가 React/Vite SPA를 서빙하도록 한다.
- `frontend/nginx.conf`를 Nginx 설정으로 복사한다.
- 최종 컨테이너는 80번 포트를 사용한다.

예시 방향:

```dockerfile
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

단, 프로젝트가 `pnpm`이나 `yarn`을 사용한다면 기존 lock 파일과 패키지 매니저에 맞게 수정해라.

---

### 2. `frontend/nginx.conf` 생성

`frontend/` 폴더 안에 `nginx.conf`를 생성해라.

요구사항:

1. `/` 요청은 React/Vite 정적 파일을 서빙한다.
2. React Router 같은 SPA 라우팅을 위해 존재하지 않는 경로는 `index.html`로 fallback한다.
3. `/api/` 요청은 backend 컨테이너의 8080 포트로 프록시한다.
4. OAuth2 관련 경로가 있다면 `/oauth2/`, `/login/`도 backend로 프록시한다.
5. SSE를 사용하는 경우 Nginx buffering 문제를 피하도록 SSE 경로는 `proxy_buffering off`를 적용한다.
6. 현재 SSE 경로가 `/api/groups/{groupId}/sse` 형태일 수 있으므로 `/api/` 프록시 또는 별도 location에서 SSE가 정상 동작하도록 처리한다.

예시 방향:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # React Router / SPA 라우팅 대응
    location / {
        try_files $uri $uri/ /index.html;
    }

    # SSE 경로가 /api/groups/{groupId}/sse 형태인 경우
    location ~ ^/api/groups/.*/sse$ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header Connection '';
        proxy_set_header Cache-Control no-cache;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }

    # 백엔드 API 프록시
    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # OAuth2 로그인 관련 경로
    location /oauth2/ {
        proxy_pass http://backend:8080/oauth2/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /login/ {
        proxy_pass http://backend:8080/login/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

실제 백엔드 API 경로, OAuth 경로, SSE 경로가 다르면 프로젝트 코드 기준으로 맞춰서 수정해라.

---

### 3. 루트 `docker-compose.yml` 수정

루트의 `docker-compose.yml`을 `postgres`, `backend`, `frontend` 세 서비스를 포함하도록 수정해라.

요구사항:

- `postgres`는 외부에 5432 포트를 열지 않는다.
- `backend`는 외부에 8080 포트를 직접 열지 않고, Docker 네트워크 내부에서만 접근 가능하도록 `expose: 8080`을 사용한다.
- `frontend`만 외부에 80번 포트를 연다.
- `frontend`의 Nginx가 내부 네트워크에서 `backend:8080`으로 프록시한다.
- `backend`는 `postgres` 서비스가 healthy 상태가 된 후 실행되도록 한다.
- `backend` 컨테이너 안의 DB URL은 `localhost`가 아니라 `postgres` 서비스 이름을 사용한다.
- S3는 Docker Compose 서비스로 추가하지 않는다. AWS S3는 외부 서비스이므로 `.env` 환경 변수로만 backend에 전달한다.

예시 방향:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: enjoy-trip-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-enjoy_trip}
      POSTGRES_USER: ${DB_USER:-enjoy_trip_user}
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - enjoy-trip-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: enjoy-trip-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    expose:
      - "8080"
    env_file:
      - .env
    environment:
      SERVER_PORT: 8080
      DB_URL: jdbc:postgresql://postgres:5432/${DB_NAME:-enjoy_trip}
      DB_USER: ${DB_USER:-enjoy_trip_user}
      DB_PASS: ${DB_PASS}
      JPA_DDL_AUTO: ${JPA_DDL_AUTO:-validate}
    networks:
      - enjoy-trip-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: enjoy-trip-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - enjoy-trip-network

volumes:
  postgres_data:

networks:
  enjoy-trip-network:
    driver: bridge
```

기존 프로젝트에서 backend 서비스명, 포트, 폴더명이 다르면 실제 구조에 맞게 조정해라.

---

### 4. 프론트엔드 API base URL 수정

프론트엔드는 EC2 배포 환경에서 백엔드 API를 절대 주소로 호출하지 말고, 가능하면 상대 경로를 사용하도록 수정해라.

기존 코드가 이런 식이라면:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

fetch(`${API_BASE_URL}/api/groups`);
```

배포 환경에서 `VITE_API_BASE_URL`이 비어 있어도 동작하도록 수정해라.

예시:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

fetch(`${API_BASE_URL}/api/groups`);
```

또는 axios 인스턴스를 사용한다면:

```js
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
});
```

최종적으로 EC2 배포 환경에서는 다음 요청이 가능해야 한다.

```text
http://EC2_PUBLIC_IP/api/...
```

이 요청은 frontend Nginx가 backend 컨테이너로 프록시해야 한다.

---

### 5. 프론트엔드 환경 변수 정리

`frontend/.env.production`이 필요하다면 다음처럼 설정해라.

```env
VITE_API_BASE_URL=
```

또는 아예 배포용 환경 변수 없이 상대 경로만 사용해도 된다.

주의:

프론트엔드 `.env`에는 절대 다음 값을 넣지 마라.

```env
DB_PASS=...
JWT_SECRET=...
AWS_SECRET_ACCESS_KEY=...
AWS_ACCESS_KEY_ID=...
```

프론트엔드 환경 변수는 브라우저 번들에 포함될 수 있으므로 공개되어도 되는 값만 넣어야 한다.

---

### 6. 루트 `.env` 점검

루트 `.env`는 EC2 Docker Compose 배포용으로 사용한다.

예시:

```env
DB_NAME=enjoy_trip
DB_USER=enjoy_trip_user
DB_PASS=강한_DB_비밀번호
JPA_DDL_AUTO=validate

SERVER_PORT=8080

CORS_ALLOWED_ORIGINS=http://EC2_PUBLIC_IP
FRONTEND_BASE_URL=http://EC2_PUBLIC_IP

JWT_SECRET=최소_32바이트_랜덤_문자열
JWT_ACCESS_EXP=1800000
JWT_REFRESH_EXP=604800000

AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=너의_S3_버킷_이름
AWS_ACCESS_KEY_ID=발급받은_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=발급받은_SECRET_KEY

GOOGLE_OAUTH_CLIENT_ID=disabled
GOOGLE_OAUTH_CLIENT_SECRET=disabled
KAKAO_OAUTH_CLIENT_ID=disabled
KAKAO_OAUTH_CLIENT_SECRET=disabled

REFRESH_COOKIE_SECURE=false
```

S3 관련 값은 frontend가 아니라 backend 컨테이너에만 전달되어야 한다.

---

### 7. EC2 보안 그룹 안내

이 구조에서는 외부에서 접근해야 하는 포트가 다음과 같다.

```text
22 SSH  → 내 IP만 허용
80 HTTP → 0.0.0.0/0 허용
```

다음 포트는 외부에 열지 않는 것이 좋다.

```text
5432 PostgreSQL → 닫기
8080 Backend    → 가능하면 닫기
```

외부 사용자는 `http://EC2_PUBLIC_IP`로 접속하고, `/api` 요청은 Nginx가 내부 backend 컨테이너로 전달한다.

---

### 8. 실행 및 검증 명령어 정리

EC2 프로젝트 루트에서 다음 명령어로 실행할 수 있어야 한다.

```bash
docker compose down
docker compose up -d --build
```

상태 확인:

```bash
docker compose ps
```

로그 확인:

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f postgres
```

외부 접속 테스트:

```text
http://EC2_PUBLIC_IP
```

API 테스트:

```bash
curl http://EC2_PUBLIC_IP/api/...
```

프로젝트에 인증 없이 접근 가능한 health check API가 있다면 그것으로 테스트해라.

예:

```bash
curl http://EC2_PUBLIC_IP/actuator/health
curl http://EC2_PUBLIC_IP/api/health
```

---

## 완료 기준

다음 조건을 만족하면 작업 완료로 본다.

1. EC2에서 `docker compose ps` 실행 시 `frontend`, `backend`, `postgres` 컨테이너가 모두 Up 상태다.
2. 브라우저에서 `http://EC2_PUBLIC_IP` 접속 시 React/Vite 프론트 화면이 보인다.
3. 프론트에서 API 요청 시 `/api/...` 경로로 요청된다.
4. Nginx가 `/api/...` 요청을 backend 컨테이너로 정상 프록시한다.
5. PostgreSQL은 외부에 5432 포트로 노출되지 않는다.
6. backend는 외부에 8080 포트로 직접 노출되지 않아도 정상 동작한다.
7. S3는 Docker Compose 서비스로 추가하지 않고, backend 환경 변수로만 연결된다.
8. SSE 기능을 사용하는 경우 Nginx 프록시 환경에서도 이벤트 수신이 끊기지 않는다.
9. OAuth2 로그인 경로가 있다면 `/oauth2/`, `/login/` 프록시가 정상 동작한다.
10. `.env` 파일은 Git에 커밋하지 않고, 필요한 경우 `.env.example`만 제공한다.

---

## 추가 주의사항

- 기존에 이미 적용된 Flyway 마이그레이션 파일은 수정하지 말고, DB 변경이 필요하면 `V2__...sql`, `V3__...sql`처럼 새 파일을 추가해라.
- Docker Compose에서 backend 컨테이너 내부의 DB URL은 반드시 `jdbc:postgresql://postgres:5432/...` 형태여야 한다.
- 프론트엔드에서 `localhost:8080` 또는 EC2 IP를 하드코딩하지 말고, 상대 경로 또는 환경 변수를 사용해라.
- 배포 초기에는 HTTP 80으로 테스트하고, 추후 도메인과 HTTPS를 붙일 때 Nginx 또는 로드밸런서/CloudFront 구성을 추가하면 된다.
