const key = (userId: number) => `onboarded_${userId}`;

export const isOnboarded = (userId: number): boolean =>
  !!localStorage.getItem(key(userId));

export const markOnboarded = (userId: number): void => {
  localStorage.setItem(key(userId), '1');
};
