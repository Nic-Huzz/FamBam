# Utility & Shared Code Rules

## Golden Rule: Don't Repeat Yourself

If you write a utility function, **search first** to see if it already exists.

## Consolidated Utility Files

### Date Utilities - `src/lib/dateUtils.js`

**All date-related functions must live here. DO NOT create local versions.**

Required functions:
```javascript
// Week calculations (using app-specific epoch)
export function getWeekStartDate(weekNumber) { }
export function getWeekEndDate(weekNumber) { }
export function getWeekDateRange(weekNumber) { }
export function getCurrentWeekNumber() { }

// Display formatting
export function timeAgo(date) { }
export function formatDate(date, format) { }
```

Currently duplicated in:
- `badges.js` - getWeekStartDate()
- `WeeklyRecap.jsx` - getWeekStartDate(), getWeekDateRange()
- `History.jsx` - getWeekStartDate(), getWeekDateRange()

**Action**: Consolidate all into `dateUtils.js`

### Connection Utilities - `src/lib/connectionUtils.js`

**All connection filtering logic must live here.**

Required functions:
```javascript
// Challenge type detection
export function isConnectionChallenge(title) {
  const lower = title.toLowerCase();
  return lower.includes('visit') || lower.includes('call');
}

export function getConnectionType(title) {
  const lower = title.toLowerCase();
  if (lower.includes('visit')) return 'visit';
  if (lower.includes('call')) return 'call';
  return null;
}

// Filtering
export function filterConnectionChallenges(challenges) {
  return challenges.filter(c => isConnectionChallenge(c.title));
}
```

Currently duplicated in:
- `connections.js` - inline filtering
- `badges.js` - inline filtering in multiple functions
- `Challenges.jsx` - inline filtering

**Action**: Extract to `connectionUtils.js`

## Badge Organization

Current: `badges.js` (559 lines) - TOO LARGE

Target structure:
```
src/lib/badges/
├── index.js           # Re-exports, awardBadge(), checkAllBadges()
├── milestoneBadges.js # Post count milestones
├── streakBadges.js    # Weekly streaks
├── connectionBadges.js # Visitor, Connector, Bridge Builder, Round Robin
└── activityBadges.js  # Storyteller, Perfect Week, Inner Circle
```

## Custom Hooks - `src/hooks/`

Create this folder and add hooks for repeated patterns:

```javascript
// src/hooks/useBadges.js
export function useBadges(userId) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  // ... fetch logic
  return { badges, loading, refresh };
}

// src/hooks/useConnections.js
export function useConnections(familyId) {
  const [stats, setStats] = useState(null);
  // ... fetch logic
  return { stats, loading };
}

// src/hooks/useChallenges.js
export function useChallenges(familyId, weekNumber) {
  // ... fetch logic
}
```

## Before Adding New Utility Code

Checklist:
1. [ ] Search `src/lib/` for existing implementation
2. [ ] Check if function is already in dateUtils/connectionUtils
3. [ ] If used in 2+ places, add to shared utility file
4. [ ] If React-specific, create a custom hook in `src/hooks/`
5. [ ] Add JSDoc comments for complex functions

## File Size Guidelines

| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| Utility file | 200 | Split into folder with index.js |
| Custom hook | 100 | Extract sub-hooks |
| Constants file | 100 | Split by category |
