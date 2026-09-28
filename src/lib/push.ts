// src/lib/push.ts
// Web Push subscription helpers. The subscription is stored in Supabase so the
// server (Edge Function) can send notifications even when the app is closed.
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID_PUBLIC_KEY;

function base64UrlToUint8Array(base64Url: string) {
  const base64 = (base64Url + '='.repeat((4 - base64Url.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

// getRegistration() resolves to undefined instead of hanging like serviceWorker.ready
export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function enablePush(): Promise<NotificationPermission> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) throw new Error('Service worker is not registered');

  const subscription = (await registration.pushManager.getSubscription())
    ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY!),
    });

  const { keys } = subscription.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: keys!.p256dh,
    p_auth: keys!.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;

  return permission;
}

// Must run while the user is still signed in (RLS delete needs auth.uid()).
export async function disablePush() {
  const subscription = await getPushSubscription();
  if (!subscription) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}
