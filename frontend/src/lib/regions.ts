/**
 * 그룹 목적지 자동완성용 지역 데이터.
 *
 * 각 항목의 `value`(저장값)는 항상 백엔드가 추천 areaCode로 매칭할 수 있는
 * 시/도 토큰으로 시작한다(예: "경기도 용인시"). 따라서 목록에서 선택해 만든
 * 그룹은 목적지별 추천(RecommendService.resolveAreaCode)이 항상 정상 동작한다.
 */
export interface Region {
  /** 화면 표시 라벨 (예: "용인시 · 경기") */
  label: string;
  /** 저장/전송되는 정규화 목적지 (예: "경기도 용인시") */
  value: string;
  /** 검색 매칭용 키워드 모음(소문자) */
  keywords: string;
}

interface ProvinceDef {
  /** 정규 시/도명 (value 접두어, 예: "경기도") */
  name: string;
  /** 짧은 표기/검색용 (예: "경기") */
  short: string;
  /** 추가 검색 별칭 */
  aliases?: string[];
  /** 시/군 전체 이름 목록(접미사 포함). 비우면 시/도 단독 항목만 생성 */
  cities: string[];
}

/** 광역시·특별시·특별자치시 — value 는 정식 명칭 한 개. */
const METROS: Region[] = [
  { label: '서울특별시', value: '서울특별시', keywords: '서울 서울특별시 seoul' },
  { label: '부산광역시', value: '부산광역시', keywords: '부산 부산광역시 busan' },
  { label: '인천광역시', value: '인천광역시', keywords: '인천 인천광역시 incheon' },
  { label: '대구광역시', value: '대구광역시', keywords: '대구 대구광역시 daegu' },
  { label: '대전광역시', value: '대전광역시', keywords: '대전 대전광역시 daejeon' },
  { label: '광주광역시', value: '광주광역시', keywords: '광주 광주광역시 gwangju' },
  { label: '울산광역시', value: '울산광역시', keywords: '울산 울산광역시 ulsan' },
  { label: '세종특별자치시', value: '세종특별자치시', keywords: '세종 세종특별자치시 sejong' },
];

const PROVINCES: ProvinceDef[] = [
  {
    name: '경기도', short: '경기', aliases: ['경기도'],
    cities: ['수원시', '용인시', '성남시', '고양시', '부천시', '안양시', '안산시', '화성시',
      '평택시', '의정부시', '파주시', '김포시', '광명시', '가평군', '양평군', '포천시', '여주시',
      '이천시', '남양주시'],
  },
  {
    name: '강원특별자치도', short: '강원', aliases: ['강원도', '강원특별자치도'],
    cities: ['춘천시', '원주시', '강릉시', '속초시', '동해시', '삼척시', '태백시', '정선군',
      '평창군', '홍천군', '양양군', '인제군'],
  },
  {
    name: '충청북도', short: '충북', aliases: ['충청북도'],
    cities: ['청주시', '충주시', '제천시', '단양군', '보은군'],
  },
  {
    name: '충청남도', short: '충남', aliases: ['충청남도'],
    cities: ['천안시', '아산시', '공주시', '보령시', '서산시', '논산시', '당진시', '태안군',
      '부여군', '예산군'],
  },
  {
    name: '경상북도', short: '경북', aliases: ['경상북도'],
    cities: ['포항시', '경주시', '안동시', '구미시', '영주시', '문경시', '상주시', '김천시',
      '영천시', '울릉군'],
  },
  {
    name: '경상남도', short: '경남', aliases: ['경상남도'],
    cities: ['창원시', '진주시', '통영시', '김해시', '거제시', '양산시', '사천시', '밀양시',
      '남해군', '거창군', '합천군', '하동군'],
  },
  {
    name: '전라북도', short: '전북', aliases: ['전라북도', '전북특별자치도'],
    cities: ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '무주군', '부안군', '고창군'],
  },
  {
    name: '전라남도', short: '전남', aliases: ['전라남도'],
    cities: ['여수시', '순천시', '목포시', '광양시', '나주시', '담양군', '보성군', '해남군',
      '완도군', '진도군', '곡성군'],
  },
  {
    name: '제주특별자치도', short: '제주', aliases: ['제주도', '제주특별자치도'],
    cities: ['제주시', '서귀포시'],
  },
];

/** 접미사(시/군/구)를 떼어 검색 키워드를 늘린다. 예: "용인시" → "용인" */
const stripSuffix = (city: string) => city.replace(/(특별자치)?(시|군|구)$/u, '');

function buildRegions(): Region[] {
  const list: Region[] = [...METROS];
  for (const p of PROVINCES) {
    const aliasKeywords = (p.aliases ?? []).join(' ');
    // 시/도 단독 항목
    list.push({
      label: p.name,
      value: p.name,
      keywords: `${p.short} ${p.name} ${aliasKeywords}`.toLowerCase(),
    });
    // 시/군 항목 — value 는 항상 "시/도 시/군" 형태로 추천 매칭을 보장한다.
    for (const city of p.cities) {
      list.push({
        label: `${city} · ${p.short}`,
        value: `${p.name} ${city}`,
        keywords: `${city} ${stripSuffix(city)} ${p.short} ${p.name} ${aliasKeywords}`.toLowerCase(),
      });
    }
  }
  return list;
}

export const REGIONS: Region[] = buildRegions();

/** 입력어로 지역을 검색한다. 접두 일치를 우선 정렬하고 상위 `limit`개만 반환. */
export function searchRegions(query: string, limit = 8): Region[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const matches = REGIONS.filter((r) => r.keywords.includes(q));
  // 키워드가 q 로 "시작"하는 항목을 앞으로(예: "광" 입력 시 광주/광명/광양 우선)
  matches.sort((a, b) => {
    const aStarts = a.keywords.startsWith(q) || a.label.toLowerCase().startsWith(q);
    const bStarts = b.keywords.startsWith(q) || b.label.toLowerCase().startsWith(q);
    if (aStarts !== bStarts) return aStarts ? -1 : 1;
    return a.value.localeCompare(b.value, 'ko');
  });
  return matches.slice(0, limit);
}

/** 저장된 목적지 문자열이 알려진 지역 목록에 정확히 존재하는지. */
export function isKnownRegion(value: string): boolean {
  const v = value.trim();
  return REGIONS.some((r) => r.value === v);
}

/**
 * 그룹 목적지(시/도 기준)에 속한 시·군·구 후보 목록.
 * 도(道)면 소속 시/군 전체를, 광역시/특별시 등 시/군 데이터가 없으면 빈 배열을 돌려준다
 * (이 경우 호출부는 시군구 단계를 건너뛰고 목적지 자체를 검색 지역으로 쓴다).
 */
export function sigunguOptionsFor(destination: string): string[] {
  if (!destination) return [];
  const firstToken = destination.trim().split(/\s+/)[0];
  const province = PROVINCES.find(
    (p) => firstToken.includes(p.short) || (p.aliases ?? []).some((a) => firstToken.includes(a)),
  );
  return province ? [...province.cities] : [];
}

/**
 * 행정구(자치구·일반구)가 있는 지역의 구 목록.
 *  - 광역시/특별시: 자치구 (예: 서울특별시 → 강남구…)
 *  - 도 소속 대도시: 일반구 (예: 용인시 → 처인구/기흥구/수지구)
 * 키는 "시/군 또는 광역시" 이름(예: "용인시", "서울특별시"). 구가 없으면 항목 없음.
 */
const DISTRICTS: Record<string, string[]> = {
  // ── 특별시·광역시 자치구 ──
  서울특별시: ['종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구',
    '강북구', '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구', '구로구',
    '금천구', '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구'],
  부산광역시: ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구',
    '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
  인천광역시: ['중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
  대구광역시: ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'],
  대전광역시: ['동구', '중구', '서구', '유성구', '대덕구'],
  광주광역시: ['동구', '서구', '남구', '북구', '광산구'],
  울산광역시: ['중구', '남구', '동구', '북구', '울주군'],
  // ── 도 소속 대도시 일반구 ──
  수원시: ['장안구', '권선구', '팔달구', '영통구'],
  용인시: ['처인구', '기흥구', '수지구'],
  성남시: ['수정구', '중원구', '분당구'],
  고양시: ['덕양구', '일산동구', '일산서구'],
  안산시: ['상록구', '단원구'],
  안양시: ['만안구', '동안구'],
  창원시: ['의창구', '성산구', '마산합포구', '마산회원구', '진해구'],
  청주시: ['상당구', '서원구', '흥덕구', '청원구'],
  천안시: ['동남구', '서북구'],
  포항시: ['남구', '북구'],
  전주시: ['완산구', '덕진구'],
};

/**
 * 선택한 시/군 또는 광역시에 속한 구 목록. 구가 없으면 빈 배열.
 * 입력은 "용인시" 또는 "서울특별시" 같은 단일 토큰, 또는 "경기도 용인시" 처럼 공백 포함도 허용.
 */
export function districtOptionsFor(region: string): string[] {
  if (!region) return [];
  const r = region.trim();
  if (DISTRICTS[r]) return [...DISTRICTS[r]];
  // 공백이 섞인 경우 마지막 토큰(가장 구체적인 시/군)으로 재시도.
  const last = r.split(/\s+/).pop() ?? '';
  return last && DISTRICTS[last] ? [...DISTRICTS[last]] : [];
}
