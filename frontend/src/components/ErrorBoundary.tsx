import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

/**
 * 런타임 에러를 잡아 앱 전체 크래시를 막는 클래스 컴포넌트.
 * React는 함수형 에러 바운더리를 아직 지원하지 않는다.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="text-[44px]">😵</div>
          <h2 className="text-[19px] font-extrabold text-foreground">앗, 문제가 생겼어요</h2>
          <p className="max-w-xs text-[13px] leading-relaxed text-muted">
            예상치 못한 오류가 발생했어요.<br />
            화면을 다시 불러오거나 잠시 후 다시 시도해 주세요.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-button border border-border bg-surface px-4 py-2.5 text-[14px] font-bold text-foreground hover:bg-background"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-button bg-primary px-4 py-2.5 text-[14px] font-bold text-primary-foreground"
            >
              새로고침
            </button>
          </div>
          {import.meta.env.DEV && (
            <details className="mt-2 max-w-sm text-left">
              <summary className="cursor-pointer text-[11px] text-muted">오류 상세 (개발 모드)</summary>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-black/5 p-3 text-[10px] text-muted">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
