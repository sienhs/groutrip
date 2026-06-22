import {
  DIMENSIONS,
  prefValue,
  type SurveyDimension,
  type UserPreference,
} from '../../types/survey';

export interface Persona {
  emoji: string;
  name: string;
  desc: string;
}

/** 차원별 페르소나 정의(가장 높은 차원 기준). 9차원 확장 시 항목만 추가. */
const PERSONA_BY_DIMENSION: Record<SurveyDimension, Persona> = {
  ACTIVITY: { emoji: '🏄', name: '액티비티 러버', desc: '가만히 못 있는 에너지형. 몸으로 부딪치는 여행을 즐겨요.' },
  FOOD: { emoji: '🍜', name: '미식 여행가', desc: '먹킷리스트부터 채우는 타입. 맛집 동선을 먼저 그려요.' },
  PACE: { emoji: '⚡', name: '부지런한 탐험가', desc: '하루를 알차게 꽉 채우는 빠른 페이스를 좋아해요.' },
  URBAN_NATURE: { emoji: '🌿', name: '자연 힐링러', desc: '한적한 풍경 속에서 충전하는 걸 가장 좋아해요.' },
  TIME_PREF: { emoji: '🌅', name: '아침형 부지런러', desc: '아침 일찍 움직여 하루를 길게 쓰는 타입이에요.' },
};

/** UserPreference 에서 가장 두드러진 차원으로 페르소나를 고른다. */
export function getPersona(pref: UserPreference): Persona {
  let topDim: SurveyDimension = DIMENSIONS[0];
  let topVal = -1;
  for (const dim of DIMENSIONS) {
    const v = prefValue(pref, dim);
    if (v > topVal) {
      topVal = v;
      topDim = dim;
    }
  }
  return PERSONA_BY_DIMENSION[topDim];
}
