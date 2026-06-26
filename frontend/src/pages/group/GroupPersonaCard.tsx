import { useQuery } from '@tanstack/react-query';
import { getGroupPersona } from '../../api/survey';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';

/**
 * 그룹 여행 성향 카드 — 멤버 평균 성향의 일치율과 가장 갈리는 차원(절충 안내)을 보여준다.
 * FR-SURVEY-03 백엔드(GET /api/groups/{id}/persona)를 그대로 사용한다.
 */
export default function GroupPersonaCard({ groupId }: { groupId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: groupQueryKeys.persona(groupId),
    queryFn: () => getGroupPersona(groupId),
  });

  if (isLoading) return <div className="mb-3.5 h-20 animate-pulse rounded-card border border-border bg-surface" />;
  if (!data) return null;

  // 응답자 2명 미만이면 일치율/충돌을 계산할 수 없다.
  if (data.matchRate == null) {
    return (
      <div className="mb-3.5 rounded-card border border-border bg-surface p-3.5">
        <div className="text-[13px] font-extrabold text-foreground">🧭 그룹 여행 성향</div>
        <p className="mt-1 text-[12px] text-muted">
          멤버 {data.memberCount}명 중 {data.respondedCount}명 설문 완료. 2명 이상 완료하면 성향 일치율을 보여드려요.
        </p>
      </div>
    );
  }

  const rate = data.matchRate;
  const tone = rate >= 70 ? '잘 맞아요' : rate >= 40 ? '적당해요' : '취향이 갈려요';

  return (
    <div className="mb-3.5 rounded-card border border-border bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-extrabold text-foreground">🧭 그룹 여행 성향</span>
        <span className="text-[12px] font-bold text-primary">일치율 {rate}% · {tone}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-skeleton">
        <div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} />
      </div>
      {data.conflictMessage && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[12px] font-semibold text-[#AD5575]">
          <span aria-hidden>💡</span>
          <span>{data.conflictMessage} 일정에 서로의 취향을 번갈아 반영해 보세요.</span>
        </p>
      )}
    </div>
  );
}
