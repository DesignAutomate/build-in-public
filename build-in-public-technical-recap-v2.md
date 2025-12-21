# Build in Public - Technical Recap

## What's Been Built (December 2025)

This document captures the current state of the Build in Public app for continuity across development sessions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 with App Router |
| Styling | Tailwind CSS + Custom "Warm Industrial" design system |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude API |
| Publishing | Later API (getlate.dev) |
| Language | TypeScript |
| Icons | Lucide React |
| Fonts | Space Grotesk (display) + Sora (body) |

---

## Environment

### Supabase Project
- **Project ID:** soalrvabjfhujvaxlbcm
- **URL:** https://soalrvabjfhujvaxlbcm.supabase.co
- **Storage Bucket:** `uploads` (private)

### Local Environment
- **Project Location:** `C:\App_Development\BuildInPublic\build-in-public`
- **GitHub Branch:** `claude/setup-nextjs-project-DW5Lu` (not merged to main due to permissions)
- **Dev Server:** `npm run dev` → http://localhost:3000

### Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://soalrvabjfhujvaxlbcm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_7Tr7DEH3-5o9huzv_pGHfw_Bey2EPtj
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1PLZUcDlYPvE8lwEemSqZA_ShFDvjBS
ANTHROPIC_API_KEY=[stored in project]
```

**To add for Phase 1:**
```
LATER_API_KEY=[from Later dashboard]
LATER_PROFILE_ID=[from Later dashboard]
CRON_SECRET=[generate random string]
```

---

## Design System

### Colours (CSS Variables)
```css
--bg-primary: #0c0c0f (deep charcoal)
--bg-card: dark card backgrounds
--bg-elevated: elevated surfaces
--text-primary: warm cream
--text-secondary: muted text
--text-muted: subtle text
--accent-coral: #ff6b6b (primary accent)
--accent-teal: #2dd4bf (secondary accent)
--accent-amber: #f59e0b (tertiary accent)
--border-default: default borders
--border-subtle: subtle borders
```

### Design Features
- Noise texture overlay for depth
- Staggered fade-in animations
- Hover glows on interactive elements
- Gradient accents on cards
- Dark sidebar with light content area

---

## Database Schema (Current State)

### Tables

```sql
-- User Settings
user_settings (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    business_name TEXT,
    business_description TEXT,
    brand_voice TEXT,
    audience_description TEXT,
    audience_interests TEXT[],
    platforms_enabled TEXT[],
    check_in_times JSONB,
    timezone TEXT,
    email_notifications BOOLEAN,
    notification_email TEXT,
    created_at, updated_at
)

-- Projects
projects (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    name TEXT,
    description TEXT,
    goals TEXT,
    target_audience TEXT,
    content_angle TEXT,
    status TEXT, -- 'active', 'paused', 'completed'
    progress_percentage INTEGER,
    ai_context TEXT,
    technologies_used TEXT[],
    started_at TIMESTAMPTZ,
    target_completion TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at, updated_at
)

-- Check-ins (ENHANCED for Phase 1)
check_ins (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    check_in_type TEXT, -- 'morning', 'midday', 'evening'
    check_in_date DATE,
    general_notes TEXT,
    mood TEXT, -- DEPRECATED: use day_type instead
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at,
    -- NEW FIELDS (Phase 1)
    day_type TEXT, -- 'breakthrough', 'grind', 'stuck'
    breakthroughs TEXT,
    in_my_own_words TEXT,
    flag_youtube BOOLEAN DEFAULT false,
    flag_linkedin BOOLEAN DEFAULT false
)

-- Project Updates (ENHANCED for Phase 1)
project_updates (
    id UUID PRIMARY KEY,
    check_in_id UUID REFERENCES check_ins,
    project_id UUID REFERENCES projects,
    update_text TEXT,
    progress_made TEXT,
    is_win BOOLEAN,
    is_blocker BOOLEAN,
    blocker_description TEXT,
    created_at,
    -- NEW FIELDS (Phase 1)
    problem_to_solve TEXT,
    what_didnt_work TEXT,
    what_worked TEXT,
    surprise_learning TEXT
)

-- Uploads (ENHANCED for Phase 1)
uploads (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    check_in_id UUID REFERENCES check_ins,
    project_update_id UUID REFERENCES project_updates,
    project_id UUID REFERENCES projects,
    file_url TEXT, -- storage path
    file_type TEXT,
    file_name TEXT,
    file_size INTEGER,
    ai_analysis JSONB,
    ai_analysis_completed BOOLEAN,
    sensitivity_flag BOOLEAN,
    sensitivity_reason TEXT,
    sensitivity_reviewed BOOLEAN,
    sensitivity_approved BOOLEAN,
    user_context TEXT, -- DEPRECATED: use new fields below
    created_at,
    -- NEW FIELDS (Phase 1)
    what_am_i_looking_at TEXT,
    why_does_this_matter TEXT
)

-- Content Ideas (ENHANCED for Phase 1)
content_ideas (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    source_date DATE,
    source_check_ins UUID[],
    source_uploads UUID[],
    source_projects UUID[],
    idea_title TEXT,
    idea_summary TEXT,
    suggested_angle TEXT,
    suggested_hook TEXT,
    interest_score INTEGER,
    interest_reasoning TEXT,
    scoring_criteria JSONB,
    status TEXT, -- 'pending', 'approved', 'rejected', 'incorporated'
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    idea_type TEXT,
    created_at,
    -- NEW FIELDS (Phase 1)
    rolled_over_from UUID[], -- previous rejected idea IDs incorporated
    material_days INTEGER DEFAULT 1, -- how many days of material used
    quality_recommendation TEXT -- 'strong', 'publishable_thin', 'needs_more'
)

-- Content Drafts
content_drafts (
    id UUID PRIMARY KEY,
    content_idea_id UUID REFERENCES content_ideas,
    user_id UUID REFERENCES auth.users,
    platform TEXT,
    content_format TEXT,
    draft_text TEXT,
    draft_title TEXT,
    hashtags TEXT[],
    carousel_slides JSONB,
    carousel_images TEXT[],
    video_script TEXT,
    video_url TEXT,
    status TEXT, -- 'draft', 'approved', 'scheduled', 'published'
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    later_post_id TEXT,
    platform_post_id TEXT,
    platform_post_url TEXT,
    user_edited BOOLEAN,
    edit_history JSONB,
    created_at, updated_at
)

-- User Streaks
user_streaks (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users,
    current_streak INTEGER,
    longest_streak INTEGER,
    last_check_in_date DATE,
    skip_days_used_this_week INTEGER,
    week_start_date DATE,
    total_check_ins INTEGER,
    total_uploads INTEGER,
    total_content_published INTEGER,
    updated_at
)
```

### Row Level Security
All tables have RLS enabled with policies so users can only see their own data.

### Storage
- Bucket: `uploads`
- Private bucket (requires signed URLs)
- Path format: `{user_id}/{timestamp}_{filename}`
- Policies: Users can upload/view/delete only their own files

---

## File Structure

```
build-in-public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── debug-uploads/
│   │   │       └── route.ts          # Debug endpoint for upload troubleshooting
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts          # Supabase auth callback handler
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── settings/
│   │   │   │   └── page.tsx          # User settings form
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx          # Projects list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx      # New project form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Project detail/edit
│   │   │   ├── check-in/
│   │   │   │   ├── page.tsx          # New check-in form
│   │   │   │   ├── history/
│   │   │   │   │   └── page.tsx      # Check-in history list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Check-in detail/edit
│   │   │   └── content/
│   │   │       └── page.tsx          # Content page (placeholder)
│   │   ├── login/
│   │   │   └── page.tsx              # Login form
│   │   ├── signup/
│   │   │   └── page.tsx              # Signup form
│   │   ├── layout.tsx                # Root layout with fonts
│   │   ├── page.tsx                  # Home (redirects to login)
│   │   └── globals.css               # Design system CSS
│   ├── components/
│   │   ├── dashboard-nav.tsx         # Sidebar navigation
│   │   ├── project-card.tsx          # Project card for grid
│   │   ├── project-selector.tsx      # Multi-select project chips
│   │   ├── file-upload.tsx           # Drag/drop upload with Ctrl+V
│   │   └── sign-out-button.tsx       # Sign out button component
│   └── lib/
│       └── supabase/
│           ├── client.ts             # Browser Supabase client
│           ├── server.ts             # Server Supabase client
│           └── middleware.ts         # Auth middleware helper
├── middleware.ts                      # Next.js middleware for auth
├── .env.local                         # Environment variables (not in git)
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Features Working

### Authentication ✅
- Email/password signup with email confirmation
- Login/logout
- Protected routes (redirect to /login if not authenticated)
- Session management via Supabase

### Dashboard ✅
- Welcome message with user's name
- Stat cards (streak, content published, engagement - placeholder data)
- Getting started CTA
- Sidebar navigation with:
  - New Check-in button (prominent)
  - Dashboard, Projects, Check-ins, Content, Settings links
  - User email and sign out

### Settings ✅
- Business name, description
- Brand voice, target audience
- Audience interests (comma-separated → array)
- Notification email
- Loads existing, saves via upsert
- Success/error feedback

### Projects ✅
- Create new project with all fields
- List view with status badges and progress bars
- Edit existing project
- Progress slider (0-100%)
- Status toggle (active/paused/completed)
- Delete with confirmation
- Technologies stored as array

### Check-ins ✅
- New check-in form with:
  - Time-based type detection (morning/midday/evening)
  - Project selection (multi-select)
  - Per-project update with win/blocker flags
  - General notes
  - Mood selector
- File upload:
  - Drag and drop
  - Ctrl+V paste from clipboard
  - Stores to Supabase storage
  - Signed URLs for display
  - Context notes per upload
  - Delete uploads
- Check-in history:
  - Timeline view grouped by date
  - Type icons and timestamps
  - Project tags
  - Thumbnail previews
  - Click to view/edit
- Check-in detail:
  - View all information
  - Edit project updates
  - Add new uploads
  - Delete uploads
  - Save changes with feedback
  - Delete check-in with confirmation
- After save: redirects to history with success message

---

## Current Development Phase

### Phase 1: Content Generation (IN PROGRESS)

**Status:** Schema updated, build plan documented

**Build Packages:**
1. ✅ Database Schema Updates - COMPLETE
2. ⏳ Enhanced Check-in Form UI - NEXT
3. ⬜ Content Generation API
4. ⬜ Content Ideas Review UI
5. ⬜ Platform Draft Generation API
6. ⬜ Draft Editing UI
7. ⬜ Later API Integration
8. ⬜ Trigger Mechanisms (Cron)

**Reference:** See `phase-1-content-generation-plan.md` for full details.

---

## Known Issues / Notes

1. **Middleware warning:** Next.js 16 shows deprecation warning for middleware. Can ignore - still works.

2. **Hydration warning:** Caused by browser extensions (Grammarly). Development only, doesn't affect production.

3. **GitHub branch:** All code is on `claude/setup-nextjs-project-DW5Lu` branch, not main. Direct push to main is blocked by permissions.

4. **Image URLs:** Using signed URLs for private storage bucket. URLs expire after 1 hour.

5. **Mood field deprecated:** The `mood` field in check_ins is being replaced by `day_type` (breakthrough/grind/stuck) in Phase 1.

---

## Test Data

### Test User
- **Email:** iain@scaleva.co.uk
- **Has:** Settings configured, 1 project, 2 check-ins with 5 uploads

### Data Counts (as of Dec 2025)
- Check-ins: 2
- Project updates: 2
- Uploads: 5
- Projects: 1

---

## External Services

### Later API (getlate.dev)
- **Purpose:** Social media publishing to LinkedIn, Twitter/X, Instagram, etc.
- **Auth:** Bearer token with API key
- **Base URL:** https://getlate.dev/api/v1
- **Key endpoint:** POST /posts (schedule content)
- **Features:** Multi-platform posting, scheduling, analytics
- **Has n8n node:** Yes (community node available)

### Anthropic Claude API
- **Purpose:** AI content generation
- **Model:** claude-sonnet-4-20250514 (or latest)
- **Key stored:** In project environment

---

## Commands Reference

```bash
# Navigate to project
cd C:\App_Development\BuildInPublic\build-in-public

# Install dependencies
npm install

# Run development server
npm run dev

# Install new packages
npm install [package-name]

# Install Anthropic SDK (for Phase 1)
npm install @anthropic-ai/sdk
```

---

## Document Versions

- **North Star:** build-in-public-north-star-v1.md (comprehensive product plan)
- **Phase 1 Plan:** phase-1-content-generation-plan.md (current build plan)
- **This Recap:** build-in-public-technical-recap.md (what's built)
- **Reference:** Content_App_Reference_Document.docx (research/strategy - in project files)

---

## Document History

- v1.0 (December 2025): Initial technical recap
- v1.1 (December 2025): Updated with Phase 1 schema changes and build status
