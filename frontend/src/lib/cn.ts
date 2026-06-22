/**
 * 클래스명을 조건부로 합치는 최소 유틸 (clsx 미도입 → 자체 구현).
 * cn('a', cond && 'b', undefined) → 'a b'
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
