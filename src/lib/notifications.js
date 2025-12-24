import { supabase } from './supabase'

// Check if push notifications are supported
export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

// Get current notification permission status
export function getNotificationPermission() {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission // 'default', 'granted', or 'denied'
}

// Request notification permission
export async function requestNotificationPermission() {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported')
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Register service worker
export async function registerServiceWorker() {
  if (!isPushSupported()) {
    throw new Error('Service workers not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

// Get existing service worker registration
export async function getServiceWorkerRegistration() {
  if (!isPushSupported()) return null
  return navigator.serviceWorker.ready
}

// Subscribe to push notifications
export async function subscribeToPush(userId, vapidPublicKey) {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported')
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  const registration = await getServiceWorkerRegistration()
  if (!registration) {
    throw new Error('No service worker registration')
  }

  // Check for existing subscription
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    // Create new subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    })
  }

  // Store subscription in database
  const subscriptionData = subscription.toJSON()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscriptionData.endpoint,
      p256dh: subscriptionData.keys.p256dh,
      auth: subscriptionData.keys.auth
    }, {
      onConflict: 'user_id'
    })

  if (error) {
    console.error('Failed to save subscription:', error)
    throw error
  }

  return subscription
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(userId) {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return

  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }

  // Remove from database
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
}

// Check if user is subscribed
export async function isSubscribedToPush() {
  const registration = await getServiceWorkerRegistration()
  if (!registration) return false

  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}

// Helper: Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
