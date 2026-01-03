import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push@3.6.7"

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!

    webpush.setVapidDetails(
      'mailto:noreply@fambam.app',
      vapidPublicKey,
      vapidPrivateKey
    )

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload: WebhookPayload = await req.json()

    let notifications: { userId: string; title: string; body: string; url: string }[] = []

    // Handle posts
    if (payload.table === 'posts' && payload.type === 'INSERT') {
      const post = payload.record
      const posterId = post.user_id as string
      const familyId = post.family_id as string

      if (!familyId) {
        return new Response(
          JSON.stringify({ success: false, error: 'No family_id' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: poster } = await supabase
        .from('users')
        .select('name')
        .eq('id', posterId)
        .single()

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
    }

    // Handle comments
    else if (payload.table === 'comments' && payload.type === 'INSERT') {
      const comment = payload.record
      const commenterId = comment.user_id as string
      const postId = comment.post_id as string

      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()

      if (post && post.user_id !== commenterId) {
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
    }

    // Handle reactions
    else if (payload.table === 'reactions' && payload.type === 'INSERT') {
      const reaction = payload.record
      const reactorId = reaction.user_id as string
      const postId = reaction.post_id as string
      const emoji = reaction.emoji as string

      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single()

      if (post && post.user_id !== reactorId) {
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
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', notification.userId)
        .single()

      if (subscription) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          }

          await webpush.sendNotification(pushSubscription, JSON.stringify({
            title: notification.title,
            body: notification.body,
            url: notification.url,
            icon: '/favicon.svg'
          }))
          sent++
        } catch (err) {
          console.error('Push failed for', notification.userId, err)
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
      JSON.stringify({ error: 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
