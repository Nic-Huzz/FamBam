# Supabase Edge Functions Setup

## Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
cd /path/to/FamBam
supabase link --project-ref nxgekhiknodvxrfvkugk
```

## Deploy the Notification Function

1. Set up secrets (you need the VAPID private key from when you generated keys):
```bash
supabase secrets set VAPID_PUBLIC_KEY="BHH1ADIllMqPhPY67UKdAqdEYIFN19uvPZKNVRNM0lFzJaNl5RXfCn6fykAA2igdRxjPmkz_5veGvh5bz2ckSkU"
supabase secrets set VAPID_PRIVATE_KEY="your-vapid-private-key-here"
```

2. Deploy the function:
```bash
supabase functions deploy send-notification
```

## Set Up Database Webhooks

In the Supabase Dashboard:

1. Go to **Database** → **Webhooks**
2. Create webhooks for each table:

### Posts Webhook
- **Name:** `new-post-notification`
- **Table:** `posts`
- **Events:** `INSERT`
- **Type:** `Supabase Edge Function`
- **Function:** `send-notification`

### Comments Webhook
- **Name:** `new-comment-notification`
- **Table:** `comments`
- **Events:** `INSERT`
- **Type:** `Supabase Edge Function`
- **Function:** `send-notification`

### Reactions Webhook
- **Name:** `new-reaction-notification`
- **Table:** `reactions`
- **Events:** `INSERT`
- **Type:** `Supabase Edge Function`
- **Function:** `send-notification`

## Database Migrations

Run these SQL commands in the Supabase SQL Editor if upgrading an existing database:

```sql
-- Add created_by column to families table for admin tracking
ALTER TABLE families ADD COLUMN IF NOT EXISTS created_by UUID;

-- Add RLS policy for family updates
CREATE POLICY "Admin can update their family" ON families
  FOR UPDATE USING (created_by = auth.uid());

-- Add RLS policy for admin to remove members
CREATE POLICY "Admin can remove members from family" ON users
  FOR UPDATE USING (
    family_id IN (
      SELECT id FROM families WHERE created_by = auth.uid()
    )
  );
```

## Testing

To test notifications locally:
```bash
supabase functions serve send-notification
```

Then trigger a test by creating a new post in the app.

## Troubleshooting

- Check function logs: `supabase functions logs send-notification`
- Verify secrets are set: `supabase secrets list`
- Check webhook delivery in Dashboard → Database → Webhooks → Logs
