/**
 * 로그인/회원가입 공용 상단 브랜드 블록과 비밀번호 표시 토글.
 * 헤더 로고(편돌즈.trip 핀)와 동일한 모티프를 크게 사용한다.
 */

interface AuthBrandProps {
  subtitle: string;
}

export default function AuthBrand({ subtitle }: AuthBrandProps) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <span className="flex size-14 items-center justify-center rounded-card bg-primary shadow-sm">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21s-7-5.2-7-10.5A7 7 0 0 1 12 3.5a7 7 0 0 1 7 7C19 15.8 12 21 12 21Z"
            stroke="#fff"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="10.5" r="2.2" fill="#fff" />
        </svg>
      </span>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground">편돌즈<span className="text-muted">.trip</span></h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  );
}

interface PasswordToggleProps {
  shown: boolean;
  onToggle: () => void;
}

/** 비밀번호 표시/숨김 토글 버튼(Input trailing 용). */
export function PasswordToggle({ shown, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? '비밀번호 숨기기' : '비밀번호 표시'}
      className="flex items-center justify-center text-[#9A95A8] hover:text-muted"
    >
      {shown ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.4 5.2A9.3 9.3 0 0112 5c5 0 9 4.5 9 7 0 1-.7 2.3-1.9 3.5M6.2 6.7C3.9 8 2.5 10 2.5 12c0 0 3 7 9.5 7 1.4 0 2.7-.3 3.8-.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}
    </button>
  );
}
