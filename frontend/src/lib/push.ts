function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function currentPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  return Notification.requestPermission();
}

export async function subscribePush(): Promise<PushSubscription | null> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  });
}

export async function unsubscribePush(): Promise<boolean> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;
  return sub.unsubscribe();
}
