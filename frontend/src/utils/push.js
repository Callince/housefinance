import api from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function registerServiceWorker() {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.error('SW registration failed', e);
    return null;
  }
}

export async function getCurrentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush() {
  if (!pushSupported()) {
    throw new Error('Push notifications not supported by this browser');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Get VAPID public key from backend
  const keyRes = await api.get('/push/vapid-public-key');
  const publicKey = keyRes.data.public_key;

  const reg = await navigator.serviceWorker.ready;

  // Unsubscribe from any old subscription
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // Send to backend
  const subJson = subscription.toJSON();
  await api.post('/push/subscribe', {
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    },
    user_agent: navigator.userAgent,
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  try {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
  } catch (e) {
    // Best-effort cleanup
  }
  await sub.unsubscribe();
}

export async function sendTestNotification() {
  const res = await api.post('/push/test');
  return res.data;
}
