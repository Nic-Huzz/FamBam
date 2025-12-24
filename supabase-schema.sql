-- FamBam Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing databases:
-- ALTER TABLE families ADD COLUMN IF NOT EXISTS created_by UUID;

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  points_total INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_challenge_week INTEGER,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing databases:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS last_challenge_week INTEGER;

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  content_type TEXT CHECK (content_type IN ('text', 'photo', 'video', 'audio')) DEFAULT 'text',
  content_url TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions table
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  points_value INTEGER NOT NULL DEFAULT 10,
  icon TEXT,
  max_completions_per_week INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Completed challenges table
CREATE TABLE completed_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  completion_number INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, week_number, completion_number)
);

-- Push notification subscriptions table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_posts_family_created ON posts(family_id, created_at DESC);
CREATE INDEX idx_completed_challenges_user_week ON completed_challenges(user_id, week_number);
CREATE INDEX idx_users_family ON users(family_id);
CREATE INDEX idx_reactions_post ON reactions(post_id);
CREATE INDEX idx_comments_post ON comments(post_id);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Families policies
CREATE POLICY "Users can view their own family" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Anyone can create a family" ON families
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update their family" ON families
  FOR UPDATE USING (created_by = auth.uid());

-- Migration for existing databases:
-- CREATE POLICY "Admin can update their family" ON families FOR UPDATE USING (created_by = auth.uid());

-- Users policies
CREATE POLICY "Users can view family members" ON users
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admin can remove members from family" ON users
  FOR UPDATE USING (
    family_id IN (
      SELECT id FROM families WHERE created_by = auth.uid()
    )
  );

-- Migration for existing databases:
-- CREATE POLICY "Admin can remove members from family" ON users FOR UPDATE USING (family_id IN (SELECT id FROM families WHERE created_by = auth.uid()));

-- Posts policies
CREATE POLICY "Users can view posts in their family" ON posts
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create posts in their family" ON posts
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    family_id IN (SELECT family_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (user_id = auth.uid());

-- Reactions policies
CREATE POLICY "Users can view reactions on visible posts" ON reactions
  FOR SELECT USING (
    post_id IN (
      SELECT id FROM posts WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add reactions to visible posts" ON reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    post_id IN (
      SELECT id FROM posts WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can remove their own reactions" ON reactions
  FOR DELETE USING (user_id = auth.uid());

-- Comments policies
CREATE POLICY "Users can view comments on visible posts" ON comments
  FOR SELECT USING (
    post_id IN (
      SELECT id FROM posts WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add comments to visible posts" ON comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    post_id IN (
      SELECT id FROM posts WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (user_id = auth.uid());

-- Challenges policies (read-only for users)
CREATE POLICY "Anyone can view active challenges" ON challenges
  FOR SELECT USING (is_active = true);

-- Completed challenges policies
CREATE POLICY "Users can view their own completed challenges" ON completed_challenges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can complete challenges" ON completed_challenges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Push subscriptions policies
CREATE POLICY "Users can view their own push subscription" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own push subscription" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push subscription" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscription" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Seed data: Challenges
INSERT INTO challenges (title, description, points_value, icon, max_completions_per_week, is_active) VALUES
  ('Call a family member', 'Have a voice or video call with someone', 50, '📞', 6, true),
  ('Share a photo update', 'Post a photo of what you''re up to', 40, '📸', 3, true),
  ('Share a vlog update', 'Post a video update about your day', 50, '🎬', 3, true),
  ('Share a video highlight', 'Share the best moment of your week', 40, '⭐', 3, true),
  ('Reply to a post', 'Leave a comment on someone''s update', 20, '💬', 1, true),
  ('Share good news', 'Post something positive happening in your life', 40, '🎉', 1, true),
  ('Celebrate a win', 'Hype up a family member''s achievement', 35, '🏆', 1, true),
  ('Weekend plans check-in', 'Share or ask about weekend plans', 25, '📅', 1, true),
  ('Share what you''re grateful for', 'Post something you''re thankful for', 30, '🙏', 1, true),
  ('Surprise of the week', 'Share something unexpected that happened', 35, '😲', 1, true),
  ('Curiosity of the week', 'Share something interesting you discovered', 35, '🔍', 1, true),
  ('Learning of the week', 'Share something new you learned', 35, '💡', 1, true);
