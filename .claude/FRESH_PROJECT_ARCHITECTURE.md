# Fresh Project Architecture Guide

A reference guide for starting new React projects with a clean, scalable architecture.

---

## Recommended Folder Structure

```
src/
├── components/          # Reusable UI only (buttons, modals, cards)
│   ├── ui/              # Pure UI (no business logic)
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   ├── Skeleton.jsx
│   │   └── Input.jsx
│   └── composed/        # Composed from ui/ components
│       ├── PostCard.jsx
│       ├── UserAvatar.jsx
│       └── SearchBar.jsx
│
├── features/            # Feature-based modules (the big win)
│   ├── auth/
│   │   ├── components/  # Auth-specific components
│   │   │   ├── LoginForm.jsx
│   │   │   └── SignupForm.jsx
│   │   ├── hooks/       # useAuth, useLogin
│   │   │   └── useAuth.js
│   │   ├── services/    # authService.js
│   │   │   └── authService.js
│   │   └── index.js     # Public exports
│   ├── posts/
│   │   ├── components/
│   │   │   ├── PostList.jsx
│   │   │   └── PostEditor.jsx
│   │   ├── hooks/
│   │   │   └── usePosts.js
│   │   ├── services/
│   │   │   └── postService.js
│   │   └── index.js
│   ├── challenges/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.js
│   └── badges/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── index.js
│
├── hooks/               # Global custom hooks (not feature-specific)
│   ├── useDebounce.js
│   ├── useLocalStorage.js
│   ├── useMediaQuery.js
│   └── useOnClickOutside.js
│
├── lib/                 # Pure utilities (no React)
│   ├── dateUtils.js
│   ├── formatters.js
│   ├── validators.js
│   └── constants.js
│
├── services/            # API layer (shared across features)
│   ├── api.js           # Base fetch wrapper
│   └── supabase.js      # DB client config
│
├── context/             # React Context providers
│   └── ThemeContext.jsx
│
├── pages/               # Route components (thin wrappers)
│   ├── HomePage.jsx
│   ├── ProfilePage.jsx
│   └── SettingsPage.jsx
│
├── styles/              # Global styles
│   ├── index.css
│   └── variables.css
│
├── App.jsx              # Root component with routing
└── main.jsx             # Entry point
```

---

## Key Principles

### 1. Feature-Based Organization

**The most important architectural decision.** Group code by feature, not by type.

```
# BAD - Type-based organization
# When working on "posts", you touch 4+ folders

components/
  PostCard.jsx
  ChallengeCard.jsx
  BadgeDisplay.jsx
hooks/
  usePosts.js
  useChallenges.js
  useBadges.js
services/
  postService.js
  challengeService.js
  badgeService.js

# GOOD - Feature-based organization
# When working on "posts", everything is in one folder

features/
  posts/
    PostCard.jsx
    PostList.jsx
    usePosts.js
    postService.js
    index.js
  challenges/
    ChallengeCard.jsx
    useChallenges.js
    challengeService.js
    index.js
  badges/
    BadgeDisplay.jsx
    useBadges.js
    badgeService.js
    index.js
```

**Benefits:**
- Work on one feature = one folder
- Delete a feature = delete one folder
- Easy to find related code
- Natural code boundaries
- Scales with team size

---

### 2. The Rule of Three Layers

Every feature follows this pattern:

```
Page (thin) → Feature Components → Services/Hooks
     ↓              ↓                    ↓
  Layout      UI + Logic           Data fetching
```

**Layer 1: Pages (Thin Wrappers)**

Pages only compose feature components. No business logic.

```jsx
// pages/FeedPage.jsx - THIN
export default function FeedPage() {
  return (
    <PageLayout>
      <PostList />        {/* from features/posts */}
      <Sidebar>
        <ChallengeWidget />
        <LeaderboardWidget />
      </Sidebar>
    </PageLayout>
  );
}
```

**Layer 2: Feature Components**

Components that combine UI with feature-specific logic.

```jsx
// features/posts/components/PostList.jsx
import { usePosts } from '../hooks/usePosts';
import { PostCard } from './PostCard';
import { Skeleton } from '@/components/ui';

export function PostList({ familyId }) {
  const { posts, loading, error } = usePosts(familyId);

  if (loading) return <Skeleton count={3} />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="post-list">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

**Layer 3: Hooks & Services**

All data fetching and business logic lives here.

```jsx
// features/posts/hooks/usePosts.js
export function usePosts(familyId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await postService.getByFamily(familyId);
      setPosts(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  const create = useCallback(async (postData) => {
    const newPost = await postService.create(postData);
    setPosts(prev => [newPost, ...prev]);
    return newPost;
  }, []);

  const remove = useCallback(async (postId) => {
    await postService.delete(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { posts, loading, error, refresh: fetch, create, remove };
}
```

---

### 3. File Size Limits

Enforce these from day one:

| File Type | Max Lines | When Exceeded |
|-----------|-----------|---------------|
| Component | 200 | Extract subcomponents |
| Hook | 100 | Split into smaller hooks |
| Service | 150 | Split by entity/action |
| Utility | 100 | Split by category |
| Page | 50 | Extract to feature components |

**Warning Signs:**
- Component over 150 lines → start thinking about splitting
- Component over 200 lines → must split
- Component over 300 lines → architectural problem

---

### 4. Establish Utilities Early

Create these files on day one, even if mostly empty:

```javascript
// lib/dateUtils.js
export function formatDate(date, format = 'short') {
  // Implementation
}

export function timeAgo(date) {
  // Implementation
}

export function getWeekNumber(date) {
  // Implementation
}

export function getWeekDateRange(weekNumber) {
  // Implementation
}
```

```javascript
// lib/formatters.js
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatName(firstName, lastName) {
  return `${firstName} ${lastName}`.trim();
}

export function truncate(str, length = 100) {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}
```

```javascript
// lib/validators.js
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  return /^\+?[\d\s-]{10,}$/.test(phone);
}
```

```javascript
// services/api.js
const BASE_URL = import.meta.env.VITE_API_URL;

async function request(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, data) => request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  put: (endpoint, data) => request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
```

**Why create these early:**
- When utilities exist, developers use them
- When they don't exist, developers inline code and create duplicates
- Prevents the "I'll refactor later" debt that never gets paid

---

### 5. Custom Hooks for Every Data Source

Every data source (API endpoint, database table, external service) gets a hook:

```javascript
// features/posts/hooks/usePosts.js
export function usePosts(familyId) {
  const [state, setState] = useState({
    data: [],
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await postService.getByFamily(familyId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState(s => ({ ...s, loading: false, error }));
    }
  }, [familyId]);

  const create = useCallback(async (post) => {
    const newPost = await postService.create(post);
    setState(s => ({ ...s, data: [newPost, ...s.data] }));
    return newPost;
  }, []);

  const update = useCallback(async (id, updates) => {
    const updated = await postService.update(id, updates);
    setState(s => ({
      ...s,
      data: s.data.map(p => p.id === id ? updated : p),
    }));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await postService.delete(id);
    setState(s => ({
      ...s,
      data: s.data.filter(p => p.id !== id),
    }));
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    posts: state.data,
    loading: state.loading,
    error: state.error,
    refresh: fetch,
    create,
    update,
    remove,
  };
}
```

**Benefits:**
- Components stay thin and focused on UI
- Logic is testable in isolation
- Reusable across multiple pages
- Consistent loading/error handling
- Easy to add caching later

---

### 6. Index Files for Clean Imports

Every feature folder has an index.js that exports its public API:

```javascript
// features/posts/index.js
export { PostList } from './components/PostList';
export { PostCard } from './components/PostCard';
export { PostEditor } from './components/PostEditor';
export { usePosts } from './hooks/usePosts';
export { usePost } from './hooks/usePost';
```

**Usage:**

```javascript
// Clean imports from features
import { PostList, usePosts } from '@/features/posts';
import { ChallengeCard, useChallenges } from '@/features/challenges';
import { BadgeDisplay } from '@/features/badges';

// Clean imports from components
import { Button, Modal, Skeleton } from '@/components/ui';
```

**Vite path alias setup (vite.config.js):**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## Quick Start Checklist

When starting a new project:

```bash
# 1. Create folder structure
mkdir -p src/components/{ui,composed}
mkdir -p src/features
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/services
mkdir -p src/pages
mkdir -p src/context
mkdir -p src/styles

# 2. Create utility stubs
touch src/lib/dateUtils.js
touch src/lib/formatters.js
touch src/lib/validators.js
touch src/lib/constants.js

# 3. Create service stubs
touch src/services/api.js
touch src/services/supabase.js

# 4. Create global hooks folder
touch src/hooks/useDebounce.js
touch src/hooks/useLocalStorage.js

# 5. Create CLAUDE.md with project rules
touch CLAUDE.md

# 6. Set up .claude folder for rules
mkdir -p .claude/rules .claude/hooks
```

---

## Common Patterns

### Service Layer Pattern

```javascript
// features/posts/services/postService.js
import { supabase } from '@/services/supabase';

export const postService = {
  async getByFamily(familyId) {
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles(*)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(postId) {
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles(*), comments(*)')
      .eq('id', postId)
      .single();

    if (error) throw error;
    return data;
  },

  async create(post) {
    const { data, error } = await supabase
      .from('posts')
      .insert(post)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(postId, updates) {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(postId) {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;
  },
};
```

### Component Composition Pattern

```jsx
// features/posts/components/PostCard.jsx
import { Card, Avatar, Button } from '@/components/ui';
import { timeAgo } from '@/lib/dateUtils';
import { PostActions } from './PostActions';
import { PostMedia } from './PostMedia';
import './PostCard.css';

export function PostCard({ post, onDelete }) {
  return (
    <Card className="post-card">
      <PostHeader author={post.author} date={post.created_at} />
      <PostContent content={post.content} />
      {post.media && <PostMedia media={post.media} />}
      <PostActions post={post} onDelete={onDelete} />
    </Card>
  );
}

function PostHeader({ author, date }) {
  return (
    <div className="post-header">
      <Avatar src={author.avatar_url} name={author.name} />
      <div>
        <span className="author-name">{author.name}</span>
        <span className="post-date">{timeAgo(date)}</span>
      </div>
    </div>
  );
}

function PostContent({ content }) {
  return <p className="post-content">{content}</p>;
}
```

---

## Anti-Patterns to Avoid

### 1. Mega Components

```jsx
// BAD: Everything in one file
function Profile() {
  // 50 lines of state
  // 100 lines of useEffects
  // 150 lines of handlers
  // 400 lines of JSX
  // Total: 700+ lines
}

// GOOD: Split by responsibility
function ProfilePage() {
  return (
    <PageLayout>
      <ProfileHeader />
      <ProfileTabs>
        <BadgesTab />
        <ConnectionsTab />
        <SettingsTab />
      </ProfileTabs>
    </PageLayout>
  );
}
```

### 2. Inline Data Fetching

```jsx
// BAD: Fetching in component
function PostList() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    supabase.from('posts').select('*').then(({ data }) => {
      setPosts(data);
    });
  }, []);

  // ...
}

// GOOD: Custom hook
function PostList() {
  const { posts, loading } = usePosts();
  // ...
}
```

### 3. Duplicate Utilities

```jsx
// BAD: Same function in multiple files
// File1.jsx
const timeAgo = (date) => { /* implementation */ };

// File2.jsx
const timeAgo = (date) => { /* same implementation */ };

// GOOD: Shared utility
// lib/dateUtils.js
export const timeAgo = (date) => { /* single implementation */ };

// File1.jsx & File2.jsx
import { timeAgo } from '@/lib/dateUtils';
```

### 4. Props Drilling

```jsx
// BAD: Passing props through many levels
<App user={user}>
  <Layout user={user}>
    <Page user={user}>
      <Header user={user}>
        <Avatar user={user} />
      </Header>
    </Page>
  </Layout>
</App>

// GOOD: Context for global state
<AuthProvider>
  <App>
    <Layout>
      <Page>
        <Header>
          <Avatar /> {/* Uses useAuth() internally */}
        </Header>
      </Page>
    </Layout>
  </App>
</AuthProvider>
```

---

## The Castle Analogy

| Concept | Castle Equivalent |
|---------|-------------------|
| **Feature-based folders** | Each tower is self-contained with its own stairs, rooms, and supplies |
| **Type-based folders** | All stairs in one place, all rooms in another - confusing to navigate |
| **Thin pages** | The castle map shows where towers are, but doesn't contain the towers |
| **Custom hooks** | Standardized plumbing that works the same in every tower |
| **Early utilities** | The shared toolshed everyone uses instead of hoarding their own tools |
| **Size limits** | Building codes that prevent towers from getting so tall they collapse |
| **Index files** | Clear signage at each tower entrance showing what's inside |

---

## Configuring Claude Code to Enforce These Rules

Set up Claude Code so it automatically follows these architecture patterns and catches violations.

### 1. CLAUDE.md - The Instruction Manual

Create a `CLAUDE.md` file in your project root (or run `/init`):

```markdown
# Project Architecture Rules

## Component Size Limits
- Maximum 300 lines per component
- If larger, split into subcomponents or extract custom hooks
- Profile.jsx style mega-components are NOT allowed

## File Organization
- Shared utilities go in src/lib/
- NEVER duplicate functions like getWeekStartDate() - use dateUtils.js
- Connection filtering logic lives in connectionUtils.js only

## Naming Conventions
- Components: PascalCase (PostCard.jsx)
- Utilities: camelCase (dateUtils.js)
- Constants: UPPER_SNAKE_CASE

## Before Creating New Code
- Check if similar code already exists in src/lib/
- If a utility is used in 2+ files, extract to shared lib
- Custom hooks go in src/hooks/ (create if needed)

## Code Patterns
- Data fetching → custom hooks (useBadges, useConnections)
- Date calculations → src/lib/dateUtils.js
- Badge logic → src/lib/badges/ folder with category files
```

---

### 2. Hooks - The Building Inspector

Add to `.claude/settings.json` to automatically check work after every file write:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/check-size.sh"
          }
        ]
      }
    ]
  }
}
```

Create `.claude/hooks/check-size.sh`:

```bash
#!/bin/bash

# Component Size Checker
# Blocks file writes if JSX/TSX exceeds 300 lines

# Read tool input from stdin
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Exit if no file path
if [ -z "$file_path" ]; then
  exit 0
fi

# Only check JSX/TSX files
if [[ ! $file_path =~ \.(jsx|tsx)$ ]]; then
  exit 0
fi

# Skip if file doesn't exist
if [ ! -f "$file_path" ]; then
  exit 0
fi

# Count lines
line_count=$(wc -l < "$file_path" | tr -d ' ')

# Hard limit
MAX_LINES=300

if [ "$line_count" -gt "$MAX_LINES" ]; then
  echo "" >&2
  echo "================================================" >&2
  echo "  COMPONENT SIZE WARNING" >&2
  echo "================================================" >&2
  echo "" >&2
  echo "  File: $(basename "$file_path")" >&2
  echo "  Lines: $line_count (max: $MAX_LINES)" >&2
  echo "" >&2
  echo "  This component is too large!" >&2
  echo "  Consider splitting into:" >&2
  echo "    - Smaller subcomponents" >&2
  echo "    - Custom hooks for logic" >&2
  echo "    - Separate utility functions" >&2
  echo "" >&2
  echo "================================================" >&2
  exit 2  # Block and provide feedback
fi

# Soft warning at 250 lines
if [ "$line_count" -gt 250 ]; then
  echo "Note: $(basename "$file_path") has $line_count lines - approaching 300 line limit" >&2
fi

exit 0
```

Make it executable:

```bash
chmod +x .claude/hooks/check-size.sh
```

---

### 3. Modular Rules - Category-Specific Instructions

Create `.claude/rules/` for organized, topic-specific guidelines:

```
.claude/
├── CLAUDE.md              # Main project rules
├── settings.json          # Hook configuration
├── hooks/
│   └── check-size.sh      # Size enforcement script
└── rules/
    ├── components.md      # React component rules
    ├── utilities.md       # Shared code rules
    └── performance.md     # Optimization rules
```

**Example `.claude/rules/components.md`:**

```markdown
---
paths: src/components/**/*.jsx, src/pages/**/*.jsx
---

# Component Rules

## Size
- Max 300 lines. Period.
- Extract to subcomponents if complex

## Structure
Large components should split into:
- Container (data fetching)
- Presenter (UI only)
- Hooks (reusable logic)

## Anti-patterns to Avoid
- DON'T put 6 features in one file (like Profile.jsx)
- DON'T duplicate date/time utilities
- DON'T fetch data inline - use custom hooks
```

**Example `.claude/rules/utilities.md`:**

```markdown
---
paths: src/lib/**/*.js
---

# Utility Rules

## Before Adding New Code
1. Search src/lib/ for existing implementation
2. If function exists, use it - don't recreate
3. If used in 2+ files, it belongs in src/lib/

## Consolidated Files
- Date functions → dateUtils.js
- String formatting → formatters.js
- Validation → validators.js
- API helpers → services/api.js

## Size Limits
- Max 100 lines per utility file
- If larger, split into folder with index.js
```

**Example `.claude/rules/performance.md`:**

```markdown
---
paths: src/**/*.jsx, src/**/*.tsx
---

# Performance Rules

## Data Fetching
- Use custom hooks with proper dependency arrays
- Implement loading states for all async operations
- Consider caching for frequently accessed data

## Component Optimization
- Use React.memo for pure presentational components
- Use useCallback for handlers passed to children
- Use useMemo for expensive calculations

## Avoid
- Fetching in render (must be in useEffect or event handler)
- Creating new objects/arrays in render
- Inline function definitions in JSX props
```

---

### Quick Setup Commands

```bash
# Create the full Claude Code configuration
mkdir -p .claude/hooks .claude/rules

# Create settings.json
cat > .claude/settings.json << 'EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/check-size.sh"
          }
        ]
      }
    ]
  }
}
EOF

# Create and make hook executable
# (copy check-size.sh content from above)
chmod +x .claude/hooks/check-size.sh

# Initialize CLAUDE.md
claude /init
```

---

## Summary

1. **Organize by feature**, not by type
2. **Keep pages thin** - they just compose features
3. **Custom hooks for data** - components stay focused on UI
4. **Create utilities early** - prevents duplication
5. **Enforce size limits** - split before it's too late
6. **Use index files** - clean imports everywhere

Following these patterns from day one prevents the architectural debt that's painful to fix later.
