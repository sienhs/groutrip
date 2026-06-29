// 온보딩 완료 여부의 권위 출처는 서버(계정 단위)다. 아래는 같은 기기에서의 보조 캐시일 뿐이다.
const key = (userId: number) => `onboarded_${userId}`;

export const isOnboardedLocal = (userId: number): boolean =>
  !!localStorage.getItem(key(userId));

export const markOnboardedLocal = (userId: number): void => {
  localStorage.setItem(key(userId), '1');
};
