# EnjoyTrip 백엔드 HTTPS 전환 가이드 (Nginx + Let's Encrypt)

Vercel 프론트(HTTPS)에서 백엔드 API를 안전하게 호출할 수 있도록, Backend EC2 앞에
Nginx 리버스 프록시와 Let's Encrypt 인증서를 붙여 `https://api.example.com` 으로
서비스한다. Spring Boot 컨테이너는 그대로 `localhost:8080` 으로 둔다.

> 이 문서의 `api.example.com` 은 **모두 본인 실제 API 서브도메인으로 바꿔서** 사용한다.

---

## 1. HTTPS 전환 목적

- Vercel 프론트(`https://enjoy-trip-six.vercel.app`)는 HTTPS인데 백엔드가
  `http://EC2_PUBLIC_IP:8080` 이라, 브라우저가 **Mixed Content** 로 API 요청을 차단한다.
- 해결: 백엔드에 도메인 + HTTPS를 붙여 `https://api.example.com` 으로 호출한다.
- 방식: **Spring Boot 자체를 HTTPS로 바꾸지 않는다.** Nginx가 443을 종단(terminate)하고
  내부 `127.0.0.1:8080` 으로 평문 프록시한다(SSL termination).

---

## 2. 현재 구조와 목표 구조

**현재**

```
Vercel Frontend (HTTPS)  ──X──▶  http://BACKEND_EC2_PUBLIC_IP:8080   (Mixed Content 차단)
```

**목표**

```
Vercel Frontend                 Backend EC2
https://enjoy-trip-six           ┌───────────────────────────────┐
   .vercel.app   ──────HTTPS────▶│ Nginx :443  (Let's Encrypt)   │
                                 │   └─ proxy ─▶ Spring Boot :8080│ (Docker, 컨테이너)
                                 └───────────────────────────────┘
                                          │
                                   DB EC2 (PostgreSQL) / AWS S3
```

---

## 3. 사전 준비물 (확인 절차)

EC2 SSH 접속 후 또는 AWS 콘솔에서 아래를 확인한다.

1. **Backend EC2 Public IP 확인**
   ```bash
   curl -s http://checkip.amazonaws.com    # EC2 안에서 자기 공인 IP 확인
   ```
   또는 AWS 콘솔 → EC2 → Instances → 해당 인스턴스 → Public IPv4 address.

2. **Elastic IP 연결 여부 확인 (강력 권장)**
   - AWS 콘솔 → EC2 → **Elastic IPs**.
   - Backend EC2에 EIP가 연결돼 있는지 확인. 없으면 할당(Allocate) 후 Associate.
   - ⚠️ EIP가 없으면 인스턴스 재시작 시 IP가 바뀌고 DNS A 레코드가 깨진다. **반드시 EIP 권장.**

3. **사용할 도메인 / API 서브도메인 결정**
   - 보유 도메인 하위에 `api` 서브도메인을 쓴다. 예: `api.enjoytrip.io`.

4. **DNS A 레코드 계획**: `api.example.com → Backend EC2 Elastic IP` (4번 섹션).

5. **보안 그룹 인바운드 규칙** (5번 섹션).

6. **백엔드 health 엔드포인트 유무**: 이 프로젝트는 `actuator` 가 없을 수 있다.
   확인용으로는 `/`(또는 swagger off 상태면 404가 정상) / `GET /api/...` 공개 엔드포인트를 쓴다.
   `curl` 로 8080이 응답(연결 성공)만 하면 프록시 대상은 살아있는 것이다.

---

## 4. DNS 설정

도메인 관리 콘솔(가비아/Cloudflare/Route53 등)에서 **A 레코드** 추가:

| 항목 | 값 |
|------|-----|
| Type | A |
| Host/Name | `api` |
| Value | Backend EC2 **Elastic IP** |
| TTL | 300 (또는 기본값) |

> Cloudflare를 쓴다면 처음엔 **Proxy(주황 구름)를 끄고 "DNS only"(회색)** 로 둔다.
> 그래야 Let's Encrypt HTTP-01 검증과 원본 인증서 발급이 깔끔하다. (이후 필요 시 켠다.)

**전파 확인**

```bash
# Windows / 공통
nslookup api.example.com
# 결과의 Address 가 EC2 Elastic IP 와 같으면 OK

# Linux/Mac(dig 있으면)
dig +short api.example.com
```

전파에 수 분~수십 분 걸릴 수 있다. IP가 맞게 나올 때까지 기다린 뒤 다음 단계로.

---

## 5. Backend EC2 보안 그룹 설정

목표 인바운드 규칙:

| 포트 | 프로토콜 | 소스 | 용도 |
|------|----------|------|------|
| 22 | TCP (SSH) | **내 IP만** (`x.x.x.x/32`) | 관리 접속 |
| 80 | TCP (HTTP) | `0.0.0.0/0` | Certbot 검증 + HTTP→HTTPS 리다이렉트 |
| 443 | TCP (HTTPS) | `0.0.0.0/0` | 실제 API 트래픽 |
| 8080 | TCP | **(최종) 닫기** | Nginx가 내부에서만 접근 |

진행 순서:

1. **Nginx 검증 전까지만** 8080을 임시로 열어 직접 테스트해도 된다(`내 IP/32` 로만 권장).
2. Nginx + HTTPS 가 정상 동작하면 **8080 인바운드 규칙을 삭제**한다.
   외부에선 443만 열려 있고, 8080은 EC2 내부 `127.0.0.1` 로만 접근된다.

> 추가 하드닝(선택): docker-compose 의 포트 바인딩을 `127.0.0.1:8080:8080` 으로 바꾸면
> 보안 그룹 설정과 무관하게 호스트 외부 노출이 차단된다. (10·11번 참고)

---

## 6. Nginx 설치 (Ubuntu)

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx        # active (running) 확인
```

브라우저에서 기본 페이지 확인 (DNS 전파 후):

```
http://api.example.com
```

→ "Welcome to nginx!" 가 보이면 80 포트 + DNS 가 정상.

---

## 7. Reverse Proxy 설정

레포의 예시 파일을 복사해서 쓴다: `infra/nginx/enjoy-trip-api.conf`.

```bash
# 레포를 EC2에 받아둔 경우(예: ~/enjoy-trip)
sudo cp ~/enjoy-trip/infra/nginx/enjoy-trip-api.conf /etc/nginx/sites-available/enjoy-trip-api

# 또는 직접 편집
sudo nano /etc/nginx/sites-available/enjoy-trip-api
```

파일 안의 `server_name api.example.com;` 을 **본인 실제 도메인**으로 바꾼다.

핵심 내용(요약):

```nginx
server {
    listen 80;
    server_name api.example.com;          # ← 실제 도메인으로 교체
    client_max_body_size 50m;             # 백엔드 multipart 한도(50MB)와 일치

    # SSE(실시간 알림) 전용: 버퍼링 끄기 (/api/groups/{id}/stream)
    location ~ ^/api/groups/[^/]+/stream$ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;              # ← SSE 핵심
        proxy_read_timeout 3600s;
    }

    # 일반 API / OAuth
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # ← Spring forward-headers 가 https 복원
    }
}
```

> **왜 SSE 블록이 따로 있나?** 이 앱은 `/api/groups/{groupId}/stream` 에서
> `text/event-stream` 롱커넥션으로 실시간 알림을 보낸다. Nginx 기본 버퍼링이 켜져 있으면
> 이벤트가 지연되거나 끊긴다. 그래서 `proxy_buffering off` 가 필수다.

심볼릭 링크 + 기본 사이트 비활성화 + 검사 + 리로드:

```bash
sudo ln -s /etc/nginx/sites-available/enjoy-trip-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default      # 기본 사이트와 충돌 방지
sudo nginx -t                                    # syntax is ok / test is successful
sudo systemctl reload nginx
```

확인 (아직 HTTP):

```bash
curl http://api.example.com/                     # 백엔드 응답(404/200 등)이 오면 프록시 OK
curl http://api.example.com/actuator/health      # 없으면 404 — 정상, 아래 대체 사용
# 대체: 공개 GET 엔드포인트나 / 로 "연결되는지"만 확인
```

---

## 8. SSL 인증서 발급 (Let's Encrypt Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com          # ← 실제 도메인
```

진행 중 입력:

- **이메일**: 만료 알림용 본인 이메일.
- **약관 동의**: `A` (Agree).
- **EFF 메일 수신**: `Y`/`N` 자유.
- **HTTP→HTTPS 리다이렉트**: **리다이렉트(2번)** 선택 권장. Certbot이 80 블록에
  `return 301 https://...` 와 443 ssl 블록을 자동으로 써 넣는다.

발급/상태 확인:

```bash
sudo certbot certificates
sudo systemctl status nginx
curl -I https://api.example.com                  # HTTP/2 200 또는 404 (TLS 정상)
```

자동 갱신 테스트:

```bash
sudo certbot renew --dry-run                     # "Congratulations" 나오면 자동갱신 OK
```

> Certbot은 systemd 타이머로 자동 갱신을 등록한다. `systemctl list-timers | grep certbot` 로 확인.

---

## 9. Vercel 환경 변수 변경

프론트가 백엔드를 새 HTTPS 도메인으로 호출하도록 바꾼다.

```
Vercel → 프로젝트 → Settings → Environment Variables → (Production)
  VITE_API_BASE_URL = https://api.example.com
→ Save → Deployments → 최신 배포 Redeploy (캐시 없이)
```

- 레포의 `frontend/.env.production` 에도 placeholder가 있지만 **Vercel 대시보드 값이 최종 소스**다.
- `VITE_` 변수는 **빌드 타임**에 박힌다. 값 변경 후 **반드시 Redeploy** 해야 반영된다.

---

## 10. Kakao / Google OAuth Redirect URI 변경

이 앱은 **Spring Boot OAuth2 Client** 를 쓴다(`{baseUrl}/login/oauth2/code/{registrationId}`).
따라서 Redirect URI는 **프론트가 아니라 백엔드 API 도메인** 기준이다.

등록할 Redirect URI:

```
https://api.example.com/login/oauth2/code/kakao
https://api.example.com/login/oauth2/code/google
```

**카카오 Developers**
```
내 애플리케이션 → 카카오 로그인 → Redirect URI
  + https://api.example.com/login/oauth2/code/kakao
플랫폼 → Web 사이트 도메인:
  + https://api.example.com
  + https://enjoy-trip-six.vercel.app
```

**Google Cloud Console**
```
APIs & Services → Credentials → OAuth 2.0 Client ID
Authorized redirect URIs:
  + https://api.example.com/login/oauth2/code/google
Authorized JavaScript origins:
  + https://enjoy-trip-six.vercel.app
  + https://api.example.com
```

> ⚠️ `{baseUrl}` 이 `https://api.example.com` 으로 정확히 복원되려면 **11번의 prod 프로필
> (forward-headers-strategy) 이 반드시 켜져 있어야** 한다. 안 그러면 redirect_uri 가
> `http://...:8080/...` 로 생성돼 OAuth 가 깨진다.

---

## 11. 백엔드 설정 확인 (중요 — 두 가지 필수 변경)

이 프로젝트는 이미 `application-prod.yml` 에 HTTPS용 설정이 들어 있지만,
**현재 prod 프로필이 활성화돼 있지 않았다.** 이번 작업에서 아래를 반영했다.

### (1) prod 프로필 활성화

`application-prod.yml` 은 다음을 제공한다.

```yaml
server:
  forward-headers-strategy: framework   # Nginx의 X-Forwarded-* 로 https/도메인 복원
  servlet:
    session:
      cookie:
        secure: true
auth:
  refresh-cookie-secure: true
  refresh-cookie-same-site: ${REFRESH_COOKIE_SAME_SITE:None}
springdoc: { api-docs: { enabled: false }, swagger-ui: { enabled: false } }
```

→ `docker-compose.backend.yml` 에 `SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-prod}` 를 추가해
   **기본으로 prod 프로필이 적용**되도록 했다. `.env` 에서 `SPRING_PROFILES_ACTIVE=prod` 로 명시해도 된다.

### (2) Refresh 쿠키 SameSite=None (교차 사이트 필수)

프론트(`*.vercel.app`)와 백엔드(`api.example.com`)는 **서로 다른 사이트**다.
`reissue`/`logout` 시 refresh 쿠키가 **교차 사이트 XHR** 로 전송되려면
`SameSite=None; Secure` 여야 한다. (기존 하드코딩 `Lax` 였음 → 만료 후 조용히 로그아웃됨.)

- `AuthController` 의 쿠키 생성을 `auth.refresh-cookie-same-site` 설정값으로 변경(기본 `Lax`,
  prod 에서 `None`). 로컬/단일 Origin 환경은 영향 없음.
- `.env` 에 `REFRESH_COOKIE_SAME_SITE=None`, `REFRESH_COOKIE_SECURE=true` 를 둔다.

### (3) CORS

`CORS_ALLOWED_ORIGINS=https://enjoy-trip-six.vercel.app` (콤마로 여러 개 가능).
`allowCredentials(true)` 라서 와일드카드(`*`)는 불가 — 정확한 Origin을 적는다.

> `.env.example` 에 위 값들을 반영했다. **실제 비밀값은 EC2의 `.env` 에 직접 채운다.**

---

## 12. 테스트 방법

### Backend EC2 내부

```bash
curl http://localhost:8080/                  # 백엔드 직접(연결되면 OK, 404 가능)
curl http://127.0.0.1:8080/
curl http://api.example.com/                 # Nginx 경유(HTTP, 리다이렉트면 301)
curl -I https://api.example.com/             # Nginx 경유(HTTPS)
docker compose -f docker-compose.backend.yml logs --tail=50 backend
```

### 내 PC

```bash
curl -I https://api.example.com/             # HTTP/2 200|404 + 유효 인증서
```

### 브라우저

```
https://api.example.com         → 자물쇠(유효 인증서) 확인
https://enjoy-trip-six.vercel.app → 실제 앱
```

확인 체크리스트:

- [ ] 카카오 로그인 **시작** 가능 (→ kauth.kakao.com 으로 이동)
- [ ] 카카오 로그인 후 **callback 정상** (→ `https://api.example.com/login/oauth2/code/kakao` →
      프론트 `/oauth/callback?code=...` 로 복귀)
- [ ] 구글 로그인 시작/콜백 정상
- [ ] DevTools Network: `oauth/exchange`, `reissue`, 일반 API 가 모두
      `https://api.example.com` 으로 가는지
- [ ] `exchange`/`reissue` 응답의 `Set-Cookie` 에 `SameSite=None; Secure; HttpOnly` 표시
- [ ] 액세스 토큰 만료 후 `reissue` 가 **쿠키를 싣고** 성공(자동 로그아웃 안 됨)
- [ ] 실시간 알림(SSE) 수신 — `/api/groups/{id}/stream` 이 끊기지 않고 이벤트 도착
- [ ] **Mixed Content 경고/차단이 사라졌는지**

---

## 13. 문제 해결 (디버깅)

### Nginx
```bash
sudo systemctl status nginx
sudo nginx -t
sudo journalctl -u nginx -n 100 --no-pager
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 백엔드 컨테이너
```bash
docker compose -f docker-compose.backend.yml ps
docker compose -f docker-compose.backend.yml logs -f backend
# prod 프로필이 실제로 켜졌는지: 로그에 "The following 1 profile is active: prod"
docker compose -f docker-compose.backend.yml exec backend printenv SPRING_PROFILES_ACTIVE
```

### 포트
```bash
sudo ss -tulpn | grep -E ':80|:443|:8080'
```

### DNS / 인증서
```bash
nslookup api.example.com
sudo certbot certificates
sudo certbot renew --dry-run
```

### 증상별 원인
| 증상 | 원인 / 확인 |
|------|-------------|
| `502 Bad Gateway` | 백엔드 컨테이너 down 또는 8080 미바인딩. `docker compose ps`, `ss -tulpn` |
| OAuth redirect 가 `http://...:8080` 로 감 | prod 프로필 미적용(forward-headers off). 11-(1) 확인 |
| 로그인은 되는데 새로고침/만료 후 로그아웃 | refresh 쿠키 `SameSite=Lax`/`Secure` 누락. 11-(2) 확인 |
| API CORS 차단 | `CORS_ALLOWED_ORIGINS` 에 Vercel Origin 정확히(슬래시 없이) |
| SSE 알림 안 옴/지연 | Nginx `proxy_buffering off` 누락. 7번 SSE 블록 확인 |
| 인증서 발급 실패 | 80 포트 차단 / DNS 미전파 / Cloudflare Proxy ON. 4·5번 확인 |
| 업로드 413 | `client_max_body_size 50m` 누락 |

---

## 14. 롤백 방법

HTTPS 적용 중 막히면 임시로 되돌릴 수 있다(권장 최종 형태는 HTTPS).

1. **Vercel**: `VITE_API_BASE_URL` 을 다시 `http://BACKEND_EC2_PUBLIC_IP:8080` 으로 → Redeploy.
   - ⚠️ 이 경우 HTTPS 프론트 → HTTP 백엔드라 **Mixed Content 로 다시 막힌다.** (브라우저 한계)
   - 즉 진짜 롤백이 되려면 프론트도 HTTP 여야 하므로, 실질적으로 임시 우회는 어렵다.
2. **OAuth**: Redirect URI를 기존 HTTP IP 형태로 되돌려야 할 수 있다.
3. **백엔드**: `.env` 의 `SPRING_PROFILES_ACTIVE` 를 빼고(기본 dev), `REFRESH_COOKIE_SECURE=false`,
   `REFRESH_COOKIE_SAME_SITE=Lax` 로 되돌린 뒤 컨테이너 재기동.
4. 보안 그룹에서 8080 을 다시 임시 오픈.

> 결론: Mixed Content는 브라우저 정책이라 우회가 어렵다. **정방향(HTTPS 구성 완료)이 정답**이며,
> 롤백은 디버깅 시간을 벌기 위한 임시 조치로만 사용한다.

---

## 부록 A. EC2에서 실행할 명령 요약

```bash
# 0) 코드 최신화 (prod 프로필/쿠키 변경 반영)
cd ~/enjoy-trip && git pull

# 1) .env 채우기 (실제 비밀값) — 아래 값 포함
#   SPRING_PROFILES_ACTIVE=prod
#   CORS_ALLOWED_ORIGINS=https://enjoy-trip-six.vercel.app
#   FRONTEND_BASE_URL=https://enjoy-trip-six.vercel.app
#   REFRESH_COOKIE_SECURE=true
#   REFRESH_COOKIE_SAME_SITE=None

# 2) 백엔드 재빌드/기동
docker compose -f docker-compose.backend.yml up -d --build

# 3) Nginx
sudo apt update && sudo apt install -y nginx
sudo cp ~/enjoy-trip/infra/nginx/enjoy-trip-api.conf /etc/nginx/sites-available/enjoy-trip-api
sudo sed -i 's/api\.example\.com/api.실제도메인/g' /etc/nginx/sites-available/enjoy-trip-api  # 또는 nano 로 수정
sudo ln -s /etc/nginx/sites-available/enjoy-trip-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 4) 인증서
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.실제도메인
sudo certbot renew --dry-run
```

## 부록 B. 보안 메모

- `.env.example` 에 한때 실제 키들이 커밋돼 있었다. **AWS Access Key / OAuth Secret /
  외부 API Key / JWT Secret 은 즉시 회전(rotate)** 하고, 새 값은 EC2 `.env` 에만 둔다.
  example 파일에는 placeholder 만 남긴다.
- HTTPS 적용 후 `REFRESH_COOKIE_SECURE=true` 가 아니면 `SameSite=None` 쿠키가
  브라우저에서 거부된다(둘은 세트).
