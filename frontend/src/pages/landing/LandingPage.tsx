import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    emoji: '🗓️',
    title: '일정 함께 짜기',
    desc: '날짜별 일정 블록을 팀원 전원이 함께 편집하고 실시간으로 확인해요.',
    gradient: 'from-[#FFE5EF] to-[#FFF0F7]',
    accent: 'bg-[#E86A92]',
  },
  {
    emoji: '📍',
    title: '장소 보관함 & 투표',
    desc: '가고 싶은 곳을 모아두고 투표로 최종 장소를 결정해요.',
    gradient: 'from-[#EDE5FF] to-[#F5F0FF]',
    accent: 'bg-[#7C3AED]',
  },
  {
    emoji: '💸',
    title: '자동 1/N 정산',
    desc: '지출 기록만 하면 여행 후 자동으로 누가 누구에게 얼마를 보낼지 계산해드려요.',
    gradient: 'from-[#E5FFF0] to-[#F0FFF7]',
    accent: 'bg-[#059669]',
  },
  {
    emoji: '🏨',
    title: '숙소 한눈에 관리',
    desc: '날짜별 숙소 정보를 팀원 모두와 공유하고 예약 링크까지 바로 확인해요.',
    gradient: 'from-[#FFF5E5] to-[#FFFBF0]',
    accent: 'bg-[#D97706]',
  },
  {
    emoji: '💬',
    title: '채팅 & 게시판',
    desc: '이동 중에도 실시간 채팅으로 소통하고, 공지는 게시판에 남겨요.',
    gradient: 'from-[#E5F0FF] to-[#EEF5FF]',
    accent: 'bg-[#2563EB]',
  },
] as const;

const STEPS = [
  {
    title: '그룹 만들기',
    desc: '여행 목적지와 날짜를 설정하고 그룹을 생성해요.',
  },
  {
    title: '친구 초대',
    desc: '초대 코드 하나를 공유하면 팀원이 바로 합류해요.',
  },
  {
    title: '함께 계획',
    desc: '일정·장소·정산을 실시간으로 함께 관리해요.',
  },
] as const;

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1E0F1A] via-[#2D1528] to-[#130C20] px-6 text-center text-white">
        {/* 배경 블러 */}
        <div className="pointer-events-none absolute left-[15%] top-[20%] h-80 w-80 rounded-full bg-[#C25478]/30 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[15%] right-[10%] h-64 w-64 rounded-full bg-[#7C3AED]/25 blur-[80px]" />
        <div className="pointer-events-none absolute left-[5%] bottom-[30%] h-48 w-48 rounded-full bg-[#E86A92]/15 blur-[70px]" />

        {/* 앱 아이콘 */}
        <div className="relative mb-7 flex size-[88px] items-center justify-center rounded-[26px] bg-gradient-to-br from-[#E86A92] to-[#C25478] shadow-2xl shadow-[#C25478]/50">
          <span className="text-[42px]">✈️</span>
        </div>

        <p className="relative text-[11px] font-extrabold tracking-[0.25em] text-[#F0A6BE] uppercase">Groutrip</p>

        <h1 className="relative mt-3 text-[42px] font-extrabold leading-[1.15] tracking-tight sm:text-[52px]">
          함께하는<br />
          <span className="bg-gradient-to-r from-[#F0A6BE] to-[#C084FC] bg-clip-text text-transparent">
            모든 여행
          </span>
        </h1>

        <p className="relative mt-5 max-w-[300px] text-[16px] leading-relaxed text-white/65">
          일정, 장소, 정산까지<br />
          복잡한 그룹 여행을 하나의 앱에서
        </p>

        <div className="relative mt-10 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#E86A92] to-[#C25478] px-10 py-4 text-[17px] font-extrabold text-white shadow-xl shadow-[#C25478]/40 transition-all active:scale-95 hover:shadow-2xl hover:shadow-[#C25478]/50"
          >
            시작하기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="text-[12px] text-white/35">Google 계정으로 3초 만에 시작 · 무료</p>
        </div>

        {/* 미리보기 카드 — 서비스 분위기를 암시 */}
        <div className="relative mt-12 flex gap-2.5 overflow-hidden">
          {[
            { emoji: '🗓️', label: '일정' },
            { emoji: '📍', label: '장소' },
            { emoji: '💸', label: '정산' },
            { emoji: '🏨', label: '숙소' },
            { emoji: '💬', label: '채팅' },
          ].map((c) => (
            <div key={c.label} className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-5 py-3.5 backdrop-blur-sm">
              <span className="text-[22px]">{c.emoji}</span>
              <span className="text-[11px] font-bold text-white/75">{c.label}</span>
            </div>
          ))}
        </div>

        {/* 스크롤 힌트 */}
        <div className="absolute bottom-7 flex flex-col items-center gap-1.5 text-white/35">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase">Scroll</p>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="animate-bounce">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-lg px-5 py-20">
        <p className="text-center text-[11px] font-extrabold tracking-[0.2em] text-[#C25478] uppercase">Features</p>
        <h2 className="mt-2 text-center text-[28px] font-extrabold tracking-tight leading-snug">
          여행의 모든 것,<br />한 곳에서
        </h2>
        <p className="mt-3 text-center text-[14px] leading-relaxed text-muted">
          뿔뿔이 흩어진 엑셀, 카카오톡 링크, 계좌이체 메시지 대신<br />
          그루트립 하나면 돼요.
        </p>

        <div className="mt-10 space-y-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`flex items-start gap-4 rounded-2xl bg-gradient-to-br ${f.gradient} p-5 dark:bg-none dark:border dark:border-border dark:bg-surface`}
            >
              <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${f.accent} shadow-md`}>
                <span className="text-[22px]">{f.emoji}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-[16px] font-extrabold text-foreground">{f.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="bg-gradient-to-br from-[#FFF0F7] to-[#F3ECFF] px-5 py-20 dark:from-[#1A0F16] dark:to-[#120A1E]">
        <div className="mx-auto max-w-lg">
          <p className="text-center text-[11px] font-extrabold tracking-[0.2em] text-[#C25478] uppercase">How it works</p>
          <h2 className="mt-2 text-center text-[28px] font-extrabold tracking-tight">
            딱 3단계예요
          </h2>

          <div className="relative mt-12 space-y-0">
            {/* 세로 연결선 */}
            <div className="absolute left-[23px] top-12 h-[calc(100%-60px)] w-[2px] bg-gradient-to-b from-[#E86A92] to-[#C084FC]" />

            {STEPS.map((s, i) => (
              <div key={s.title} className="relative flex gap-5 pb-10 last:pb-0">
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E86A92] to-[#C25478] shadow-lg shadow-[#C25478]/30 text-white text-[17px] font-extrabold">
                  {i + 1}
                </div>
                <div className="min-w-0 pt-2.5">
                  <h3 className="text-[17px] font-extrabold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="mx-auto max-w-lg px-5 py-20">
        <p className="text-center text-[11px] font-extrabold tracking-[0.2em] text-[#C25478] uppercase">Why Groutrip</p>
        <h2 className="mt-2 text-center text-[28px] font-extrabold tracking-tight leading-snug">
          이런 경험,<br />다들 있으시죠?
        </h2>

        <div className="mt-10 space-y-3">
          {[
            { emoji: '😩', text: '"엑셀로 일정 짜다 지쳤어…"' },
            { emoji: '😅', text: '"정산 다 누가 해줘, 카톡 찾기 힘들어"' },
            { emoji: '🤯', text: '"장소 후보가 너무 많아 뭘로 정해야 할지"' },
          ].map((q) => (
            <div key={q.text} className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface px-4 py-4">
              <span className="text-[24px]">{q.emoji}</span>
              <p className="text-[14px] font-semibold text-foreground">{q.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#FFF0F7] to-[#F3ECFF] p-5 dark:from-[#1A0F16] dark:to-[#120A1E]">
          <p className="text-center text-[16px] font-extrabold text-foreground">
            그루트립이 전부 해결해드려요 ✈️
          </p>
          <p className="mt-2 text-center text-[13px] leading-relaxed text-muted">
            그룹 여행의 시작부터 정산까지, 앱 하나로 끝내세요.
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#E86A92] via-[#C25478] to-[#7C3AED] px-6 py-24 text-center text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-32 w-32 -translate-x-1/2 rounded-full bg-white/5" />

        <p className="relative text-[11px] font-extrabold tracking-[0.2em] text-white/60 uppercase">Ready?</p>
        <h2 className="relative mt-3 text-[32px] font-extrabold leading-snug tracking-tight">
          다음 여행은<br />그루트립과 함께
        </h2>
        <p className="relative mt-3 text-[15px] text-white/70">
          무료로 시작하고, 쉽게 계획하세요.
        </p>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="relative mt-10 inline-flex items-center gap-2.5 rounded-full bg-white px-10 py-4 text-[17px] font-extrabold text-[#C25478] shadow-2xl transition-all active:scale-95 hover:shadow-white/30"
        >
          지금 시작하기
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <p className="relative mt-4 text-[12px] text-white/40">Google 로그인 · 무료 · 회원가입 불필요</p>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface px-5 py-8 text-center">
        <p className="text-[13px] font-extrabold text-foreground">Groutrip ✈️</p>
        <p className="mt-1 text-[12px] text-muted">함께하는 여행 계획 플랫폼</p>
        <div className="mt-4 flex justify-center gap-5 text-[12px] text-muted">
          <button type="button" onClick={() => navigate('/privacy')} className="hover:text-foreground">
            개인정보처리방침
          </button>
          <button type="button" onClick={() => navigate('/terms')} className="hover:text-foreground">
            이용약관
          </button>
        </div>
      </footer>
    </div>
  );
}
