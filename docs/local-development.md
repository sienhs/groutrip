# 로컬 개발 가이드

로컬은 **DB만 Docker로 띄우고, 백엔드/프론트는 직접 실행**하는 구조다.

```text
Local PC
├─ PostgreSQL : Docker Compose (docker-compose.db.yml)
├─ Backend    : ./gradlew bootRun
└─ Frontend   : npm run dev
```

배포(EC2/Vercel)와는 환경변수 파일로 분리한다. 로컬은 `.env.local`, 배포는 `.env`(EC2) / Vercel 환경변수.

---

## 1. 환경 변수 파일 준비

```bash
# 루트 로컬 env
cp .env.local.example .env.local

# 프론트 로컬 env
cp frontend/.env.local.example frontend/.env.local
```

그다음 루트 `.env.local`에서 최소 다음 값을 채운다.

- `DB_PASS` — 로컬 DB 비밀번호(원하는 값)
- `JWT_SECRET` — 32바이트 이상 랜덤 문자열
- `AWS_*` — S3 사용 시 실제 버킷/키 (이미지 업로드를 로컬에서 테스트하려면 필요)
- (선택) `GOOGLE_OAUTH_*` / `KAKAO_OAUTH_*` — **이 앱은 SNS 전용 로그인**이라, 로컬에서 로그인하려면 둘 중 최소 하나가 실제 값이어야 한다. 미설정이면 백엔드는 뜨지만 로그인은 안 된다.

> `.env.local`, `frontend/.env.local` 은 절대 커밋하지 않는다(`.gitignore` 처리됨).

---

## 2. 로컬 PostgreSQL 실행

```bash
docker compose --env-file .env.local -f docker-compose.db.yml up -d
```

상태/로그 확인:

```bash
docker compose --env-file .env.local -f docker-compose.db.yml ps
docker compose --env-file .env.local -f docker-compose.db.yml logs -f postgres
```

`POSTGRES_DB/USER/PASSWORD` 는 `.env.local` 의 `DB_NAME/DB_USER/DB_PASS` 를 사용한다. 데이터는 `postgres_data` 볼륨에 유지된다.

---

## 3. 백엔드 실행

백엔드는 `application.yml` 이 `${DB_URL}`, `${JWT_SECRET}` 등 **환경 변수**를 읽으므로, 실행 셸에 `.env.local` 을 먼저 로드해야 한다.

### Git Bash / macOS / Linux

```bash
set -a
source .env.local
set +a

cd backend
./gradlew bootRun
```

### Windows PowerShell

PowerShell 에서는 `source` 가 없으므로 아래처럼 `.env.local` 을 읽어 프로세스 환경 변수로 주입한 뒤 실행한다.

```powershell
Get-Content .env.local | Where-Object { $_ -match '^\s*[^#].*=' } | ForEach-Object {
  $name, $value = $_ -split '=', 2
  [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), 'Process')
}

cd backend
./gradlew bootRun
```

> 참고: `application.yml` 은 `spring.config.import` 로 `.env`(있으면)도 선택적으로 읽지만, OS 환경 변수가 우선순위가 높다. 로컬에서는 위처럼 `.env.local` 을 환경 변수로 로드하는 방식을 사용한다.

---

## 3-1. (선택) 로컬 이미지 저장 — MinIO

아바타/그룹 사진/숙소 사진 업로드를 로컬에서 테스트하려면 S3가 필요하다. 실제 AWS S3 버킷을 쓰거나, **로컬 MinIO**(권장, AWS 불필요)를 띄운다.

```bash
docker compose --env-file .env.local -f docker-compose.minio.yml up -d
```

그리고 `.env.local`에 다음을 설정:

```env
AWS_S3_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin          # = MinIO 로그인 계정
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET_NAME=enjoy-trip-files   # 앱이 없으면 자동 생성
```

- 콘솔: http://localhost:9001 (위 계정으로 로그인)
- 버킷은 백엔드가 자동 생성한다(MinIO는 CreateBucket 허용).
- 실제 AWS S3를 쓸 경우 `AWS_S3_ENDPOINT`는 비우고, **버킷이 미리 존재**해야 하며 IAM에 `s3:PutObject/GetObject`(+버킷 자동생성을 원하면 `s3:CreateBucket`) 권한이 있어야 한다. 권한/버킷이 없으면 업로드가 500이 난다.

## 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env.local` 의 `VITE_API_BASE_URL=http://localhost:8080` 으로 로컬 백엔드에 붙는다.

---

## 5. 접속 주소

```text
Frontend : http://localhost:5173
Backend  : http://localhost:8080
Database : localhost:5432
```

---

## 6. 로컬 DB 초기화 (주의)

비밀번호가 꼬이거나 스키마가 깨져 **로컬 DB를 완전히 비우고 다시 만들 때만** 사용한다.

```bash
docker compose --env-file .env.local -f docker-compose.db.yml down -v
docker compose --env-file .env.local -f docker-compose.db.yml up -d
```

> ⚠️ `down -v` 는 `postgres_data` 볼륨(= DB 데이터)을 **삭제**한다. **로컬 개발 DB에서만** 사용할 것. EC2 운영 DB에는 절대 쓰지 말 것.

---

## 7. 로컬 vs EC2 배포 설정 차이

같은 변수 이름을 쓰되, 값만 환경별로 다르다.

```text
Local (.env.local)
DB_URL=jdbc:postgresql://localhost:5432/enjoy_trip
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_BASE_URL=http://localhost:5173
REFRESH_COOKIE_SECURE=false

Backend EC2 (.env)
DB_URL=jdbc:postgresql://DB_EC2_PRIVATE_IP:5432/enjoy_trip
CORS_ALLOWED_ORIGINS=https://enjoy-trip-six.vercel.app
FRONTEND_BASE_URL=https://enjoy-trip-six.vercel.app

Vercel (Environment Variables)
VITE_API_BASE_URL=http://BACKEND_EC2_PUBLIC_IP:8080
```

배포 구조:

```text
Vercel        → frontend
Backend EC2   → Spring Boot Docker container (docker-compose.backend.yml, .env)
DB EC2        → PostgreSQL Docker container (docker-compose.db.yml, .env)
S3            → 파일/이미지 저장
```

---

## 8. 커밋 금지 목록

다음은 **절대 Git에 올리지 않는다.**

- `.env`, `.env.local`
- `backend/.env`, `backend/.env.local`, `frontend/.env.local`
- 실제 AWS 키, `JWT_SECRET`, DB 비밀번호, OAuth 시크릿

예시 파일(`*.example`)만 커밋한다.
