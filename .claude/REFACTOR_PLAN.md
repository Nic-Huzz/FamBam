# FamBam Refactor Plan

## Bug Risk Analysis

### Risk Levels Explained
| Level | Meaning | Action |
|-------|---------|--------|
| 🔴 HIGH | Will likely cause bugs, data inconsistencies, or user-facing issues | Fix ASAP |
| 🟡 MEDIUM | Could cause bugs under certain conditions, maintenance headaches | Fix soon |
| 🟢 LOW | Unlikely to cause bugs, but hurts maintainability | Fix when convenient |

---

## Issues Ranked by Bug Likelihood

### 🔴 HIGH RISK - Fix First

#### 1. Duplicate Date Utilities (3 different implementations)
**Files affected:** `badges.js`, `WeeklyRecap.jsx`, `History.jsx`

**Bug scenarios:**
- Different `getWeekStartDate()` implementations could calculate different week boundaries
- User sees "Week 5" in History but badges count it as "Week 4"
- Weekly recap shows different date ranges than challenge history
- Timezone edge cases handled differently in each file

**Likelihood:** 85% - Already a ticking time bomb. Any timezone or edge case will surface inconsistencies.

**Fix time:** ~30 minutes

---

#### 2. Duplicate Connection Filtering Logic
**Files affected:** `connections.js`, `badges.js`, `Challenges.jsx`

**Bug scenarios:**
- One file checks `title.includes('visit')`, another checks `title.toLowerCase().includes('visit')`
- "Visit Grandma" counted as connection in one place, not in another
- Badge awarded but connection stats don't update (or vice versa)
- Adding new connection type (e.g., "video call") requires changes in 3+ places

**Likelihood:** 70% - Case sensitivity or new challenge types will break this.

**Fix time:** ~20 minutes

---

#### 3. badges.js Monolithic Structure (559 lines)
**Why it's high risk:**
- 12+ badge checking functions with similar patterns
- Easy to break one badge when modifying another
- No clear separation between badge types
- Difficult to test individual badge logic

**Bug scenarios:**
- Fix for "Visitor" badge accidentally breaks "Connector" badge
- Race condition when multiple badges check same data
- Missing await on async function silently fails

**Likelihood:** 60% - Any badge modification risks breaking others.

**Fix time:** ~2 hours

---

### 🟡 MEDIUM RISK - Fix Soon

#### 4. Profile.jsx Mega-Component (794 lines)
**Why it's medium risk:**
- State management is complex but currently working
- Multiple useEffects with overlapping dependencies
- 6+ data fetches on mount

**Bug scenarios:**
- State update race conditions on slow connections
- Memory leaks if component unmounts during fetch
- Re-render loops from effect dependency issues

**Likelihood:** 40% - Working now, but fragile under load or modification.

**Fix time:** ~3 hours

---

#### 5. NewPost.jsx Mega-Component (564 lines)
**Why it's medium risk:**
- Handles file uploads, audio recording, AI suggestions, compression
- Many async operations interleaved

**Bug scenarios:**
- Image compression fails silently, uploads broken image
- Audio recording state not cleaned up properly
- Multiple rapid submissions create duplicate posts

**Likelihood:** 35% - Complex async flows are error-prone.

**Fix time:** ~2 hours

---

#### 6. No Custom Hooks for Data Fetching
**Why it's medium risk:**
- Same fetch patterns repeated across components
- Inconsistent error handling
- No loading states in some places

**Bug scenarios:**
- Error in one component not shown to user
- Data shown as stale when it's actually loading
- Component shows old user's data after logout/login

**Likelihood:** 30% - Edge cases around auth state changes.

**Fix time:** ~3 hours (create 4-5 hooks)

---

### 🟢 LOW RISK - Fix When Convenient

#### 7. No Query Caching
**Impact:** Performance, not bugs
- Every navigation refetches data
- Unnecessary API calls
- Slower perceived performance

**Likelihood of bugs:** 10% - Might cause stale data perception issues.

**Fix time:** ~4 hours (add React Query or custom caching)

---

#### 8. Challenges.jsx Size (515 lines)
**Impact:** Maintainability
- Less critical than Profile/NewPost
- More straightforward data flow

**Likelihood of bugs:** 15%

**Fix time:** ~1.5 hours

---

#### 9. PostCard.jsx Size (316 lines)
**Impact:** Minor maintainability concern
- Just slightly over limit
- Could benefit from extracting reactions/comments

**Likelihood of bugs:** 10%

**Fix time:** ~45 minutes

---

## Implementation Plan

### Phase 1: Critical Bug Prevention (Week 1)
**Goal:** Eliminate the code that's most likely to cause bugs

| Task | Time | Risk Fixed |
|------|------|------------|
| Create `src/lib/dateUtils.js` - consolidate all date functions | 30 min | 🔴 Date inconsistencies |
| Create `src/lib/connectionUtils.js` - consolidate filtering | 20 min | 🔴 Connection logic bugs |
| Update imports in badges.js, WeeklyRecap, History, Challenges | 30 min | - |
| Test date/week calculations across all features | 20 min | - |

**Total: ~2 hours**

---

### Phase 2: Badge System Refactor (Week 1-2)
**Goal:** Make badge logic maintainable and testable

| Task | Time | Risk Fixed |
|------|------|------------|
| Create `src/lib/badges/` folder structure | 10 min | - |
| Extract milestone badges to `milestoneBadges.js` | 30 min | 🔴 Badge interference |
| Extract streak badges to `streakBadges.js` | 30 min | 🔴 Badge interference |
| Extract connection badges to `connectionBadges.js` | 45 min | 🔴 Badge interference |
| Extract activity badges to `activityBadges.js` | 30 min | 🔴 Badge interference |
| Create `index.js` with unified exports | 15 min | - |
| Update all imports | 20 min | - |

**Total: ~3 hours**

---

### Phase 3: Component Splitting (Week 2-3)
**Goal:** Make large components maintainable

#### Profile.jsx Split
| New Component | Responsibility | Lines (est) |
|--------------|----------------|-------------|
| `ProfileHeader.jsx` | Avatar, name, basic stats | ~80 |
| `BadgesSection.jsx` | Badge display and logic | ~100 |
| `ConnectionsSection.jsx` | ConnectionsTab wrapper | ~60 |
| `NotificationSettings.jsx` | Push notification UI | ~80 |
| `FamilyManagement.jsx` | Admin, members, invites | ~120 |
| `AccountSettings.jsx` | Delete, logout options | ~60 |
| `Profile.jsx` (parent) | Compose above components | ~100 |

**Time: ~3 hours**

#### NewPost.jsx Split
| New Component | Responsibility | Lines (est) |
|--------------|----------------|-------------|
| `PostForm.jsx` | Message input, type selector | ~80 |
| `MediaUpload.jsx` | File selection, preview | ~100 |
| `AudioRecorder.jsx` | Recording state and UI | ~120 |
| `AISuggestions.jsx` | Prompts and caption help | ~80 |
| `NewPost.jsx` (parent) | Compose above components | ~80 |

**Time: ~2 hours**

---

### Phase 4: Custom Hooks (Week 3)
**Goal:** Standardize data fetching patterns

| Hook | Used By | Time |
|------|---------|------|
| `useBadges(userId)` | Profile, BadgesSection | 30 min |
| `useConnections(familyId)` | Profile, ConnectionsSection | 30 min |
| `useChallenges(familyId, week)` | Challenges, History | 30 min |
| `usePosts(familyId)` | Feed, PostDetail | 30 min |
| `useWeeklyStats(userId)` | WeeklyRecap, Profile | 30 min |

**Total: ~2.5 hours**

---

### Phase 5: Nice-to-Have Improvements (Week 4+)
| Task | Time | Impact |
|------|------|--------|
| Split Challenges.jsx | 1.5 hrs | Maintainability |
| Split PostCard.jsx | 45 min | Maintainability |
| Add query caching | 4 hrs | Performance |
| Add error boundaries per route | 1 hr | Error handling |

---

## Summary Timeline

| Phase | Focus | Time | Bug Risk Reduction |
|-------|-------|------|-------------------|
| 1 | Date & Connection Utils | 2 hrs | 🔴→🟢 (85% → 5%) |
| 2 | Badge System Refactor | 3 hrs | 🔴→🟢 (60% → 10%) |
| 3 | Component Splitting | 5 hrs | 🟡→🟢 (40% → 15%) |
| 4 | Custom Hooks | 2.5 hrs | 🟡→🟢 (30% → 10%) |
| 5 | Nice-to-Have | 7+ hrs | Minor improvements |

**Total for critical fixes (Phases 1-2): ~5 hours**
**Total for full refactor (Phases 1-4): ~12.5 hours**

---

## Recommended Order of Execution

```
1. dateUtils.js           ← Highest bug risk, fastest fix
2. connectionUtils.js     ← High bug risk, fast fix
3. badges/ folder         ← High bug risk, prevents future bugs
4. Profile.jsx split      ← Unlocks easier maintenance
5. NewPost.jsx split      ← Complex async logic isolation
6. Custom hooks           ← Standardizes patterns
7. Everything else        ← As time permits
```

---

## Quick Wins (Can Do Right Now)

These take <30 minutes each and prevent real bugs:

1. **Create `src/lib/dateUtils.js`** with canonical implementations
2. **Create `src/lib/connectionUtils.js`** with shared filtering
3. **Add `src/hooks/` folder** (even if empty, establishes pattern)

Want me to start with any of these?
