import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { userAvatarUrl } from '../api/user';

type Size = 'sm' | 'md' | 'lg';

const SIZE: Record<Size, string> = {
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-[13px]',
  lg: 'size-10 text-[15px]',
};

/**
 * 이름에서 안정적인 배경색 클래스를 고른다(따뜻한 팔레트).
 * 클래스 문자열을 정적으로 나열해 Tailwind JIT 가 인식하도록 한다(인라인 style 미사용).
 */
const PALETTE = [
  'bg-[#E86A92]',
  'bg-[#6FB3F2]',
  'bg-[#B6B1C4]',
  'bg-[#7FC9A6]',
  'bg-[#E8A0C0]',
  'bg-[#FFC93C]',
];
function colorClassFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: Size;
  className?: string;
  /** 있으면 프로필 사진(공개 조회)을 표시. 없거나 404면 이니셜로 폴백. */
  userId?: number;
  /** 사진 캐시 버스트(업로드 직후 갱신용). */
  version?: number;
}

/** 이름 이니셜 기반 아바타. userId가 있으면 프로필 사진을 우선 표시(실패 시 이니셜). */
export default function Avatar({ name, size = 'md', className, userId, version }: AvatarProps) {
  const initial = name.trim().charAt(0) || '?';
  const [failed, setFailed] = useState(false);

  // userId/version이 바뀌면 다시 시도
  useEffect(() => {
    setFailed(false);
  }, [userId, version]);

  if (userId && !failed) {
    return (
      <img
        src={userAvatarUrl(userId, version)}
        alt={name}
        title={name}
        onError={() => setFailed(true)}
        className={cn('inline-block rounded-full object-cover', SIZE[size], className)}
      />
    );
  }
  return (
    <span
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-extrabold text-white',
        colorClassFor(name),
        SIZE[size],
        className,
      )}
    >
      {initial}
    </span>
  );
}

interface AvatarGroupProps {
  names: string[];
  /** 표시할 최대 개수, 초과분은 +N 으로 */
  max?: number;
  size?: Size;
}

/** 겹쳐 표시되는 아바타 그룹. 멤버 미리보기에 사용. */
export function AvatarGroup({ names, max = 3, size = 'md' }: AvatarGroupProps) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  const ring = size === 'lg' ? 'ring-2' : 'ring-2';
  return (
    <div className="flex items-center">
      {shown.map((n, i) => (
        <span key={`${n}-${i}`} className={cn('rounded-full ring-white', ring, i > 0 && '-ml-2.5')}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {rest > 0 && (
        <span
          className={cn(
            '-ml-2.5 inline-flex items-center justify-center rounded-full bg-[#EEECF6] font-extrabold text-[#8A8699] ring-2 ring-white',
            SIZE[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
