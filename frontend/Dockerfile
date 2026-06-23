# --- 1단계: Vite 빌드 ---
FROM node:20-alpine AS build

WORKDIR /app

# 의존성 캐시 최적화: lock 파일만 먼저 복사 후 설치
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 후 프로덕션 빌드
# .env.production(VITE_API_BASE_URL 비움)이 적용되어 API는 상대 경로로 호출된다.
COPY . .
RUN npm run build

# --- 2단계: Nginx 정적 서빙 ---
FROM nginx:alpine

# 빌드 결과물(dist) 서빙
COPY --from=build /app/dist /usr/share/nginx/html

# SPA 라우팅 + /api·/oauth2·/login 백엔드 프록시 설정
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
