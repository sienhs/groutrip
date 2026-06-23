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
