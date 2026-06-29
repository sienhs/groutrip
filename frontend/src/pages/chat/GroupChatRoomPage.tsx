import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/AppLayout';
import { getGroup } from '../../api/group';
import { groupQueryKeys } from '../../queryKeys/groupQueryKeys';
import GroupChatPage from './GroupChatPage';

/**
 * 채팅 탭 → 채팅방 선택 시 열리는 전체화면 채팅.
 * 헤더에 그룹명/뒤로가기, 하단 탭은 숨기고 입력창을 화면 하단에 고정한다(bleed 레이아웃).
 */
export default function GroupChatRoomPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);

  const { data: group } = useQuery({
    queryKey: groupQueryKeys.detail(groupId),
    queryFn: () => getGroup(groupId),
    enabled: Number.isFinite(groupId),
  });

  return (
    <AppLayout title={group?.title ?? '채팅'} showBack hideBottomNav bleed>
      <GroupChatPage groupId={groupId} />
    </AppLayout>
  );
}
