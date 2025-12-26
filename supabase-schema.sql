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
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing databases:
-- ALTER TABLE families ADD COLUMN IF NOT EXISTS created_by UUID;
-- ALTER TABLE families ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
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
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
-- ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  content_type TEXT CHECK (content_type IN ('text', 'photo', 'video', 'audio')) DEFAULT 'text',
  content_url TEXT,
  message TEXT,
  post_type TEXT, -- Optional tag: good_news, win, surprise, curiosity, learning, grateful, weekend
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing databases:
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type TEXT;

-- Post media table (for multiple photos per post)
CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('photo', 'video')) DEFAULT 'photo',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient fetching of media by post
CREATE INDEX idx_post_media_post ON post_media(post_id, display_order);

-- Migration for existing databases:
-- CREATE TABLE post_media (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
--   media_url TEXT NOT NULL,
--   media_type TEXT CHECK (media_type IN ('photo', 'video')) DEFAULT 'photo',
--   display_order INTEGER DEFAULT 0,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );
-- CREATE INDEX idx_post_media_post ON post_media(post_id, display_order);

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
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- For tracking who was visited/called
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, week_number, completion_number)
);

-- Migration for existing databases:
-- ALTER TABLE completed_challenges ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

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
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

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

-- Post media policies
CREATE POLICY "Users can view post media in their family" ON post_media
  FOR SELECT USING (
    post_id IN (
      SELECT id FROM posts WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add media to their own posts" ON post_media
  FOR INSERT WITH CHECK (
    post_id IN (
      SELECT id FROM posts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete media from their own posts" ON post_media
  FOR DELETE USING (
    post_id IN (
      SELECT id FROM posts WHERE user_id = auth.uid()
    )
  );

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
-- Allow users to view completed challenges for all family members (for leaderboard)
CREATE POLICY "Users can view family completed challenges" ON completed_challenges
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can complete challenges" ON completed_challenges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Migration for existing databases:
-- DROP POLICY IF EXISTS "Users can view their own completed challenges" ON completed_challenges;
-- CREATE POLICY "Users can view family completed challenges" ON completed_challenges
--   FOR SELECT USING (
--     user_id IN (
--       SELECT id FROM users WHERE family_id IN (
--         SELECT family_id FROM users WHERE id = auth.uid()
--       )
--     )
--   );

-- Badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL,
  badge_type TEXT CHECK (badge_type IN ('weekly', 'achievement', 'milestone')) NOT NULL,
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's earned badges
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  week_number INTEGER, -- For weekly badges, NULL for milestone/achievement
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_id, week_number)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_week ON user_badges(week_number);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON badges FOR SELECT USING (true);

CREATE POLICY "Users can view family badges" ON user_badges
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE family_id IN (
        SELECT family_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can earn badges" ON user_badges
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Seed badge definitions
INSERT INTO badges (name, description, icon, badge_type, criteria) VALUES
  -- Weekly Leaderboard
  ('Gold', '1st place in weekly family leaderboard', '🥇', 'weekly', '{"rank": 1}'),
  ('Silver', '2nd place in weekly family leaderboard', '🥈', 'weekly', '{"rank": 2}'),
  ('Bronze', '3rd place in weekly family leaderboard', '🥉', 'weekly', '{"rank": 3}'),
  ('Most Improved', 'Biggest point increase vs previous week', '📈', 'weekly', '{"most_improved": true}'),

  -- Milestone Badges
  ('Century Club', 'Earned 100 total points', '💯', 'milestone', '{"points_total": 100}'),
  ('High Roller', 'Earned 500 total points', '🎰', 'milestone', '{"points_total": 500}'),
  ('Legend', 'Earned 1000 total points', '👑', 'milestone', '{"points_total": 1000}'),

  -- Achievement Badges
  ('Streak Master', 'Maintained a 4+ week streak', '🔥', 'achievement', '{"streak_weeks": 4}'),
  ('Comeback Kid', 'Returned after missing a week', '💪', 'achievement', '{"comeback": true}'),
  ('Storyteller', 'Shared 3 posts in a single week', '📖', 'achievement', '{"posts_per_week": 3}'),
  ('Visitor', 'Visited 3 different family members', '🏠', 'achievement', '{"unique_visits": 3}'),
  ('Connector', 'Called 5 different family members', '📞', 'achievement', '{"unique_calls": 5}'),
  ('Perfect Week', 'Completed every challenge in a week', '⭐', 'weekly', '{"perfect": true}'),
  ('Round Robin', 'Connected with every family member in one week', '🎯', 'weekly', '{"all_members": true}'),
  ('Bridge Builder', 'Most connected person in the family this week', '🌉', 'weekly', '{"most_connected": true}'),
  ('Inner Circle', 'Connected with same person 4 weeks in a row', '💫', 'achievement', '{"streak_weeks": 4}');

-- Migration for existing databases:
-- CREATE TABLE badges (...)
-- CREATE TABLE user_badges (...)
-- Run the CREATE POLICY statements
-- Run the INSERT INTO badges statements

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
  ('Visit a family member', 'Spend time with a relative you don''t live with', 10, '🏠', 3, true),
  ('Call a family member', 'Have a voice or video call with someone', 8, '📞', 6, true),
  ('Share a vlog update', 'Post a video update about your day', 7, '🎬', 3, true),
  ('Share a video highlight', 'Share the best moment of your week', 7, '⭐', 3, true),
  ('Share a struggle', 'Share something you found challenging this week', 7, '💪', 1, true),
  ('Share good news', 'Post something positive happening in your life', 5, '🎉', 1, true),
  ('Celebrate a win', 'Hype up a family member''s achievement', 5, '🏆', 1, true),
  ('Share a photo update', 'Post a photo of what you''re up to', 4, '📸', 3, true),
  ('Surprise of the week', 'Share something unexpected that happened', 4, '😲', 1, true),
  ('Curiosity of the week', 'Share something interesting you discovered', 4, '🔍', 1, true),
  ('Learning of the week', 'Share something new you learned', 4, '💡', 1, true),
  ('Share what you''re grateful for', 'Post something you''re thankful for', 3, '🙏', 1, true),
  ('Weekend plans check-in', 'Share or ask about weekend plans', 3, '📅', 1, true),
  ('Reply to a post', 'Leave a comment on someone''s update', 2, '💬', 1, true);

-- Migration: Update existing challenge points
-- UPDATE challenges SET points_value = 10 WHERE title = 'Visit a family member';
-- UPDATE challenges SET points_value = 8 WHERE title = 'Call a family member';
-- UPDATE challenges SET points_value = 7 WHERE title = 'Share a vlog update';
-- UPDATE challenges SET points_value = 7 WHERE title = 'Share a video highlight';
-- UPDATE challenges SET points_value = 7 WHERE title = 'Share a struggle';
-- UPDATE challenges SET points_value = 5 WHERE title = 'Share good news';
-- UPDATE challenges SET points_value = 5 WHERE title = 'Celebrate a win';
-- UPDATE challenges SET points_value = 4 WHERE title = 'Share a photo update';
-- UPDATE challenges SET points_value = 4 WHERE title = 'Surprise of the week';
-- UPDATE challenges SET points_value = 4 WHERE title = 'Curiosity of the week';
-- UPDATE challenges SET points_value = 4 WHERE title = 'Learning of the week';
-- UPDATE challenges SET points_value = 3 WHERE title = 'Share what you''re grateful for';
-- UPDATE challenges SET points_value = 3 WHERE title = 'Weekend plans check-in';
-- UPDATE challenges SET points_value = 2 WHERE title = 'Reply to a post';
-- INSERT INTO challenges (title, description, points_value, icon, max_completions_per_week, is_active)
-- VALUES ('Share a struggle', 'Share something you found challenging this week', 7, '💪', 1, true);
