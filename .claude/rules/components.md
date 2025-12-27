# Component Architecture Rules

## Size Limits

**Hard limit: 300 lines per component file**

When a component approaches this limit, split it:

```
ProfilePage.jsx (800 lines)
    ↓ Split into:
├── ProfileHeader.jsx      (~80 lines)
├── BadgesSection.jsx      (~100 lines)
├── ConnectionsSection.jsx (~60 lines)
├── NotificationSettings.jsx (~80 lines)
├── FamilyManagement.jsx   (~120 lines)
└── AccountSettings.jsx    (~60 lines)
```

## Component Structure Pattern

```jsx
// 1. Imports (grouped)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// 2. Component definition
export default function ComponentName() {
  // 3. Hooks first
  const { user } = useAuth();
  const [state, setState] = useState(null);

  // 4. Effects
  useEffect(() => {
    // ...
  }, []);

  // 5. Handlers
  const handleClick = () => {};

  // 6. Render
  return (
    <div>...</div>
  );
}
```

## When to Extract

### Extract a Subcomponent When:
- A section has its own state
- A section is reused elsewhere
- A section has complex rendering logic
- The parent component exceeds 200 lines

### Extract a Custom Hook When:
- Data fetching logic is repeated
- Complex state management
- Side effects that could be reused
- Logic is testable independently

### Extract a Utility When:
- Pure function (no React)
- Used in 2+ files
- Date/string/array manipulation

## Anti-Patterns

```jsx
// BAD: Everything in one component
function Profile() {
  // 50 lines of state
  // 100 lines of effects
  // 200 lines of handlers
  // 400 lines of JSX
}

// GOOD: Split by responsibility
function Profile() {
  return (
    <>
      <ProfileHeader />
      <BadgesSection />
      <ConnectionsSection />
      <Settings />
    </>
  );
}
```

## Existing Components Needing Refactor

These violate the 300-line rule and need splitting:

1. **Profile.jsx** (794 lines) - Priority: HIGH
2. **NewPost.jsx** (564 lines) - Priority: HIGH
3. **Challenges.jsx** (515 lines) - Priority: MEDIUM
4. **PostCard.jsx** (316 lines) - Priority: LOW
