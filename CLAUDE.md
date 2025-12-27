# FamBam Project Guidelines

## Project Overview
FamBam is a family connection app built with React + Vite + Supabase. It helps families stay connected through posts, challenges, badges, and weekly recaps.

## Architecture Rules

### Component Size Limits
- **Maximum 300 lines per component file**
- If a component exceeds this, split into:
  - Subcomponents (e.g., `ProfileHeader.jsx`, `ProfileSettings.jsx`)
  - Custom hooks for logic (e.g., `useBadges.js`, `useConnections.js`)
  - Context providers for shared state

### Anti-Patterns to Avoid
- **NO mega-components** like the old Profile.jsx (794 lines) or NewPost.jsx (564 lines)
- **NO duplicate utility functions** - if it exists in `src/lib/`, use it
- **NO inline data fetching** in components - extract to custom hooks
- **NO copy-pasting** date calculations, connection filtering, or badge logic

## File Organization

```
src/
├── components/     # Reusable UI components (< 300 lines each)
├── pages/          # Route-level components
├── hooks/          # Custom React hooks (CREATE IF NEEDED)
├── lib/            # Utilities and services
│   ├── supabase.js       # DB client only
│   ├── dateUtils.js      # All date calculations (CREATE IF NEEDED)
│   ├── connectionUtils.js # Connection filtering (CREATE IF NEEDED)
│   ├── badges/           # Badge logic by category (REFACTOR TO THIS)
│   ├── ai.js             # AI integration
│   └── notifications.js  # Push notifications
└── context/        # React Context providers
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `PostCard.jsx`, `BadgeDisplay.jsx` |
| Hooks | camelCase with `use` prefix | `useBadges.js`, `useConnections.js` |
| Utilities | camelCase | `dateUtils.js`, `imageCompression.js` |
| Constants | UPPER_SNAKE_CASE | `REACTION_EMOJIS`, `VAPID_PUBLIC_KEY` |
| CSS files | Match component name | `PostCard.css` |

## Shared Utilities - DO NOT DUPLICATE

### Date Utilities (src/lib/dateUtils.js)
All date-related functions should live here:
- `getWeekStartDate(weekNumber)`
- `getWeekEndDate(weekNumber)`
- `getWeekDateRange(weekNumber)`
- `getCurrentWeekNumber()`
- `timeAgo(date)`

### Connection Utilities (src/lib/connectionUtils.js)
- `isConnectionChallenge(title)` - checks if challenge is visit/call type
- `filterConnectionChallenges(challenges)` - filters to connection-type challenges
- `getConnectionType(title)` - returns 'visit', 'call', or null

## Before Writing New Code

1. **Search first**: Check if similar code exists in `src/lib/`
2. **Extract shared logic**: If used in 2+ files, move to shared utility
3. **Create hooks**: Data fetching patterns should become custom hooks
4. **Check size**: If file will exceed 300 lines, plan the split first

## Code Patterns

### Data Fetching
```jsx
// GOOD - Custom hook
const { badges, loading } = useBadges(userId);

// BAD - Inline fetching
useEffect(() => {
  supabase.from('badges').select('*')...
}, []);
```

### Date Calculations
```jsx
// GOOD - Shared utility
import { getWeekStartDate } from '../lib/dateUtils';

// BAD - Local implementation
const getWeekStartDate = () => { /* duplicate code */ };
```

## Testing Commands
- `npm run dev` - Start development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Known Technical Debt
- [ ] Profile.jsx needs splitting into 5-6 components
- [ ] NewPost.jsx needs splitting into 4-5 components
- [ ] badges.js should become badges/ folder
- [ ] Create src/lib/dateUtils.js (consolidate duplicates)
- [ ] Create src/lib/connectionUtils.js (consolidate duplicates)
- [ ] Create src/hooks/ folder for custom hooks
