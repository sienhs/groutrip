# 그룹여행협업플랫폼_요구사항명세서_v1.1

## 그룹 여행 협업 플랫폼

## 요구사항 명세서 (Software Requirements Specification)

벤치마크 Wanderlog (국내 차별화 버전)
차별점 그룹 의사결정 •성향 매칭 • 카카오 비용정보 • 구글 숙소정보 • 송금 딥링크 • SSE 인원 / 기간 2 인 / 2주

외부 인터페이스 Google Maps Places (장소 검색) • 카카오 모빌리티 (이동/비용) • TourAPI 버전 v 1.0

## 목차

1. 개요
2. 외부 인터페이스 전략 (변경사항 포함)
3. 기능 요구사항
3.1 인증 / 계정 (FR-AUTH)
3.2 사용자 성향 설문 (FR-SURVEY)
3.3 여행 그룹 (FR-GROUP)
3.4 장소 보관함 (FR-PLACE)
3.5 일정 (FR-SCHEDULE)
3.6 일정 투표 (FR-VOTE)
3.7 비용 정산 (FR-EXPENSE)
3.8 실시간 동기화 (FR-SSE)
3.9 홈 / 마이페이지 / 추천 (FR-HOME / FR-MYPAGE / FR-RECOMMEND)
4. 비기능 요구사항
5. 데이터 요구사항
6. UI / UX 요구사항
7. 권한 매트릭스
8. 상태 전이도
9. 메시지 카탈로그
10. 제약사항
11. 추적 가능성 매트릭스

## 1. 개요

본 문서는 그룹 여행 협업 플랫폼의 모든 기능적 • 비기능적 요구사항을 정의한다. 기능 명세서(v1.0)의 후속 문서로, 각 기능에 대해 사용자 스토리, 상세 규칙, 검증 조건, 권한, 예외 처리, 상태 전이까지 추적 가능한 단위로 분해한다.

## v1.1 주요 변경사항

- 모든 장소 검색을 Google Maps Places API로 통합한다. 숙소, 맛집, 명소, 카페, 쇼핑 등 카테고리에 관계없이 단일 소스 로 일원화. 카테고리 필터링은 Google의 includedType 파라미터로 처리.
- 카카오 API는 이동 시간 • 비용 계산 전용으로 한정한다. 카카오 모빌리티(자동차/대중교통/도보 길찾기)에서 톨비, 연료 비, 택시비, 대중교통 운임을 가져와 일정과 정산에 자동 반영.
- 이전 버전(v1.0)에 있던 카카오맵 키워드 검색 사용은 전면 제거되었으며, FR-PLACE 의 이중 소스 분기 로직도 단순화되 었다.

요구사항 ID 명명 규칙: FR-{도메인}-{번호} (기능), NFR-{카테고리} (비기능), EI-{번호} (외부 인터페이스). 각 차별점과 요구사항의 매핑은 11 장(추적 가능성)을 참조한다.

## 2. 외부 인터페이스 전략

본 시스템은 3 개의 외부 데이터 소스를 명확히 분리된 역할로 사용한다. 카카오와 Google의 책임이 겹치지 않도록 통합 전략 을 채택했다.

| 소스 | 담당 영역 | 사용 API | 비고 |
| --- | --- | --- | --- |
| Google Maps Places 통합 | 모든 장소 검색 (숙소•맛집•명소•카페•쇼핑 등 전체) | Places Text Search Place Details Place Photos | 카테고리는 includedType 으로 필터링. 단일 소스 일원화 |
| 카카오 모빌리티 전담 | 이동 시간 •비용 계산 전용 | 자동차 길찾기 (시간/거리/톨비/연료 비/택시비) 대중교통 길찾기 (시간/운임) | 장소 검색에는 사용하지 않음 |
| TourAPI (한국관광공사) | 관광지 추천 (성향 기반) | 지역 기반 관광 정보 | SHOULD 단계. 무료 공공 API |

설계 원칙: “정보는 Google, 비용•이동은 Kakao” - 각 API의 강점에 따라 책임을 분리하여 데이터 정합성과 운영 비용 을 동시에 관리한다.

## El-01 Google Maps Places (모든 장소 검색) 통합 소스

본 시스템의 모든 장소 데이터는 Google Maps Platform의 Places API에서 가져온다. 숙소뿐 아니라 맛집, 명소, 카페, 쇼핑 등 카테고리에 관계없이 동일한 API를 사용하며, 카테고리 분기는 includedType 파라미터로만 처리한다.

## El-01-A 사용 API

- Text Search: POST https://places.googleapis.com/v1/places:searchText

요청 예: { “textQuery”: “강남 카페”, “languageCode”: “ko”, “regionCode”: “kr” }

- 카테고리 필터: “includedType”: “{type}” (선택)

ㅇ 필드 마스크 (호출 비용 최적화): places.id, places.displayName, places.formattedAddress, places.location, places.types, places.rating, places.userRatingCount, places.priceLevel, places.photos, places.googleMapsUri

- Place Details: GET https://places.googleapis.com/v1/places/{placeId}
- 리뷰, 영업시간, 전화번호 등 상세 정보가 필요할 때만 호출
- Place Photos: GET https://places.googleapis.com/v1/{photoName}/media
- 썸네일 이미지 (최대 너비/높이 지정)

## EI-01-B includedType 매핑 (카테고리 → Google 타입)

| 우리 카테고리 | Google includedType | 비고 |
| --- | --- | --- |
| 숙소 | lodging | 호텔, 모텔, 펜션, 게스트하우스 통합 |
| 맛집 | restaurant | 일반 음식점 |
| 카페 | cafe | 커피숍, 디저트 |
| 명소 | tourist_attraction | 관광 명소, 박물관, 공원 포함 |
| 쇼핑 | shopping_mall 또는 store | 대형 쇼핑몰 / 일반 상점 |
| 기타 | (필터 없음) | 전체 카테고리 검색 |

## EI-01-C 인증 및 호출 위치

- 인증: Google Cloud Platform API Key, 헤더 X-Goog-Api-Key: {key}
- 호출 위치: BE 프록시 전용. 키는 BE 환경 변수, FE 노출 금지
- 키 보호: GCP Console에서 IP 제한 + API 제한 (Places API만 허용)
- 필드 마스크를 항상 명시하여 응답 크기 최소화 (Google은 필드별 과금)

## El-01-D 비용 관리

- Google Maps Platform은 종량제 (월 $\$ 200$ 무료 크레딧 제공)
- Text Search: ~$32 / 1000회 (기본 필드 기준)
- Place Details: ~$17 / 1000회
- 장소 검색을 단일 소스로 통합함에 따라 호출량이 증가하므로 캐시 정책이 더욱 중요
- 같은 (검색어, 지역, 카테고리) 조합은 24 시간 DB 캐시 (강력 적용)
- Place Details는 보관함 추가 시점에만 호출 (검색 결과에서는 호출 안 함)
- 썸네일 URL을 DB에 캐시하여 동일 이미지 재요청 방지
- GCP Budget Alert 설정: 월 $\$ 50$ 도달 시 알림, $\$ 150$ 도달 시 강제 차단

## EI-01-E 응답 매핑

```
{
    "placeId": "ChIJ...", // Google Place ID
    "name": "OO시ᄀ다ᄋ",
    "address": "서우ᄅ트ᄀ벼ᄅ시 가ᄋ나ᄆ구 ...",
    "lat": 37.5..., "lng": 127....,
    "types": ["restaurant", "food"],
    "category": "마ᄉ지ᄇ", // 우리 자체 카테고리 (includedType 여ᄀ매피ᄋ)
    "rating": 4.3,
    "ratingCount": 1280,
    "priceLevel": "PRICE_LEVEL_MODERATE", // FREE | INEXPENSIVE | MODERATE | EXPENSIVE |
VERY_EXPENSIVE
    "photoUrl": "...",
    "googleMapsUri": "https://maps.google.com/?cid=..."
}
```

## El-02 카카오 모빌리티 (이동 시간 + 비용 전용)

카카오 API의 사용은 이동 시간 및 비용 계산에 한정한다. 장소 검색에는 사용하지 않는다. 본 시스템의 핵심 차별점인 “이동 비 용 자동 정산”은 이 API의 응답에 전적으로 의존한다.

## EI-02-A 자동차 길찾기

- 엔드포인트: GET https://apis-navi.kakaomobility.com/v1/directions
-요청 파라미터: origin={lng,lat}, destination={lng,lat}, priority=RECOMMEND

## 응답에서 추출하는 비용 정보

```
- summary.fare.toll - 토ᄅ게이트 비요ᄋ (워ᄂ)
- summary.fare.taxi - 예사ᄋ 태ᄀ시 요그ᄆ (워ᄂ)
- summary.distance + 펴ᄋ규ᄂ 여ᄂ비 가저ᄋ → 예사ᄋ 여ᄂ료비 자체 계사ᄂ (예: 13km/L, 휘바ᄅ유 1,700워ᄂ/L 기주ᄂ)
- summary.duration - 소요 시가ᄂ (초)
```

## EI-02-B 대중교통 길찾기

- 방식 1 (권장): 카카오 모빌리티의 대중교통 API 사용 (요금 + 시간 + 환승 정보)
- 방식 2 (대안): 카카오에서 대중교통 운임 API 접근이 어려울 경우 ODsay LAB 또는 TMap 대중교통 API로 전환
- 응답에서 추출: 운임(원), 소요 시간(분), 환승 횟수, 주요 경로 (지하철/버스 라인명)
- 검토 필요 개발 1 일차에 실제 API 접근성 확인 후 확정

## El-02-C 이동 수단 선택

- 일정 카드 사이에 3개 탭으로 표시: 자동차 / 대중교통 / 도보
- 각 탭 선택 시 시간 + 비용 + 경로 요약 표시
- 사용자가 선택한 수단은 schedule.transport_mode 로 저장
- 선택한 수단의 비용이 정산 시스템에 자동 반영 가능 (FR-EXPENSE-07)

## EI-02-D 캐시 전략

- 같은 (출발지, 도착지, 수단) 쌍은 1 시간 캐시
- 일정 수정 시 영향받는 쌍만 재계산
- API 호출량 모니터링 (일일 한도의 $80 \%$ 도달 시 알림)

## EI-03 TourAPI (관광지 추천)

- 인증: 서비스 키 (Query Parameter)
- 주요 엔드포인트: areaBasedList (지역 기반 관광지 목록), detailCommon (상세)
- 호출 위치: BE
- 캐시: 같은 (지역, 카테고리) 24 시간 DB 캐시
- 역할: 그룹 성향 기반 추천(SHOULD)에만 사용. 검색 흐름과는 분리

## EI-04 토스 / 카카오페이 송금 딥링크

- 본 시스템은 URL Scheme 생성만 담당 (실제 송금 인증/실행은 사용자의 모바일 앱에서 수행)
- 토스: supertoss://send?amount={amount}&msg={memo}
- 카카오페이: kakaopay://send?amount={amount}
- PC에서는 위 URL을 인코딩한 QR 코드 표시
- 송금 성공 여부는 사용자가 직접 체크 (FR-EXPENSE-06)

## 3. 기능 요구사항

## 3.1 인증 / 계정 (FR-AUTH)

## FR-AUTH-01 회원가입

새로운 사용자로서, 이메일과 비밀번호로 계정을 만들고 싶다.

- 입력 필드: 이름, 이메일, 비밀번호, 비밀번호 확인
- 이메일은 시스템 전체에서 유일해야 함
- 비밀번호는 영문 + 숫자 + 특수문자 포함 8 자 이상
- BCrypt(cost 10) 해시 후 저장. 평문 저장 금지
- 이름은 $2 \sim 20$ 자, 한글•영문•숫자 허용
- 가입 성공 시 로그인 페이지로 이동 (자동 로그인 없음)
- 로그인 직후 성향 설문(FR-SURVEY-01)로 자동 유도

| 필드 | 규칙 | 에러 메시지 |
| --- | --- | --- |
| 이메일 | RFC 5322, 254자 이하 | 이메일 형식이 올바르지 않습니다. |
| 이메일 중복 | DB unique | 이미 사용 중인 이메일입니다. |
| 비밀번호 | 정규식 매칭 | 영문•숫자•특수문자를 각각 1 개 이상 포함해야 합니다. |
| 이름 | 2~20자 | 이름은 $2 \sim 20$ 자여야 합니다. |

## FR-AUTH-02 로그인

가입한 사용자로서, 이메일/비밀번호로 로그인하여 내 그룹에 접근하고 싶다.

- 성공 시 Access Token (30분) + Refresh Token (7일) 발급
- Refresh Token은 HttpOnly + Secure 쿠키로 저장
- Access Token은 메모리(Zustand)에만 저장. localStorage 금지
- 로그인 5 회 연속 실패 시 5 분간 잠금 (Rate Limiting, IP 기준)
- 잘못된 이메일/비밀번호 구분 없이 동일 에러 메시지 (보안)

## FR-AUTH-03 토큰 재발급

- Access Token 만료 시 Refresh Token으로 자동 재발급
- 프론트엔드 axios 인터셉터가 401 응답을 받으면 자동 호출
- Refresh Token이 DB 저장값과 다르면 탈취로 간주, 강제 로그아웃
- Refresh Token 만료 시 로그인 페이지로 리다이렉트

## FR-AUTH-04 로그아웃

- Refresh Token 쿠키 삭제
- DB의 Refresh Token 레코드 삭제
- FE 메모리의 Access Token 초기화
- 로그인 페이지로 리다이렉트

## FR-AUTH-05 비밀번호 변경

- 현재 비밀번호 검증 후 새 비밀번호로 변경
- 새 비밀번호는 회원가입과 동일한 규칙 적용
- 현재 비밀번호와 동일하면 거부
- 변경 성공 시 모든 디바이스의 Refresh Token 무효화 (재로그인 강제)

## FR-AUTH-06 계정 탈퇴

- 비밀번호 재입력 확인 후 탈퇴
- 사용자가 Owner인 그룹이 있으면 → 다른 멤버에게 Owner 위임하거나 그룹 해체 안내
- 탈퇴 시 개인정보 즉시 익명화 (이름 → “탈퇴한 사용자”), 작성 기록은 보존
- 30일 후 Hard Delete 배치

## 3.2 사용자 성향 설문 (FR-SURVEY)

## FR-SURVEY-01 설문 응답

사용자로서, 내 여행 성향을 입력하여 그룹원과의 매칭 정보를 얻고 싶다.

- 회원가입 직후 자동 진입, “나중에” 버튼으로 스킵 가능
- 마이페이지에서 언제든 재진행 가능
- 8~12문항, 5점 척도 (1: 매우 그렇지 않다 ~ 5: 매우 그렇다)
- 모든 문항 응답 필수
- 5차원 벡터로 환산: {activity, food, pace, urbanNature, timePref}
- 각 차원은 0.0 ~ 1.0 float (가중합 정규화)
- 이전 응답이 있어도 덮어쓰기 (이력 보관 안 함)

## FR-SURVEY-02 내 성향 조회

- 5차원 벡터를 레이더 차트로 시각화
- 각 차원에 대한 한 줄 설명 (“당신은 액티비티 $80 \%$ 형 여행자입니다”)
- “재설문하기” 버튼 제공

## FR-SURVEY-03 그룹 성향 매칭

- 그룹 페이지에서 멤버들의 평균 성향 벡터 표시
- 멤버 간 코사인 유사도 계산 → “성향 일치율 $\mathrm{N} \%$” 표시
- 가장 충돌하는 차원 강조 (“이 그룹은 페이스 선호가 크게 갈립니다”)

## 3.3 여행 그룹 (FR-GROUP)

## FR-GROUP-01 그룹 생성

여행을 계획하는 사용자로서, 친구들과 함께 사용할 그룹을 만들고 싶다.

- 입력: 제목 ( $1 \sim 30$ 자), 목적지(시/도 + 시/군/구), 시작일/종료일, 커버 이미지( 8 장 프리셋 중 선택)
- 시작일 $\leq$ 종료일, 둘 다 오늘 이후, 최대 30 일
- 생성자는 자동으로 Owner
- 6 자리 영숫자 초대 코드 자동 생성 (충돌 시 재시도)
- 생성 직후 그룹 상세 페이지로 이동

## FR-GROUP-02 그룹 목록 조회

- 내가 멤버인 그룹만 표시
- 탭으로 분류: 진행 중 / 예정 / 완료
- 각 카드에 D-day 표시
- 정렬: 진행 중 → 가까운 예정 → 최근 완료

## FR-GROUP-03 그룹 참여

- 6자리 코드 입력 또는 초대 링크(/join?code=xxxxxx) 클릭
- 이미 멤버인 경우 → 그룹 페이지로 이동
- 그룹 인원 8 명 초과 시 → 가입 거부
- 유효하지 않은 코드 → 에러 메시지
- 가입 즉시 SSE MEMBER_JOINED 이벤트 발행

## FR-GROUP-04 그룹 정보 수정

- Owner만 수정 가능
- 수정 가능: 제목, 목적지, 시작일/종료일, 커버 이미지
- 시작일 변경은 여행 시작 전에만 가능
- 종료일 단축은 해당 일자의 일정이 없을 때만 가능 (있으면 경고)

## FR-GROUP-05 멤버 관리

- 멤버 목록 조회: 이름, 역할, 가입일, 성향 요약 (5차원 미니 차트)
- Owner 권한: 멤버 강퇴, Owner 위임
- 모든 멤버: 그룹 떠나기 (Owner는 위임 또는 해체 후에만)
- 강퇴/탈퇴 시 작성한 데이터는 보존, 표시는 “(탈퇴한 사용자)”

## FR-GROUP-06 그룹 해체

- Owner만 가능
- 해체 시 모든 멤버에게 알림
- 모든 데이터 Soft Delete (30일 후 Hard Delete)

## FR-GROUP-07 초대 코드 재발급

- Owner만 가능
- 기존 코드는 즉시 무효화
- 보안 사고 대응용

## 3.4 장소 보관함 (FR-PLACE)

## FR-PLACE-01 장소 검색 (Google Maps Places 단일 소스) 변경

그룹 멤버로서, 키워드 또는 카테고리로 장소를 검색하여 후보로 등록하고 싶다. 숙소든 일반 가게든 동일한 방식으로 다루고 싶다.

- 모든 장소 검색은 Google Maps Places API 단일 소스를 통해 수행 (EI-01)
- 검색 UI 구성
- 상단 검색 입력창 (자유 키워드, 예: “강남 카페”, “제주 흑돼지”)
- 카테고리 칩(chip) 필터: 전체 / 숙소 / 맛집 / 카페 / 명소 / 쇼핑
- 카테고리 선택은 Google의 includedType 으로 매핑 (EI-01-B)
- BE 프록시 → Google Places Text Search 호출 → 결과를 우리 표준 응답으로 변환
- 응답 매핑: placeId, name, category, address, lat, lng, rating, ratingCount, priceLevel, photoUrl
- 표시 정보
- 썸네일 이미지 (Place Photos)
- 평점 + 리뷰 수
- 가격대 (W~4)
- 주소, 카테고리 태그
- 결과는 페이지당 15 개, 무한 스크롤
- 지도 + 리스트 동시 표시 (지도는 Google 응답의 좌표 사용)
- 캐시 정책 (Google 호출량 통제의 핵심)
- BE 에서 (검색어 + 카테고리 + 지역 그리드) 조합으로 24시간 DB 캐시
- 썸네일 URL은 영구 캐시 (만료 시 재요청)
- Place Details는 검색 시점에는 호출하지 않고, 보관함 추가 시점에만 호출

## FR-PLACE-02 보관함 추가

- 검색 결과에서 “추가” 클릭 → 그룹 보관함에 저장
- 추가 시 입력: 메모(선택), 카테고리 태그(맛집/명소/카페/숙소/쇼핑/기타), 개인 별점(선택)
- 동일 장소(Google placeId 기준) 중복 추가 불가
- 추가 시점에 Place Details를 호출하여 영업시간, 전화번호 등 상세 정보 보강 (선택적)
- 추가자( created_by ) 기록
- SSE PLACE_BOOKMARKED 발행

## FR-PLACE-03 보관함 조회

- 그룹 단위, 멤버 누구나 조회 가능
- 필터: 카테고리, 추가자, 가격대(priceLevel)
- 정렬: 최근 추가, 평점(rating), 이름
- 지도 뷰 / 리스트 뷰 토글

## FR-PLACE-04 보관함 수정/삭제

- 추가자 본인 또는 Owner만 가능
- 일정에 이미 사용 중인 장소 삭제 시 → 경고 후 진행, 일정에서도 함께 제거

## 3.5 일정 (FR-SCHEDULE)

## FR-SCHEDULE-01 일정 추가

멤버로서, 일자별로 방문할 장소를 시간 순서대로 정리하고 싶다.

- 입력: 일자, 시작 시각, 종료 시각, 장소(보관함 또는 직접 검색), 메모, 예상 비용
- 시간 검증: 시작 < 종료, 24 시간 형식
- 같은 일자에 시간 겹침 허용 (경고만)
- SSE SCHEDULE_ADDED 발행

## FR-SCHEDULE-02일정 수정/삭제

- 모든 멤버가 수정/삭제 가능 (협업 우선)
- 마지막 수정자 표시 (updated_by)
- 삭제 전 확인 모달 필수

## FR-SCHEDULE-03 드래그 앤 드롭

- 같은 일자 내 순서 변경 → order_index 재계산
- 다른 일자로 이동 → day_index 변경, 시간 유지
- 드래그 종료 시점에만 서버 호출
- 낙관적 업데이트 (UI 먼저 갱신 → 실패 시 롤백)

## FR-SCHEDULE-04 이동 시간 + 비용 표시 대폭 변경

멤버로서, 다음 장소까지 이동하는 데 얼마나 시간이 걸리고 얼마가 드는지 미리 보고 싶다.

- 일정 카드 사이에 “이동 정보 카드” 자동 삽입
- 3개 탭: 자동차 / 대중교통 / 도보 (각 탭 선택 시 데이터 표시)
- 자동차 탭 표시 항목 (EI-02-A)
- 소요 시간 (분)
- 거리 (km)
- 예상 톨비 (원)
- 예상 연료비 (원, 자체 계산식: 거리 $/ 13 \mathrm{~km} / \mathrm{L} \times 1,700$ 원)
- 예상 택시비 (원, 카카오 응답 그대로)
- “자동차로 가기” 비용 합계 자동 산출 (톨비 + 연료비)
- 대중교통 탭 표시 항목 (EI-02-B)
- 소요 시간 (분), 환승 횟수
- 예상 운임 (원, 1 인 기준)
- 주요 노선 요약 (예: “2호선 $\rightarrow 9$ 호선”)
- 도보 탭: 시간, 거리만
- 사용자가 탭을 선택하면 schedule.transport_mode 에 저장 (자동차/대중교통/도보)
- 비용은 정산 자동 등록과 연동 (FR-EXPENSE-07)

## FR-SCHEDULE-05 지도 뷰

- 일자 선택 → 해당 일자의 모든 장소를 핀으로 표시
- 시간 순서대로 직선으로 연결
- 핀 클릭 → 일정 카드 강조 (스크롤)
- 전체 일자 보기 옵션 (색상으로 일자 구분)

## FR-SCHEDULE-06 일정 상태

- 상태값: PLANNED (기본) / VOTING (투표 중) / CANCELLED
- 현재 시각을 지난 일정은 자동 흐림 처리 (스타일만)

## 3.6 일정 투표 (FR-VOTE)

## FR-VOTE-01 후보 등록

멤버로서, 어떤 장소에 갈지 의견이 갈릴 때 투표로 결정하고 싶다.

- 일정에 “후보 추가” 버튼 → 해당 시간 슬롯을 VOTING 상태로 전환
- 각 멤버가 후보 장소를 $1 \sim 5$ 개까지 등록
- 후보 등록 시 메모 추가 가능

## FR-VOTE-02 투표

- 각 멤버는 후보별로 1~5점 부여 (5점 척도)
- 재투표 시 점수 갱신 (이력 X)
- 실명 투표 (협업 맥락)
- SSE VOTE_CAST 발행

## FR-VOTE-03 마감

- Owner 또는 후보 등록자가 마감 시간 설정 (선택)
- 마감 시 최다 득표 후보가 정식 일정으로 승격, 나머지는 제거
- 동점 시 Owner가 수동 선택
- 마감 전 수동 채택 가능 (Owner 또는 후보 등록자)

## FR-VOTE-04 결과 시각화

- 후보별 득점 막대 그래프
- 각 후보에 투표한 멤버 명단 (실명)
- “당신은 아직 투표하지 않았습니다” 알림

## 3.7 비용 정산 (FR-EXPENSE)

## FR-EXPENSE-01 지출 등록

결제한 사람으로서, 지출 내역을 기록하고 자동으로 분담 처리되길 원한다.

- 입력: 금액(원), 결제자, 카테고리(식비/숙박/교통/입장료/기타), 메모, 결제일
- 금액은 1 원 ~ $100,000,000$ 원
- 분담 방식: 균등 / 비율 / 금액 직접 입력
- 참여자 다중 선택 (기본: 전원)
- SSE EXPENSE_ADDED 발행

## FR-EXPENSE-02 지출 목록

- 시간 역순 표시
- 필터: 카테고리, 결제자, 날짜 범위
- 카테고리별 합계 차트 (도넛)
- 일자별 지출 추이 (라인)
- 총 지출액, 1 인당 평균

## FR-EXPENSE-03 지출 수정/삭제

- 작성자 또는 Owner만 가능
- 수정 시 정산 결과 즉시 재계산

## FR-EXPENSE-04 정산 매트릭스

- 멤버별 잔액 표시 (받을 돈 / 줄 돈)

## 최소 송금 횟수 알고리즘 (Greedy)

1. 각 멤버 잔액 $=$ 낸 돈 - 부담해야 할 돈
2. 양수 그룹과 음수 그룹으로 분리, 절댓값 큰 순 정렬
3. max+ 와 max- 매칭, min (절댓값) 만큼 송금 기록
4. 잔액 0 된 멤버 제외, 반복
- 결과: “A → B: #30,000” 형태의 송금 리스트

## FR-EXPENSE-05 송금 딥링크

- 각 송금 항목에 “토스로 보내기” / “카카오페이로 보내기” 버튼
- 토스: supertoss://send?amount=…&msg=…
- 카카오페이: kakaopay://send?amount=…
- PC에서는 QR 코드 표시
- 실제 송금은 사용자가 앱에서 완료. 우리는 “송금 완료” 체크박스만 제공

## FR-EXPENSE-06 정산 완료 처리

- 멤버가 본인의 송금을 “완료”로 체크
- 양측 모두 체크 시 송금 항목 closed
- 모든 송금 완료 시 그룹 정산 완료 상태 (마이페이지 회고 진입 가능)

## FR-EXPENSE-07 이동 비용 자동 등록 신규

멤버로서, 일정 간 이동에서 발생한 비용을 일일이 입력하지 않고 자동으로 정산에 반영하고 싶다.

- 일정의 transport_mode 가 선택되면, 카카오 모빌리티 응답의 비용 정보를 기반으로 “예상 이동 비용”을 표시
- 일정 카드 옆 “이 비용을 정산에 추가” 버튼 클릭 시
- 자동차: 톨비 + 연료비 합계 → 단일 지출로 등록 (결제자 선택, 균등 분담 기본)
- 대중교통: 운임 × 참여 인원 $\rightarrow$ 각자 부담으로 등록 (또는 1 명 결제 후 균등 분담 선택)
- 택시: 예상 택시비 → 단일 지출로 등록 (균등 분담 기본)
- 등록 후 사용자가 실제 금액으로 수정 가능 (예상 vs 실제 차이 발생 시)
- 지출 카테고리는 자동으로 “교통” 설정
- 일정 메모에 “[자동] 이동 비용 등록됨” 표시

## 3.8 실시간 동기화 (FR-SSE)

## FR-SSE-01 연결 수립

- 사용자가 그룹 상세 페이지 진입 시 GET /api/groups/{id}/stream 호출
- Authorization 헤더 인증 (EventSourcePolyfill 사용)
- 연결 성공 시 CONNECTED 이벤트 즉시 발송
- 하트비트 30초 간격
- 5 분 미수신 시 클라이언트가 재연결

## FR-SSE-02 이벤트 발행

- 페이로드: { type, groupId, actorId, payload, ts }
- 이벤트 타입
- SCHEDULE_ADDED, SCHEDULE_UPDATED, SCHEDULE_DELETED, SCHEDULE_REORDERED
- VOTE_CAST, VOTE_CLOSED
- EXPENSE_ADDED, EXPENSE_UPDATED, EXPENSE_DELETED
- PLACE_BOOKMARKED, PLACE_REMOVED
- MEMBER_JOINED, MEMBER_LEFT
- GROUP_UPDATED

## FR-SSE-03 클라이언트 처리

- 이벤트 타입별로 React Query 캐시 무효화
- 본인 발생 이벤트는 무시 (낙관적 업데이트와 충돌 방지)
- 토스트 알림: “OOO님이 일정을 추가했습니다”

## FR-SSE-04 폴백

- SSE 연결 3회 연속 실패 시 폴링 모드로 자동 전환
- 폴링: 5 초 간격 그룹 전체 데이터 refetch
- 페이지 떠날 때 연결 해제

## 3.9 홈 / 마이페이지 / 추천

## FR-HOME-01 진입 화면

- 로그인 후 첫 화면, 상단 인사말
- 진행 중 그룹 카드 (큰 카드, D-day 강조)
- 예정 그룹 카드 (가로 스크롤)
- 완료 그룹 카드 (회고 진입 가능)

## FR-HOME-02 알림 영역

- 미정산 금액 합계
- 투표 대기 항목 수
- 새 멤버 가입 알림
- 알림 클릭 시 해당 페이지로 이동

## FR-HOME-03 빈 상태

- 그룹 없음: 빈 상태 일러스트 + 그룹 생성 CTA

## FR-MYPAGE-01~04 마이페이지

- 프로필: 이름/이메일, 성향 차트, 재설문 진입
- 계정 관리: 비밀번호 변경, 계정 탈퇴, 로그아웃
- 참여 그룹 목록 (완료 그룹 포함)
- 여행 기록(회고): 종료된 그룹에 한 줄 후기 + 별점. 회고는 본인만 조회

## FR-RECOMMEND-01~02 추천 (SHOULD)

- TourAPI 연동: 목적지 선택 시 한국관광공사 추천 명소 자동 큐레이션
- 캐시: 같은 지역+카테고리는 24 시간 DB 캐시
- 성향 기반 정렬: 그룹 평균 성향과 명소 특성 벡터의 코사인 유사도로 정렬, 상위 20 개 표시
- “보관함에 추가” 원클릭

## 4. 비기능 요구사항

## 4.1 성능 (NFR-PERF)

| 항목 | 목표 |
| --- | --- |
| API 응답 시간 (95 percentile) | 500 ms 이하 |
| 페이지 초기 로딩 | 3 초 이하 $(3 \mathrm{G}$ 환경) |
| SSE 이벤트 전파 지연 | 1초 이하 |
| 동시 접속 (1 그룹) | 8명 |
| 동시 접속 (전체) | 100명 |
| Google Places 검색 캐시 | 24 시간 $(\mathrm{DB}$, 검색어 + 카테고리 + 지역 그리드 $)$ |
| Google Place Details 캐시 | 7 일 ( DB , 정보 변동 적음) |
| 카카오 모빌리티 길찾기 캐시 | 1 시간 (출발지•도착지•수단 쌍) |
| TourAPI 결과 캐시 | 24시간 (DB) |

## 4.2 보안 (NFR-SEC)

- 모든 통신 HTTPS (배포 환경)
- 비밀번호 BCrypt (cost 10)
- JWT 서명 키는 환경 변수, 32 바이트 이상
- SQL Injection 방지: JPA 파라미터 바인딩만 사용 (네이티브 쿼리 금지)
- XSS 방지: React 기본 이스케이프, dangerouslySetInnerHTML 금지
- CSRF: JWT(stateless) 사용으로 자동 차단
- Rate Limiting: 로그인 5 회/ 5 분, 회원가입 3회/시간/IP
- 민감 정보(비밀번호, 토큰) 로그 출력 금지
- 환경 변수 Git 커밋 금지 ( .env → .gitignore)
- 외부 API 키 보호: Google Maps / 카카오 / TourAPI 키는 BE에서만 사용. FE 노출 금지. GCP는 IP + API 제한, 카카오는 도메인 제한
- CORS: 허용 origin은 환경 변수로만 설정

## 4.3 사용성 (NFR-USE)

- 모바일 우선 반응형 (최소 너비 320 px )
- 태블릿(768px) / 데스크탑(1024px) 대응
- 모든 액션은 키보드로 접근 가능
- 색상 대비 WCAG AA 이상
- 로딩 상태 표시 (스피너 또는 스켈레톤)
- 에러는 토스트 또는 인라인 메시지로 즉시 피드백
- 빈 상태 안내 일러스트 또는 메시지
- 작성 중 페이지 이탈 시 경고

## 4.4 호환성 (NFR-COMPAT)

- 브라우저: Chrome / Safari / Edge 최신 2개 메이저 버전
- 모바일: iOS Safari 15+, Android Chrome 100+
- IE 미지원
- Node.js v20 LTS, JDK 21

## 4.5 신뢰성 (NFR-REL)

- 에러 시 의미 있는 메시지 표시 (스택트레이스 노출 금지)
- 서버 에러는 로그 파일로 수집
- DB 트랜잭션은 서비스 메서드 단위로 묶기
- 정산 관련은 격리 수준 READ_COMMITTED 이상
- 동시 수정 충돌은 마지막 쓰기 승리

## 4.6 확장성 / 유지보수성 (NFR-SCALE, NFR-MAINT)

- 도메인 단위 패키지 구조
- SSE는 단일 서버 가정. 다중 서버 시 Redis Pub/Sub 도입 여지
- 코드 컨벤션: Google Java Format, ESLint Airbnb 기준
- 커밋 메시지: Conventional Commits
- PR 단위는 200 lines 이하 권장
- 핵심 비즈니스 로직은 단위 테스트 필수 (정산 알고리즘, 권한 검증)
- 환경 분리: local / dev / prod

## 5. 데이터 요구사항

## 5.1 보존 정책

| 데이터 | 보존 | 비고 |
| --- | --- | --- |
| 활성 사용자 데이터 | 무기한 | - |
| 탈퇴 사용자 | 30 일 후 Hard Delete | 익명화 후 보존 |
| 삭제된 그룹 | 30일 후 Hard Delete | Soft Delete 후 |
| Refresh Token | 만료 7일 후 자동 삭제 | 배치 |
| Google Places 검색 캐시 | 24시간 | DB (검색어 + 카테고리 + 지역 그리드) |
| Google Place Details 캐시 | 7일 | DB (보관함 추가 시 호출분) |
| 카카오 모빌리티 길찾기 캐시 | 1시간 | 메모리 또는 Redis |
| TourAPI 캐시 | 24시간 | DB |

## 5.2 백업 / 마이그레이션 / 시드

- 운영 환경: DB 일 1 회 자동 백업, 7 일 보관
- 모든 스키마 변경은 Flyway 마이그레이션 스크립트로
- 운영 환경에 직접 DDL 실행 금지
- 시드 데이터: 테스트 사용자, 성향 설문 문항 마스터, 그룹 커버 프리셋 8장

## 6. UI / UX 요구사항

## 6.1 디자인 토큰

- Primary Color: #FF9F66
- Background: #FFF8F0
- Border Radius: 12 px (카드), 8px(버튼)
- Font: Pretendard 또는 Noto Sans KR
- Spacing: 4 의 배수

## 6.2 공통 컴포넌트

- Button (Primary / Secondary / Danger / Ghost)
- Input (Text / Password / Email / Number / Date / Time)
- Select / MultiSelect
- Modal (Confirm / Form)
- Toast (Success / Error / Info / Warning)
- Skeleton (List / Card)
- EmptyState

## 6.3 페이지 목록

| 경로 | 페이지 | 인증 |
| --- | --- | --- |
| 1 | 랜딩 (비로그인) / 홈 (로그인) | - |
| /login | 로그인 | X |
| /signup | 회원가입 | x |
| /survey | 성향 설문 | 0 |
| /groups/new | 그룹 생성 | 0 |
| /groups/:id | 그룹 상세 (탭) | O + 멤버 |
| /groups/:id/schedules | 일정 빌더 | O + 멤버 |
| /groups/:id/places | 장소 보관함 | O + 멤버 |
| /groups/:id/expenses | 정산 | O + 멤버 |
| /groups/:id/members | 멤버 관리 | O + 멤버 |
| /join | 코드 입력 | 0 |
| /mypage | 마이페이지 | 0 |
| /404, /500 | 에러 | - |

## 6.4 반응형 브레이크포인트

- Mobile: ~ 767px ( 1 열)
- Tablet: 768px ~ 1023px (2열)
- Desktop: 1024px ~ (3열 또는 사이드바)

## 7. 권한 매트릭스

| 작업 | 비로그인 | 로그인 | 그룹 멤버 | 그룹 Owner |
| --- | --- | --- | --- | --- |
| 회원가입 / 로그인 | ✓ | - | - | - |
| 본인 프로필 수정 | - | ✓ | ✓ | ✓ |
| 그룹 생성 | - | ✓ | ✓ | ✓ |
| 그룹 코드로 참여 | - | ✓ | ✓ | ✓ |
| 그룹 상세 조회 | - | - | ✓ | ✓ |
| 그룹 정보 수정 | - | - | - | ✓ |
| 그룹 해체 | - | - | - | ✓ |
| 멤버 강퇴 / Owner 위임 | - | - | - | ✓ |
| 그룹 떠나기 | - | - | ✓ | 위임/해체 후 |
| 초대 코드 재발급 | - | - | - | ✓ |
| 장소 추가 | - | - | ✓ | ✓ |
| 장소 수정/삭제 | - | - | 본인 추가분 | ✓ (전체) |
| 일정 CRUD / 드래그 | - | - | ✓ | ✓ |
| 투표 후보 등록 / 투표 | - | - | ✓ | ✓ |
| 투표 수동 채택 | - | - | 후보 등록자 | ✓ |
| 지출 등록 | - | - | ✓ | ✓ |
| 지출 수정/삭제 | - | - | 본인 작성분 | ✓ (전체) |
| 이동 비용 자동 등록 | - | - | ✓ | ✓ |
| 정산 매트릭스 조회 | - | - | ✓ | ✓ |

## 8. 상태 전이도

## 8.1 그룹 상태

[PLANNING] (생성 ~ 시작일 전날)
↓ (시작일 도래)
[IN_PROGRESS] (시작일 ~ 종료일)
↓ (종료일 다음 날)
[COMPLETED]
↓ (Owner의 해체)
[DELETED] $\rightarrow 30$ 일 후 Hard Delete

## 8.2 일정 상태

```
[PLANNED] \longrightarrow [VOTING] (후보 드ᄋ로ᄀ 시)
    \uparrow ↓ (마가ᄆ 또느ᄂ 채태ᄀ)
    |(사ᄀ제)
[CANCELLED]
```

## 8.3 정산 송금 상태

```
[PENDING] (저ᄋ사ᄂ 계사ᄂ 지ᄀ후)
    | (보내느ᄂ 사라ᄆ 체크)
[SENT]
    | (바ᄃ느ᄂ 사라ᄆ 화ᄀ이ᄂ)
[COMPLETED]
```

## 9. 메시지 카탈로그

## 9.1 에러 메시지

AUTH001 이메일 또는 비밀번호가 올바르지 않습니다.
AUTH002 이미 사용 중인 이메일입니다.
AUTH003 비밀번호는 영문•숫자•특수문자를 각각 1개 이상 포함해야 합니다.
AUTH004 로그인 시도가 너무 많습니다. 5분 후 다시 시도해주세요.
AUTH005 세션이 만료되었습니다. 다시 로그인해주세요.

GROUP001 그룹 정원이 가득 찼습니다. (최대 8명)
GROUP002 유효하지 않은 초대 코드입니다.
GROUP003 이미 참여한 그룹입니다.
GROUP004 Owner는 그룹을 떠나기 전에 Owner를 위임하거나 그룹을 해체해야 합니다.
GROUP005 해당 그룹의 멤버가 아닙니다.

PLACE001 이미 보관함에 등록된 장소입니다.
PLACE002 장소 검색 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요. (Google Maps)
PLACE003 길찾기 정보를 불러오지 못했습니다. (카카오 모빌리티)

SCHEDULE001 시작 시각이 종료 시각보다 늦을 수 없습니다.
SCHEDULE002 여행 기간을 벗어난 일자입니다.

EXPENSE001 분담 비율의 합이 $100 \%$ 가 아닙니다.
EXPENSE002 분담 금액의 합이 총 금액과 일치하지 않습니다.
EXPENSE003 금액은 1원 이상 1억원 이하여야 합니다.

SYS001 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
SYS002 권한이 없습니다.
SYS003 요청한 정보를 찾을 수 없습니다.

## 9.2 빈 상태 메시지

HOME_EMPTY
GROUP_PLACES_EMPTY
GROUP_SCHEDULES_EMPTY
GROUP_EXPENSES_EMPTY
SEARCH_EMPTY

아직 여행 그룹이 없어요. 첫 여행을 계획해보세요!
장소 보관함이 비어있어요. 가고 싶은 곳을 검색해 추가해보세요.
아직 일정이 없어요. 보관함의 장소를 일정에 추가해보세요.
지출 내역이 없어요. 첫 지출을 기록해보세요.
검색 결과가 없어요. 다른 키워드로 시도해보세요.

## 9.3 성공 / 안내 메시지

SIGNUP_SUCCESS 회원가입이 완료되었습니다. 로그인해주세요.
GROUP_CREATED 그룹이 만들어졌어요! 친구를 초대해보세요.
INVITE_COPIED 초대 링크가 복사되었습니다.
EXPENSE_SAVED 지출이 등록되었어요.
TRANSPORT_SAVED 이동 비용이 정산에 추가되었어요.
VOTE_DONE 투표가 완료되었어요.
SETTLEMENT_DONE 모든 정산이 마무리되었어요!

## 10. 제약사항

## 10.1 기술적 제약

- 개발 기간 14 일 고정
- 인원 2명 고정
- AI 토큰은 풀가동 (개인 한도가 변수)
- 모바일 네이티브 앱 개발 불가 (웹만)
- 외부 API 키 발급은 1일 이상 소요될 수 있음 → 프로젝트 첫날 신청 필수

## 10.2 외부 API 비용 제약

- Google Maps Platform (최대 비용 발생 지점)
- 월 $\$ 200$ 무료 크레딧 제공. Text Search ~ $\$ 32 / 1000$ 회, Place Details ~ $\$ 17 / 1000$ 회
- 모든 장소 검색이 Google로 통합됨에 따라 호출량이 가장 많은 API
- 필드 마스크를 항상 명시하여 응답 필드 수 최소화 (필드별 과금)
- 24 시간 DB 캐시 강력 적용. Place Details는 보관함 추가 시점에만 호출
- GCP Budget Alert: 월 $50 도달 시 알림, $150 도달 시 강제 차단
- 카카오 모빌리티: 무료 할당량 한도 내에서 사용. 길찾기 결과는 1 시간 캐시. 일일 호출량 모니터링
- TourAPI: 무료. 일일 호출 제한 확인
- 비용 폭주 방지 원칙: 모든 외부 API는 BE 캐시 필수 적용. 캐시 미적용 코드는 PR 리뷰에서 차단

## 10.3 법적 제약

- 개인정보 처리 방침 페이지 필수
- 비밀번호는 단방향 해시만 저장
- 개인정보 보유 기간 명시 (탈퇴 후 30 일)
- 14 세 미만 가입 차단 또는 보호자 동의 (이번 범위는 성인 가정)

## 10.4 운영 제약

- 운영자(=개발자) 2명. 24시간 모니터링 불가
- 장애 발생 시 다음 영업일 대응
- 데이터 손실 시 백업 복구 (최대 24 시간 손실 허용)

## 11. 추적 가능성 매트릭스

| 차별점 | 관련 요구사항 |
| --- | --- |
| 그룹 의사결정 강화 | FR-VOTE-01 ~ FR-VOTE-04 |
| 성향 기반 매칭 • 추천 | FR-SURVEY-01 ~ FR-SURVEY-03, FR-RECOMMEND-01, FR-RECOMMEND-02 |
| 장소 검색 통합 (Google 단일 소스) 통합 | FR-PLACE-01, FR-PLACE-02, FR-PLACE-03, EI-01 |
| 이동 시간 + 비용 표시 (카카오 전담) 전담 | FR-SCHEDULE-04, EI-02-A, EI-02-B, EI-02-C |
| 이동 비용 자동 정산 등록 | FR-EXPENSE-07, FR-SCHEDULE-04 |
| 한국형 송금 UX | FR-EXPENSE-05, EI-04 |
| 실시간 동기화 즉각성 | FR-SSE-01 ~ FR-SSE-04 |

그룹 여행 협업 플랫폼 - 요구사항 명세서 v1.0