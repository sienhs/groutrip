import type { ReactNode } from 'react';
import { gradientForKey } from './groupUi';
import { groupCoverUrl } from '../../api/group';
import { cn } from '../../lib/cn';

interface Props {
  groupId: number;
  coverImageKey: string | null | undefined;
  className?: string;
  children?: ReactNode;
}

/**
 * 그룹 커버 표시. coverImageKey === 'CUSTOM'이면 업로드 이미지를, 아니면 프리셋 그라데이션을 보여준다.
 * 항상 그라데이션을 베이스로 깔아 이미지 로드 전/실패 시 자연스럽게 폴백한다.
 */
export default function GroupCover({ groupId, coverImageKey, className, children }: Props) {
  const custom = coverImageKey === 'CUSTOM';
  return (
    <div className={cn('relative overflow-hidden', gradientForKey(coverImageKey), className)}>
      {custom && (
        <img
          src={groupCoverUrl(groupId)}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
      )}
      {children}
    </div>
  );
}
