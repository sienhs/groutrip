import { Link } from 'react-router-dom';
import { useMyGroupsQuery } from '../../hooks/useGroupQueries';
import useAuthStore from '../../store/authStore';
import type { GroupResponse, GroupStatus } from '../../types/group';

const SECTION_CONFIG: Array<{
  status: Exclude<GroupStatus, 'DELETED'>;
  title: string;
  description: string;
}> = [
  { status: 'IN_PROGRESS', title: '여행 중', description: '지금 함께 만들고 있는 여행이에요.' },
  { status: 'PLANNING', title: '다가오는 여행', description: '설레는 여행을 차근차근 준비해 보세요.' },
  { status: 'COMPLETED', title: '지난 여행', description: '함께한 여행의 기록을 다시 만나보세요.' },
];

const COVER_STYLES = [
  'from-orange-200 to-rose-200',
  'from-sky-200 to-indigo-200',
  'from-emerald-200 to-teal-200',
  'from-violet-200 to-fuchsia-200',
];

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'short',
  day: 'numeric',
});

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function formatDateRange(group: GroupResponse): string {
  const startDate = dateFormatter.format(parseLocalDate(group.startDate));
  const endDate = dateFormatter.format(parseLocalDate(group.endDate));
  return `${startDate} – ${endDate}`;
}

function getDayLabel(group: GroupResponse): string {
  if (group.status === 'IN_PROGRESS') {
    return '여행 중';
  }
  if (group.status === 'COMPLETED') {
    return '완료';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((parseLocalDate(group.startDate).getTime() - today.getTime()) / 86_400_000);

  if (days <= 0) {
    return 'D-DAY';
  }
  return `D-${days}`;
}

function getCoverStyle(groupId: number): string {
  return COVER_STYLES[groupId % COVER_STYLES.length];
}

function GroupCard({ group }: { group: GroupResponse }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-28 items-end bg-gradient-to-br p-4 ${getCoverStyle(group.id)}`}>
        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-700 shadow-sm">
          {getDayLabel(group)}
        </span>
      </div>
      <div className="space-y-2 p-5">
        <h3 className="truncate text-lg font-bold text-gray-800">{group.title}</h3>
        <p className="flex items-center gap-1.5 text-sm text-gray-500">
          <span aria-hidden="true">📍</span>
          <span className="truncate">{group.destination}</span>
        </p>
        <p className="text-sm text-gray-400">{formatDateRange(group)}</p>
      </div>
    </article>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="여행 목록 불러오는 중">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-56 animate-pulse rounded-2xl bg-white shadow-sm" />
      ))}
    </div>
  );
}

export default function HomePage() {
  const userName = useAuthStore((state) => state.user?.name);
  const { data: groups = [], isPending, isError, refetch } = useMyGroupsQuery();
  const visibleGroups = groups.filter((group) => group.status !== 'DELETED');

  return (
    <main className="min-h-screen bg-[#FFF8F0] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#FF9F66]">나의 여행 서랍</p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {userName ? `${userName}님, 어디로 떠날까요?` : '어디로 떠날까요?'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-500">친구들과 준비 중인 여행을 한눈에 확인하세요.</p>
          </div>
          <Link
            to="/groups/new"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#FF9F66] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52] focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2"
          >
            + 새 여행 만들기
          </Link>
        </header>

        {isPending && <LoadingCards />}

        {isError && (
          <section className="rounded-2xl border border-red-100 bg-white px-6 py-12 text-center" role="alert">
            <p className="font-semibold text-gray-700">여행 목록을 불러오지 못했어요.</p>
            <p className="mt-2 text-sm text-gray-400">잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 rounded-lg bg-[#FF9F66] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52] focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2"
            >
              다시 시도
            </button>
          </section>
        )}

        {!isPending && !isError && visibleGroups.length === 0 && (
          <section className="rounded-2xl border border-dashed border-orange-200 bg-white/70 px-6 py-16 text-center">
            <div className="text-4xl" aria-hidden="true">🧳</div>
            <h2 className="mt-4 text-lg font-bold text-gray-800">아직 여행 그룹이 없어요</h2>
            <p className="mt-2 text-sm text-gray-500">첫 여행을 계획하고 친구들과 추억을 만들어 보세요!</p>
            <Link
              to="/groups/new"
              className="mt-6 inline-flex rounded-lg bg-[#FF9F66] px-5 py-3 text-sm font-semibold text-white hover:bg-[#f08c52]"
            >
              첫 여행 만들기
            </Link>
          </section>
        )}

        {!isPending && !isError && visibleGroups.length > 0 && (
          <div className="space-y-10">
            {SECTION_CONFIG.map((section) => {
              const sectionGroups = visibleGroups.filter((group) => group.status === section.status);
              if (sectionGroups.length === 0) {
                return null;
              }

              return (
                <section key={section.status} aria-labelledby={`group-section-${section.status}`}>
                  <div className="mb-4">
                    <h2 id={`group-section-${section.status}`} className="text-xl font-bold text-gray-800">
                      {section.title}
                      <span className="ml-2 text-sm font-medium text-[#FF9F66]">{sectionGroups.length}</span>
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">{section.description}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sectionGroups.map((group) => <GroupCard key={group.id} group={group} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
