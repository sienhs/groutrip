import type { CoverPreset, GroupStatus } from '../../types/group';

/**
 * 그룹 표시용 유틸 (커버 그라데이션 · D-day · 상태).
 * 커버 클래스는 정적 문자열로 나열 → Tailwind JIT 인식(인라인 style 미사용).
 */

export const COVER_GRADIENT: Record<CoverPreset, string> = {
  SUNSET: 'bg-gradient-to-br from-[#FF9F66] to-[#FF8A47]',
  OCEAN: 'bg-gradient-to-br from-[#6FB3F2] to-[#4A90D9]',
  FOREST: 'bg-gradient-to-br from-[#7FC9A6] to-[#4FAE86]',
  NIGHT: 'bg-gradient-to-br from-[#3A4A6B] to-[#1F2A44]',
  SAKURA: 'bg-gradient-to-br from-[#F2A0C0] to-[#E87BA6]',
  TROPICAL: 'bg-gradient-to-br from-[#F2B85A] to-[#E89B2E]',
  LAVENDER: 'bg-gradient-to-br from-[#B6A0E8] to-[#9579D9]',
  EARTH: 'bg-gradient-to-br from-[#C7B299] to-[#A8916F]',
};

export const COVER_LABEL: Record<CoverPreset, string> = {
  SUNSET: '선셋 오렌지',
  OCEAN: '오션 블루',
  FOREST: '포레스트',
  NIGHT: '시티 나이트',
  SAKURA: '벚꽃 핑크',
  TROPICAL: '트로피컬',
  LAVENDER: '라벤더',
  EARTH: '어스 베이지',
};

export const COVER_PRESETS = Object.keys(COVER_GRADIENT) as CoverPreset[];

/**
 * coverImageKey(문자열) → 그라데이션 클래스.
 * 프리셋 키면 그대로, 아니면 키 해시로 8종 중 하나를 안정적으로 매핑(빈 화면 방지).
 */
export function gradientForKey(key: string | null | undefined): string {
  if (key && key in COVER_GRADIENT) return COVER_GRADIENT[key as CoverPreset];
  const gradients = Object.values(COVER_GRADIENT);
  if (!key) return gradients[0];
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return gradients[h % gradients.length];
}

/** 자정 기준 일수 차이. */
function dayDiff(target: string): number {
  const now = new Date();
  const t = new Date(`${target}T00:00:00`);
  const ms = t.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

/** 시작일까지 D-day 라벨. 진행 중이면 'D-DAY'/경과일, 지난 여행은 '종료'. */
export function ddayLabel(startDate: string, endDate: string): string {
  const toStart = dayDiff(startDate);
  if (toStart > 0) return `D-${toStart}`;
  const toEnd = dayDiff(endDate);
  if (toEnd >= 0) return 'D-DAY';
  return '종료';
}

/** 여행 기간으로 상태 계산. */
export function groupStatus(startDate: string, endDate: string): GroupStatus {
  if (dayDiff(startDate) > 0) return 'UPCOMING';
  if (dayDiff(endDate) >= 0) return 'ONGOING';
  return 'COMPLETED';
}

/** "06.25 – 06.28" 표기. */
export function dateRange(startDate: string, endDate: string): string {
  const f = (s: string) => {
    const d = new Date(`${s}T00:00:00`);
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  return `${f(startDate)} – ${f(endDate)}`;
}
