# Phase 1: Content Generation Build Plan

## Version 1.0 | December 2025

---

## Overview

This document details the build plan for Phase 1 of the Build in Public app: the AI content generation system that transforms daily check-ins into publishable content.

**Core Principle:** Daily attempt with snowball rollover. The AI attempts to create valuable content every day. If material is too thin or the user rejects it, content rolls into the next day's pool until there's enough for quality publication.

**Why this matters:** Without accumulation logic, we cannot distinguish between thin content caused by insufficient raw material versus inadequate AI prompts. The 7-day snowball test is diagnostic: if we can't produce quality content after 7 days of material, we have a systemic problem.

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Check-in form approach | Restructure existing form | Single source of truth, no parallel maintenance |
| Later API setup | Include first-time setup flow | Users need guided onboarding to connect social accounts |
| Midnight trigger | Built into app (Vercel cron) | Fewer failure points than external n8n dependency |
| Day type selector | Include (breakthrough/grind/stuck) | Enables narrative arc detection that AI cannot reliably infer from text |
| Voice input | Architecture only, no functionality | User has Wispr Flow; defer implementation until multi-user |

---

## Database Schema Updates (COMPLETED)

The following alterations have been applied to Supabase:

```sql
-- check_ins table enhancements
ALTER TABLE check_ins 
ADD COLUMN day_type TEXT,
ADD COLUMN breakthroughs TEXT,
ADD COLUMN in_my_own_words TEXT,
ADD COLUMN flag_youtube BOOLEAN DEFAULT false,
ADD COLUMN flag_linkedin BOOLEAN DEFAULT false;

-- project_updates problem-first structure
ALTER TABLE project_updates
ADD COLUMN problem_to_solve TEXT,
ADD COLUMN what_didnt_work TEXT,
ADD COLUMN what_worked TEXT,
ADD COLUMN surprise_learning TEXT;

-- uploads context capture
ALTER TABLE uploads
ADD COLUMN what_am_i_looking_at TEXT,
ADD COLUMN why_does_this_matter TEXT;

-- content_ideas snowball tracking
ALTER TABLE content_ideas
ADD COLUMN rolled_over_from UUID[],
ADD COLUMN material_days INTEGER DEFAULT 1,
ADD COLUMN quality_recommendation TEXT;
```

---

## Build Packages

### Package 1: Database Schema Updates ✅ COMPLETE

Schema alterations applied. See above.

---

### Package 2: Enhanced Check-in Form UI

**Goal:** Restructure the check-in form to capture richer, more content-ready material.

**Changes:**

#### 2.1 Day Type Selector (replaces mood)
- Three button toggle: Breakthrough / Grind / Stuck
- Icons: 💡 / ⚙️ / 🧱
- Stored in `check_ins.day_type`
- Helps AI construct narrative arcs ("stuck → breakthrough" stories)

#### 2.2 Per-Project Update Structure (problem-first)
Replace single `update_text` field with structured inputs:

| Field | Prompt | DB Column |
|-------|--------|-----------|
| Primary | "What problem were you trying to solve?" | `problem_to_solve` |
| Secondary | "What didn't work?" | `what_didnt_work` |
| Secondary | "What finally worked?" | `what_worked` |
| Secondary | "What surprised you?" | `surprise_learning` |

- Keep existing `update_text` as fallback/general notes
- Keep `is_win` and `is_blocker` flags
- Keep `blocker_description`

#### 2.3 Question Pills
Clickable prompts that insert text into the active field:

**General prompts:**
- "What problem was I solving?"
- "What finally worked?"
- "What didn't work?"
- "What surprised me?"
- "What would I do differently?"

**When stuck:**
- "What's blocking me?"
- "What have I tried so far?"
- "What do I need to figure out?"

**When breakthrough:**
- "How did I solve it?"
- "Why was this hard to find?"
- "Who else might struggle with this?"

#### 2.4 Breakthroughs Section
- Separate from project updates
- Label: "Any major wins or discoveries today?"
- Stored in `check_ins.breakthroughs`
- Content flags below:
  - [ ] This deserves a YouTube tutorial (`flag_youtube`)
  - [ ] This deserves a dedicated LinkedIn post (`flag_linkedin`)

#### 2.5 In My Own Words Section
- Label: "Any phrases or quotes you want preserved exactly?"
- Tooltip: "The AI will keep these verbatim in your content"
- Stored in `check_ins.in_my_own_words`

#### 2.6 Enhanced Screenshot Upload
After file upload, display inline prompts:
- "What am I looking at?" → `uploads.what_am_i_looking_at`
- "Why does this matter?" → `uploads.why_does_this_matter`

Remove or deprecate the generic `user_context` field.

#### 2.7 Voice Input Placeholders
- Add microphone icon (🎤) next to each text field
- Non-functional in v1
- Clicking shows tooltip: "Voice input coming soon"
- Architecture ready for future Whisper integration

#### 2.8 Form Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  DAILY CHECK-IN                                     [Date/Time] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. HOW WAS TODAY?                                              │
│     [💡 Breakthrough] [⚙️ Grind] [🧱 Stuck]                      │
│                                                                 │
│  2. PROJECTS WORKED ON                                          │
│     [Multi-select chips]                                        │
│                                                                 │
│  3. FOR EACH PROJECT:                                           │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ Project: [Name]                          [Win] [Blocker]│ │
│     │                                                         │ │
│     │ Question pills: [Problem?] [Didn't work?] [Worked?]...  │ │
│     │                                                         │ │
│     │ What problem were you trying to solve?           [🎤]   │ │
│     │ [Large textarea]                                        │ │
│     │                                                         │ │
│     │ What didn't work? (optional)                     [🎤]   │ │
│     │ [Textarea]                                              │ │
│     │                                                         │ │
│     │ What finally worked? (optional)                  [🎤]   │ │
│     │ [Textarea]                                              │ │
│     │                                                         │ │
│     │ Any surprises? (optional)                        [🎤]   │ │
│     │ [Textarea]                                              │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│  4. BREAKTHROUGHS ⭐                                   [🎤]     │
│     Any major wins or discoveries?                              │
│     [Textarea]                                                  │
│     [ ] This deserves a YouTube tutorial                        │
│     [ ] This deserves a dedicated LinkedIn post                 │
│                                                                 │
│  5. IN MY OWN WORDS 💬                                 [🎤]     │
│     Phrases to preserve exactly in content                      │
│     [Textarea]                                                  │
│                                                                 │
│  6. SCREENSHOTS & FILES                                         │
│     [Drag/drop zone] [Ctrl+V paste]                             │
│     For each upload:                                            │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ [Thumbnail]                                             │ │
│     │ What am I looking at? [________________]                │ │
│     │ Why does this matter? [________________]                │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│                                          [Save Check-in]        │
└─────────────────────────────────────────────────────────────────┘
```

---

### Package 3: Content Generation API

**Endpoint:** `POST /api/generate-ideas`

**Trigger conditions:**
- Manual: User clicks "Generate Content Ideas" button
- Manual: User clicks "Working day complete" button
- Automatic: Vercel cron job at midnight user's timezone

#### 3.1 Material Pool Assembly

Gather all unprocessed material:

```typescript
// Pseudocode
const materialPool = {
  checkIns: await getUnprocessedCheckIns(userId), // processed = false
  rolledOverIdeas: await getRejectedIdeas(userId), // status = 'rejected'
  projects: await getActiveProjects(userId),
  uploads: await getUploadsForCheckIns(checkInIds),
  recentPosts: await getPublishedContent(userId, days: 14) // for duplicate avoidance
};
```

#### 3.2 Prompt Construction

Build prompt following North Star template:

```
CONTEXT:
- Business: {user_settings.business_name} - {user_settings.business_description}
- Audience: {user_settings.audience_description}
- Voice: {user_settings.brand_voice}

PROJECT MEMORY:
{For each project in material pool:}
- Project: {name}
- Description: {description}
- Progress: {percentage}%
- Previous content about this project: {last 3 posts}
- Key themes identified: {recurring_themes}

MATERIAL POOL:
{For each check-in:}
- Date: {check_in_date}
- Day type: {day_type}
- Projects: {linked projects}
- Problem solving: {problem_to_solve}
- What didn't work: {what_didnt_work}
- What worked: {what_worked}
- Surprises: {surprise_learning}
- Breakthroughs: {breakthroughs} [PRIORITY - user flagged]
- In My Own Words: {in_my_own_words} [PRESERVE CLOSELY]
- Content flags: YouTube={flag_youtube}, LinkedIn={flag_linkedin}
- Screenshots: {upload descriptions with user context}

ROLLED OVER MATERIAL:
{Previously rejected ideas with their source material}

POST HISTORY (last 14 days):
{Recent posts to avoid duplication - titles, hooks, themes}

YOUR TASK:
1. Identify what's genuinely interesting in this material
2. Look for: problems solved, discoveries, before/after, failures/learnings, tool specifics, decision points
3. Generate 1-3 content ideas depending on material richness

For each idea provide:
- Title (the hook)
- Summary (what the content would cover)
- Angle (problem/solution, lesson learned, behind the scenes, etc.)
- Quality score (1-10)
- Recommendation: "strong" / "publishable_thin" / "needs_more"
- Reasoning for score
- Which material it draws from (check-in IDs, upload IDs)
- Any "In My Own Words" quotes to preserve verbatim

RULES:
- NEVER generate "today I worked on X" summaries
- NEVER use marketing speak or superlatives
- NEVER repeat themes from the last 14 days without fresh angle
- Preserve "In My Own Words" sections with minimal editing
- Use British English, no em dashes
- If material is thin, say so honestly and recommend waiting
```

#### 3.3 Response Parsing

Parse Claude's response into structured data:

```typescript
interface GeneratedIdea {
  ideaTitle: string;
  ideaSummary: string;
  suggestedAngle: string;
  suggestedHook: string;
  interestScore: number; // 1-10
  interestReasoning: string;
  qualityRecommendation: 'strong' | 'publishable_thin' | 'needs_more';
  sourceCheckIns: string[]; // UUIDs
  sourceUploads: string[]; // UUIDs
  sourceProjects: string[]; // UUIDs
  preservedQuotes: string[]; // From "In My Own Words"
  materialDays: number;
  rolledOverFrom: string[]; // Previous rejected idea IDs
}
```

#### 3.4 Database Operations

For each generated idea:
1. Create `content_ideas` record with status = 'pending'
2. Link source check-ins, uploads, projects
3. Store quality metrics

After generation:
1. Mark source check-ins as processed = true, processed_at = now()
2. If ideas were rolled over, update their status to 'incorporated'

#### 3.5 Error Handling

- If Claude API fails: retry with exponential backoff (3 attempts)
- If material pool is empty: return early with message "No unprocessed check-ins"
- If API quota exceeded: queue for later, notify user

---

### Package 4: Content Ideas Review UI

**Route:** `/dashboard/content`

#### 4.1 Ideas List View

Display pending content ideas as cards:

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTENT IDEAS                          [Generate New Ideas]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [8/10] STRONG                                               ││
│  │                                                             ││
│  │ "The pagination bug that cost me 4 hours"                   ││
│  │                                                             ││
│  │ How I finally solved the Xero API pagination limit after    ││
│  │ trying three different approaches. The fix was simpler      ││
│  │ than expected...                                            ││
│  │                                                             ││
│  │ Angle: Problem/Solution                                     ││
│  │ Source: Dec 20 check-in, 2 screenshots                      ││
│  │ Material: 2 days                                            ││
│  │                                                             ││
│  │                              [Reject]  [Approve & Draft]    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [5/10] THIN - Consider waiting                              ││
│  │                                                             ││
│  │ "Setting up the new project structure"                      ││
│  │                                                             ││
│  │ Initial setup work on the Build in Public app...            ││
│  │                                                             ││
│  │ Angle: Behind the scenes                                    ││
│  │ Source: Dec 19 check-in                                     ││
│  │ Material: 1 day                                             ││
│  │                                                             ││
│  │                              [Reject]  [Approve & Draft]    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2 Quality Indicators

Visual treatment by recommendation:
- **Strong (7-10):** Green accent, prominent approve button
- **Publishable but thin (4-6):** Amber accent, "Consider waiting" note
- **Needs more (1-3):** Red accent, approve button de-emphasised

#### 4.3 Approve Flow

1. User clicks "Approve & Draft"
2. Idea status → 'approved', approved_at → now()
3. Trigger draft generation (Package 5)
4. Redirect to drafts view

#### 4.4 Reject Flow

1. User clicks "Reject"
2. Modal: "Why are you rejecting this? (optional)"
   - "Too thin - wait for more material"
   - "Not interesting enough"
   - "Already covered this recently"
   - "Other: [text input]"
3. Idea status → 'rejected', rejection_reason → selection
4. Idea remains in pool for next generation cycle (snowball)

---

### Package 5: Platform Draft Generation API

**Endpoint:** `POST /api/generate-drafts`

**Input:** `{ contentIdeaId: string }`

#### 5.1 Platform Detection

Get user's enabled platforms from `user_settings.platforms_enabled`:
- linkedin
- twitter
- instagram
- facebook
- threads
- (others as configured)

#### 5.2 Platform-Specific Prompts

**LinkedIn:**
```
Adapt this content for LinkedIn.
- Open with a hook that creates curiosity (this appears before "see more")
- Break into short paragraphs for mobile readability
- No hashtags in body text (add 3-5 at the very end if needed)
- Professional but conversational tone
- 1200-1500 characters ideal
- End with observation or question, not hard CTA
- British English, no em dashes

Content to adapt:
{idea_title}
{idea_summary}
{suggested_angle}
{preserved_quotes - use these verbatim where natural}
```

**Twitter/X:**
```
Adapt this content for Twitter.
- If over 280 characters, format as a thread
- Tweet 1 is the hook - must standalone and compel reading
- Number thread posts (1/, 2/, etc.)
- Each tweet should work if shared individually
- Punchy, direct language
- British English, no em dashes

Content to adapt:
{idea_title}
{idea_summary}
```

#### 5.3 Database Operations

For each platform, create `content_drafts` record:
- content_idea_id → source idea
- platform → platform name
- content_format → 'post', 'thread', 'carousel'
- draft_text → generated content
- draft_title → for internal reference
- hashtags → extracted array
- status → 'draft'

---

### Package 6: Draft Editing UI

**Routes:**
- `/dashboard/content/drafts` - List all drafts
- `/dashboard/content/drafts/[id]` - Edit single draft

#### 6.1 Drafts List View

Group drafts by source idea:

```
┌─────────────────────────────────────────────────────────────────┐
│  DRAFTS                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From: "The pagination bug that cost me 4 hours"                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ LinkedIn                                    [Edit] [Approve]││
│  │ "Four hours. That's how long I spent..."   1,247 chars      ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Twitter/X (Thread - 4 tweets)               [Edit] [Approve]││
│  │ "1/ Four hours on one bug..."                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2 Draft Editor

```
┌─────────────────────────────────────────────────────────────────┐
│  EDIT DRAFT - LinkedIn                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Preview:                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [LinkedIn-style preview card]                               ││
│  │                                                             ││
│  │ Four hours. That's how long I spent yesterday               ││
│  │ hunting down a pagination bug in the Xero API.              ││
│  │                                                             ││
│  │ The symptom: only 100 invoices returned...                  ││
│  │ ... see more                                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Edit content:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Textarea with full content]                                ││
│  │                                                             ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│  Characters: 1,247 / 3,000                                      │
│                                                                 │
│  Hashtags: [#automation] [#xero] [#api] [+ Add]                 │
│                                                                 │
│  [Regenerate]  [Cancel]  [Save Draft]  [Approve & Schedule]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.3 Approve & Schedule Flow

1. User clicks "Approve & Schedule"
2. Draft status → 'approved'
3. If Later API connected: trigger publish (Package 7)
4. If not connected: prompt to connect Later account

---

### Package 7: Later API Integration

#### 7.1 Environment Variables

```
LATER_API_KEY=your_api_key
LATER_PROFILE_ID=your_profile_id
```

#### 7.2 Account Connection Flow

New route: `/dashboard/settings/connections`

1. Display "Connect Later Account" button
2. User clicks → redirect to Later OAuth
3. Callback stores account IDs in user_settings or new table
4. Display connected accounts with platform icons

#### 7.3 Publish Endpoint

**Endpoint:** `POST /api/publish`

**Input:**
```typescript
{
  draftId: string;
  scheduledFor?: string; // ISO datetime, optional
}
```

**Later API Call:**
```typescript
const response = await fetch('https://getlate.dev/api/v1/posts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LATER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: draft.draft_text,
    scheduledFor: scheduledFor || getOptimalTime(platform),
    timezone: user.timezone,
    platforms: [{
      platform: draft.platform,
      accountId: getAccountId(userId, draft.platform)
    }]
  })
});
```

#### 7.4 Database Updates

On successful Later API response:
- draft.status → 'scheduled'
- draft.scheduled_for → scheduled timestamp
- draft.later_post_id → Later's post ID

#### 7.5 Webhook Handling (Future)

Endpoint: `POST /api/webhooks/later`

Handle Later callbacks for:
- Post published → update status, store platform_post_id and platform_post_url
- Post failed → update status, notify user

#### 7.6 Dual Destination (Airtable)

When publishing to LinkedIn, also send to Airtable for website:

```typescript
// After successful Later scheduling
if (draft.platform === 'linkedin') {
  await sendToAirtable({
    title: draft.draft_title,
    content: draft.draft_text,
    publishDate: scheduledFor,
    source: 'build-in-public-app'
  });
}
```

---

### Package 8: Trigger Mechanisms

#### 8.1 Manual Triggers (UI Buttons)

**Generate Ideas Button:**
- Location: `/dashboard/content` page header
- Action: POST to `/api/generate-ideas`
- Shows loading state, then refreshes ideas list

**Working Day Complete Button:**
- Location: Dashboard home or check-in success page
- Action: POST to `/api/generate-ideas`
- Implies "no more check-ins today, process what we have"

#### 8.2 Automatic Trigger (Vercel Cron)

**File:** `/app/api/cron/generate-content/route.ts`

```typescript
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = 'lhr1'; // London for UK timezone

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all users with unprocessed check-ins
  // For each user, call generate-ideas logic
  // Log results

  return NextResponse.json({ success: true });
}
```

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-content",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Note:** Vercel cron runs in UTC. For user-specific timezones, the cron job should check each user's timezone and only process those where it's midnight.

#### 8.3 Environment Variables for Cron

```
CRON_SECRET=random_secure_string
```

---

## File Structure (New/Modified)

```
src/
├── app/
│   ├── api/
│   │   ├── generate-ideas/
│   │   │   └── route.ts          # Content idea generation
│   │   ├── generate-drafts/
│   │   │   └── route.ts          # Platform draft generation
│   │   ├── publish/
│   │   │   └── route.ts          # Later API publishing
│   │   ├── webhooks/
│   │   │   └── later/
│   │   │       └── route.ts      # Later webhook handler
│   │   └── cron/
│   │       └── generate-content/
│   │           └── route.ts      # Midnight cron trigger
│   ├── dashboard/
│   │   ├── check-in/
│   │   │   └── page.tsx          # MODIFIED - enhanced form
│   │   ├── content/
│   │   │   ├── page.tsx          # Content ideas list
│   │   │   └── drafts/
│   │   │       ├── page.tsx      # Drafts list
│   │   │       └── [id]/
│   │   │           └── page.tsx  # Draft editor
│   │   └── settings/
│   │       └── connections/
│   │           └── page.tsx      # Later account connection
├── components/
│   ├── day-type-selector.tsx     # Breakthrough/Grind/Stuck toggle
│   ├── question-pills.tsx        # Clickable prompt suggestions
│   ├── content-idea-card.tsx     # Idea display card
│   ├── draft-card.tsx            # Draft display card
│   ├── draft-editor.tsx          # Draft editing interface
│   ├── platform-preview.tsx      # Platform-specific preview
│   └── voice-input-placeholder.tsx # Mic icon placeholder
└── lib/
    ├── ai/
    │   ├── generate-ideas.ts     # Idea generation logic
    │   ├── generate-drafts.ts    # Draft generation logic
    │   └── prompts.ts            # Prompt templates
    ├── later/
    │   ├── client.ts             # Later API client
    │   └── types.ts              # Later API types
    └── utils/
        └── content-utils.ts      # Shared content utilities
```

---

## Testing Strategy

### Manual Testing Checklist

**Check-in Form:**
- [ ] Day type selector saves correctly
- [ ] Problem-first fields save to correct columns
- [ ] Question pills insert text into active field
- [ ] Breakthroughs section with flags saves
- [ ] In My Own Words saves
- [ ] Screenshot context prompts appear after upload
- [ ] Voice icons display (non-functional)

**Content Generation:**
- [ ] Generate ideas with single check-in
- [ ] Generate ideas with multiple check-ins (snowball)
- [ ] Rejected ideas appear in next generation cycle
- [ ] Quality scores display correctly
- [ ] Source linking is accurate

**Draft Generation:**
- [ ] LinkedIn draft follows format guidelines
- [ ] Twitter thread splits correctly
- [ ] Character counts accurate
- [ ] Hashtags extracted properly

**Publishing:**
- [ ] Later API connection works
- [ ] Post schedules successfully
- [ ] Status updates correctly
- [ ] Airtable sync works (if configured)

---

## Success Criteria

Phase 1 is complete when:

1. User can submit enhanced check-ins with all new fields
2. AI generates content ideas from check-in material
3. Rejected ideas roll over to next generation cycle
4. Approved ideas generate platform-specific drafts
5. Drafts can be edited and approved
6. Approved drafts publish via Later API
7. Midnight cron triggers generation automatically
8. Quality scoring helps user decide what to publish

---

## Open Questions / Future Considerations

1. **Image analysis:** Should we add Claude Vision to analyse screenshots automatically, or rely solely on user context?

2. **Project memory table:** The North Star mentions `project_memory` table for tracking themes and preventing repetition. Add in Phase 1 or defer?

3. **Performance metrics:** Later API offers analytics. When do we start pulling engagement data back?

4. **Multi-user timezone handling:** Current cron design assumes single user. How to handle multiple users across timezones?

---

## Document History

- v1.0 (December 2025): Initial Phase 1 build plan
