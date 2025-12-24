import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  old_record?: Record<string, unknown>
}

interface PushSubscription {
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: WebhookPayload = await req.json()
    console.log('Received webhook:', payload.type, payload.table)

    let notifications: { userId: string; title: string; body: string; url: string }[] = []

    // Handle different tables
    if (payload.table === 'posts' && payload.type === 'INSERT') {
      // New post - notify all family members except the poster
      const post = payload.record
      const posterId = post.user_id as string
      const familyId = post.family_id as string

      // Get poster name
      const { data: poster } = await supabase
        .from('users')
        .select('name')
        .eq('id', posterId)
        .single()

      // Get all family members except poster
      const { data: familyMembers } = await supabase
        .from('users')
        .select('id')
        .eq('family_id', familyId)
        .neq('id', posterId)

      if (familyMembers) {
        notifications = familyMembers.map(member => ({
          userId: member.id,
          title: 'New Post',
          body: `${poster?.name || 'Someone'} shared an update`,
          url: '/feed'
        }))
      }
    } else if (payload.table === 'comments' && payload.type === 'INSERT') {
      // New comment - notify post author
      const comment = payload.record
      const commenterId = comment.user_id as string
      const postId = comment.post_id as string

      // Get post author
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()

      if (post && post.user_id !== commenterId) {
        // Get commenter name
        const { data: commenter } = await supabase
          .from('users')
          .select('name')
          .eq('id', commenterId)
          .single()

        notifications = [{
          userId: post.user_id,
          title: 'New Comment',
          body: `${commenter?.name || 'Someone'} commented on your post`,
          url: '/feed'
        }]
      }
    } else if (payload.table === 'reactions' && payload.type === 'INSERT') {
      // New reaction - notify post author
      const reaction = payload.record
      const reactorId = reaction.user_id as string
      const postId = reaction.post_id as string
      const emoji = reaction.emoji as string

      // Get post author
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()

      if (post && post.user_id !== reactorId) {
        // Get reactor name
        const { data: reactor } = await supabase
          .from('users')
          .select('name')
          .eq('id', reactorId)
          .single()

        notifications = [{
          userId: post.user_id,
          title: 'New Reaction',
          body: `${reactor?.name || 'Someone'} reacted ${emoji} to your post`,
          url: '/feed'
        }]
      }
    }

    // Send push notifications
    let sent = 0
    for (const notification of notifications) {
      // Get push subscription for this user
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', notification.userId)
        .single()

      if (subscription) {
        try {
          await sendPushNotification(
            subscription as PushSubscription,
            {
              title: notification.title,
              body: notification.body,
              url: notification.url
            },
            vapidPublicKey,
            vapidPrivateKey,
            supabaseUrl
          )
          sent++
        } catch (err) {
          console.error('Failed to send push to', notification.userId, err)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Send push notification using Web Push protocol
async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  audience: string
) {
  const encoder = new TextEncoder()

  // Import VAPID keys
  const publicKeyData = base64UrlToUint8Array(vapidPublicKey)
  const privateKeyData = base64UrlToUint8Array(vapidPrivateKey)

  // Create VAPID JWT
  const vapidToken = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey)

  // Encrypt payload
  const payloadJson = JSON.stringify(payload)
  const encrypted = await encryptPayload(
    payloadJson,
    subscription.p256dh,
    subscription.auth
  )

  // Send to push endpoint
  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${vapidToken}, k=${vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400'
    },
    body: encrypted
  })

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status} ${await response.text()}`)
  }
}

// Create VAPID JWT token
async function createVapidJwt(audience: string, publicKey: string, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: new URL(audience).origin,
    exp: now + 86400,
    sub: 'mailto:noreply@fambam.app'
  }

  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key for signing
  const privateKeyData = base64UrlToUint8Array(privateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  return `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`
}

// Encrypt push payload (simplified - in production use a proper web-push library)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  // This is a simplified implementation
  // For production, use a proper web-push encryption library

  const encoder = new TextEncoder()
  const payloadBytes = encoder.encode(payload)

  // Generate local key pair for ECDH
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    'raw',
    base64UrlToUint8Array(p256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: subscriberKey },
    localKeyPair.privateKey,
    256
  )

  // Derive encryption key using HKDF
  const authSecret = base64UrlToUint8Array(auth)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(sharedSecret),
    'HKDF',
    false,
    ['deriveBits']
  )

  const contentEncryptionKey = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: encoder.encode('Content-Encoding: aes128gcm\0')
    },
    keyMaterial,
    128
  )

  const nonce = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt,
      info: encoder.encode('Content-Encoding: nonce\0')
    },
    keyMaterial,
    96
  )

  // Encrypt with AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(contentEncryptionKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  // Add padding
  const paddedPayload = new Uint8Array(payloadBytes.length + 2)
  paddedPayload[0] = 0 // Padding length high byte
  paddedPayload[1] = 0 // Padding length low byte
  paddedPayload.set(payloadBytes, 2)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonce) },
    aesKey,
    paddedPayload
  )

  // Export local public key
  const localPublicKey = await crypto.subtle.exportKey('raw', localKeyPair.publicKey)

  // Build final message: salt + rs + idlen + keyid + encrypted
  const recordSize = 4096
  const result = new Uint8Array(
    16 + 4 + 1 + 65 + encrypted.byteLength
  )
  result.set(salt, 0)
  result.set(new Uint8Array([0, 0, 16, 0]), 16) // Record size
  result[20] = 65 // Key ID length
  result.set(new Uint8Array(localPublicKey), 21)
  result.set(new Uint8Array(encrypted), 86)

  return result
}

// Utility functions
function base64UrlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)))
}
