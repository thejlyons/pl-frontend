# Bet 11: The Truman Show - Full Lifecycle Simulation

## Overview
The "Truman Show" is a comprehensive end-to-end test that simulates a full week of user activity in Perennial. It verifies that SRS scheduling, filtering, deletion, and long-term persistence work correctly across time.

## Time Machine: The `/test/warp` Endpoint

### Endpoint Details
- **Path**: `POST /test/warp`
- **Security**: Forbidden in production (`APP_ENV != production`)
- **Payload**: `{ "days": <positive integer> }`
- **Response**: `{ "status": "warped", "days": <N> }`

### How It Works
The endpoint "ages" all progress records by subtracting time from their `next_review_at` timestamps:

```sql
-- SQLite
UPDATE progress 
SET next_review_at = datetime(next_review_at, '-N days') 
WHERE next_review_at IS NOT NULL

-- PostgreSQL
UPDATE progress 
SET next_review_at = next_review_at - INTERVAL 'N days' 
WHERE next_review_at IS NOT NULL
```

This makes the system believe time has passed without actually waiting.

## The 7-Phase Test Journey

### Phase 1: Day 0 - Genesis & Exploration
**Goal**: Setup and UI verification

1. Create profile "Truman"
2. Seed the Countries blueprint
3. Create "Personal" collection with "My Cat" concept (Fact: Name=Luna)
4. Navigate to Library → Countries → France
5. Verify Dossier view renders correctly

**Verification**: UI displays collections and concepts properly

### Phase 2: Day 1 - The First Tend
**Goal**: Verify review logic and SRS initialization

1. Warp +1 day
2. Navigate to Garden
3. Verify "My Cat" and Countries are due for review
4. Review "My Cat" with correct answer "Luna"
5. Review France facts, mark as "Good"

**Verification**: 
- SRS interval increases (e.g., ~3 days for "My Cat")
- Garden empties after reviews complete

### Phase 3: Day 2 - The Filter Strategy
**Goal**: Verify sowing filters work correctly

1. Warp +1 day
2. Navigate to Countries collection
3. Filter OFF "Capital" and "Leader" fact types
4. Start review session

**Verification**:
- Only visual questions (flags/maps) appear
- Text questions about capitals are excluded
- "My Cat" is NOT due (interval > 1 day)

### Phase 4: Day 3 - The Pruning
**Goal**: Verify deletion and cleanup

1. Warp +1 day
2. Navigate to Personal → My Cat
3. Click delete/prune and confirm
4. Verify concept is removed from Library
5. Verify concept is removed from review queue

**Verification**: Cascade deletion works correctly

### Phase 5: Day 4 - The Re-Activation
**Goal**: Verify filter persistence and toggle behavior

1. Warp +1 day
2. Navigate to Countries collection
3. Filter ON "Capital"
4. Start review session

**Verification**: Capital questions now appear in reviews

### Phase 6: Day 5 - Tuning the Engine
**Goal**: Verify SRS settings take effect

1. Warp +1 day
2. Go to Settings
3. Change "Interval Modifier" to 10.0 (extreme acceleration)
4. Review a country fact

**Verification**: Next review interval shows massive jump (~20+ days)

### Phase 7: Day 30 - The Future
**Goal**: Verify long-term persistence

1. Warp +25 days (total: Day 30)
2. Navigate to Garden
3. Verify the "extreme speed" card is now due
4. Complete review session

**Verification**: Long-interval cards eventually come due

## Running the Test

### Quick Run (Truman Show only)
```bash
make truman
```

This runs the test with:
- Video recording enabled
- 500ms slow motion for human readability
- Chromium desktop viewport

### All Showcase Tests
```bash
make showcase
```

### Manual Run
```bash
cd pl-frontend
SHOWCASE_VIDEO=1 SHOWCASE_SLOWMO=500 npx playwright test truman_show.spec.ts --project=chromium-desktop
```

## Video Output
After running, find the video at:
```
pl-frontend/test-results/the-truman-show-full-lifecycle-simulation-7-day-journey-through-perennial-s-cultivation-cycle-chromium-desktop/video.webm
```

Or check the HTML report:
```bash
cd pl-frontend
npx playwright show-report
```

## Success Criteria

✅ **Temporal Verification**: Cards scheduled 3 days out actually appear in 3 days  
✅ **Filter Persistence**: Toggling filters off/on days later works correctly  
✅ **Comprehensive Coverage**: Single test touches Seed Bank, Creator, Pruner, and Reviewer  
✅ **Video Documentation**: `make truman` produces a continuous video of the entire journey  
✅ **Deletion Cascade**: Pruning removes items from review queue  
✅ **SRS Configuration**: Interval modifiers affect scheduling as expected  
✅ **Long-Term Stability**: Cards due in 30 days eventually surface  

## Implementation Files

### Backend
- [`pl-backend/internal/httpapi/handlers.go`](pl-backend/internal/httpapi/handlers.go#L53) - `/test/warp` endpoint
- [`pl-backend/internal/service/service.go`](pl-backend/internal/service/service.go#L707) - `WarpTime` service method
- [`pl-backend/internal/repository/repository.go`](pl-backend/internal/repository/repository.go#L350) - SQL time manipulation

### Frontend
- [`pl-frontend/tests/truman_show.spec.ts`](pl-frontend/tests/truman_show.spec.ts) - Complete test suite
- [`Makefile`](Makefile) - `make truman` and `make showcase` targets

## Troubleshooting

### Test Times Out
Increase timeout in [`playwright.config.ts`](pl-frontend/playwright.config.ts):
```typescript
timeout: 180_000, // 3 minutes
```

### Database State Issues
Ensure `globalSetup` runs and resets database:
```typescript
// pl-frontend/tests/global.setup.ts
await context.post(`${apiBase}/test/reset`);
```

### Video Not Recording
Check environment variables:
```bash
SHOWCASE_VIDEO=1 SHOWCASE_SLOWMO=500
```

### APP_ENV Protection
If warp endpoint returns 403, verify backend is running with:
```bash
APP_ENV=test
```

## Future Enhancements

1. **Visual Regression**: Add screenshot comparisons for Dossier view
2. **Anti-Spoiler**: Test blur/reveal functionality when implemented
3. **Streaks**: Add verification for streak counters across days
4. **Multiple Profiles**: Test profile switching during warped time
5. **Export/Import**: Verify data portability across time
