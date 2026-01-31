# EasySale — Hackathon Demo Video Script

**Version**: 3.0 (Hackathon Edition)  
**Last Updated**: 2026-01-30  
**Total Runtime**: 2–3 minutes  
**Purpose**: Kiro AI Hackathon Submission

---

## Runtime Map

| Timestamp | Section | Duration |
|-----------|---------|----------|
| 0:00–0:12 | Hook (problem + what you built) | 12s |
| 0:12–1:35 | Live product proof (sell, inventory, customers, admin/integrations) | 83s |
| 1:35–2:05 | Offline + multi-tenant + variants proof | 30s |
| 2:05–2:35 | Kiro/spec process proof | 30s |
| 2:35–2:55 | Wrap-up (repo, Apache 2.0, run it yourself) | 20s |

---

## THE SCRIPT

### 0:00–0:12 — Hook (one sentence problem + one sentence solution)

**VISUAL**: Logo → quick montage (Sell → Inventory → Sync Dashboard)

**NARRATION** (tight):

> "Retailers need a POS that keeps working when the internet doesn't, supports multiple stores, and can be white-labeled without rewriting code. EasySale is an offline-first, multi-tenant POS with feature-gated build variants and a full REST API—built spec-first with Kiro."

**ON-SCREEN CALLOUTS** (small):
- "Offline-first (SQLite + queue)"
- "Multi-tenant + white-label configs"
- "Lite / Export / Full builds"
- "Rust + React + 150+ endpoints"

---

### 0:12–0:35 — Login + Dashboard (prove it's real software)

**VISUAL**: Login → dashboard loads

**NARRATION**:

> "Authentication is JWT-based with role permissions. After login, the dashboard shows sales, alerts, and operational shortcuts—designed for touch-first retail use."

**ACTIONS** (smooth & slow mouse):
1. Login (first-time setup creates your own admin credentials)
2. Pause 2 seconds on the dashboard
3. Hover a couple actions / stats

**PRO TIP**: Don't oversell the dashboard. Just prove it loads and looks coherent.

---

### 0:35–1:05 — Make a Sale (your strongest "it works" moment)

**VISUAL**: Sell page → add items → checkout

**NARRATION**:

> "Here's the core POS flow—search products, add to cart, apply quantity or discounts, and complete payment. Every action writes immediately to local SQLite, then syncs when online."

**ACTIONS**:
1. Search product
2. Add 2 items
3. Change quantity
4. Complete a cash sale
5. Show success confirmation

**ON-SCREEN CALLOUT**: "Writes locally first → sync later"

---

### 1:05–1:25 — Inventory + Customers (prove breadth + data relationships)

**VISUAL**: Inventory → low stock → open a customer → show recent orders or stats

**NARRATION**:

> "Inventory tracks stock and flags low items. Customer profiles show purchase history and loyalty tiers—so staff can help fast at the counter."

**ACTIONS**:
1. Inventory: open low-stock/alerts view
2. Customers: click one customer → show profile with tier badge

---

### 1:25–1:35 — Admin + Integrations (prove configurability)

**VISUAL**: Admin sidebar → Integrations cards → Sync dashboard (quick)

**NARRATION**:

> "Admin settings control taxes, users, stores, and integrations. Connectors like QuickBooks and WooCommerce are configured here, and the sync dashboard shows health and history across systems."

**ACTIONS**:
1. Click Integrations
2. Flash Sync dashboard metrics + recent runs

---

### 1:35–2:05 — The "Proof Trio" (offline + multi-tenant + build variants)

This is the missing piece in most hackathon demos. You want 3 fast visual proofs.

#### Proof 1: Offline-first (10 seconds)

**VISUAL**: DevTools → Network → "Offline" → complete a tiny action

**NARRATION**:

> "Now I'll turn the internet off. The app still works—sales and updates continue locally, and sync queues for later."

**ACTIONS**:
1. Open DevTools → Network → Offline
2. Add an item / complete a tiny transaction OR update a field
3. Show it succeeded (no spinner doom)

**ON-SCREEN CALLOUT**: "Offline mode: OK"

#### Proof 2: Multi-tenant + white-label (10 seconds)

**VISUAL**: Quick config switch → branding/theme changes OR tenant name/store identity changes

**NARRATION**:

> "Branding and behavior are configuration-driven. Switching tenant config updates the app identity without code changes."

**ACTIONS**:
1. Show `configs/` quickly OR a tenant selector screen if you have it
2. Flip tenant/store identity and show a visible change (logo/name/theme)

**ON-SCREEN CALLOUT**: "White-label via JSON configs"

#### Proof 3: Build variants are real (10 seconds)

**VISUAL**: Show one feature that exists only in Export/Full (Reports/OCR/Docs) and mention gating

**NARRATION**:

> "And builds are feature-gated. Lite runs core POS only, Export adds admin and reporting, and Full adds OCR and document workflows."

**ACTIONS**:
1. Show a Full-only menu item (OCR/doc tools) OR an Export-only reporting page
2. If possible: briefly show a capabilities/feature flag page

---

### 2:05–2:35 — Kiro/Spec-Driven Development Proof (show, don't tell)

**VISUAL**: VS Code → `.kiro/` → one spec folder → tasks → blog/archive

**NARRATION**:

> "I built EasySale spec-first. Each feature starts as requirements and a design in `.kiro/specs`, then tasks drive implementation. The blog and archive preserve the full trail—decisions, status, and progress—so the system stays consistent as it grows."

**ACTIONS** (keep snappy):
1. Show `.kiro/steering/` (product + tech + structure)
2. Open one spec folder: `requirements.md`, `design.md`, `tasks.md`
3. Show `blog/` entries list (64 posts)
4. Show `archive/` exists (390+ files—don't scroll too long)

**ON-SCREEN CALLOUT**: "Specs → Tasks → Code → Docs (traceable)"

---

### 2:35–2:55 — Wrap-up (repo, license, run instructions)

**VISUAL**: GitHub repo page → README → end on app logo

**NARRATION**:

> "EasySale is open source under Apache 2.0. The repo includes install steps, build variants, and full documentation. Thanks—and check it out at github.com/derickladwig/EasySale."

---

## RECORDING CHECKLIST

### Before Recording

- [ ] App running at `localhost:7945` (frontend) / `localhost:8923` (backend)
- [ ] Logged out (to show login flow)
- [ ] Demo data seeded (products, customers, transactions)
- [ ] Browser at 1920x1080, no extensions visible
- [ ] Dark theme enabled (default)
- [ ] VS Code open with `.kiro/` folder ready
- [ ] GitHub repo page open in another tab

### Demo Data Needed

- [ ] 10+ products across 3 categories
- [ ] 5+ customers with different tiers
- [ ] 3+ recent transactions
- [ ] At least 2 low-stock items for alerts

### Recording Tips

1. **Practice the flow 2-3 times** before recording
2. **Move the mouse slowly** — AI tools track cursor
3. **Pause briefly** on important screens (2-3 sec)
4. **Don't rush** — 2:30 is fine, don't squeeze to 2:00
5. **Record in segments** if easier, then stitch together

---

## QUICK SCRIPT (COPY-PASTE VERSION)

For AI voiceover tools, here's the script as plain text:

```
Retailers need a POS that keeps working when the internet doesn't, supports multiple stores, and can be white-labeled without rewriting code. EasySale is an offline-first, multi-tenant POS with feature-gated build variants and a full REST API—built spec-first with Kiro.

Authentication is JWT-based with role permissions. After login, the dashboard shows sales, alerts, and operational shortcuts—designed for touch-first retail use.

Here's the core POS flow—search products, add to cart, apply quantity or discounts, and complete payment. Every action writes immediately to local SQLite, then syncs when online.

Inventory tracks stock and flags low items. Customer profiles show purchase history and loyalty tiers—so staff can help fast at the counter.

Admin settings control taxes, users, stores, and integrations. Connectors like QuickBooks and WooCommerce are configured here, and the sync dashboard shows health and history across systems.

Now I'll turn the internet off. The app still works—sales and updates continue locally, and sync queues for later.

Branding and behavior are configuration-driven. Switching tenant config updates the app identity without code changes.

And builds are feature-gated. Lite runs core POS only, Export adds admin and reporting, and Full adds OCR and document workflows.

I built EasySale spec-first. Each feature starts as requirements and a design in the kiro specs folder, then tasks drive implementation. The blog and archive preserve the full trail—decisions, status, and progress—so the system stays consistent as it grows.

EasySale is open source under Apache 2.0. The repo includes install steps, build variants, and full documentation. Thanks—and check it out at github.com/derickladwig/EasySale.
```

---

## VERIFIED PROJECT STATS

These numbers are verified from the actual codebase (2026-01-30):

| Metric | Count | Source |
|--------|-------|--------|
| API Endpoints | 150+ | `backend/crates/server/src/main.rs` |
| Database Migrations | 57 | `backend/migrations/*.sql` |
| Blog Posts | 72 | `blog/*.md` |
| Archive Files | 390+ | `archive/**/*` |
| Spec Folders | 26 | `.kiro/specs/` |
| Steering Files | 5 | `.kiro/steering/` |
| Build Variants | 3 | Lite, Export, Full |
| Frontend Port | 7945 | `docker-compose.yml` |
| Backend Port | 8923 | `docker-compose.yml` |

---

## AI VIDEO CREATION GUIDE

### Recommended AI Tools (Best to Worst for This Use Case)

#### 1. **Loom + AI Script** (RECOMMENDED - Fastest)
- **Why**: Screen recording with AI-generated captions, easy editing
- **Process**: 
  1. Write script in Loom's teleprompter
  2. Record screen + webcam (optional)
  3. AI auto-generates captions
  4. Trim and edit in-browser
- **Cost**: Free tier available
- **Time**: 30-60 minutes total

#### 2. **Guidde** (BEST FOR SOFTWARE DEMOS)
- **Why**: AI automatically creates step-by-step guides from screen recordings
- **Process**:
  1. Install browser extension
  2. Click through your app
  3. AI generates narration and highlights
  4. Export as video
- **Cost**: Free tier (3 videos/month)
- **Time**: 15-30 minutes
- **Limitation**: More tutorial-style, less "pitch" style

#### 3. **Synthesia** (BEST FOR AI AVATAR)
- **Why**: AI avatar presents your script, no recording needed
- **Process**:
  1. Paste script
  2. Choose avatar and voice
  3. Add screen recordings as B-roll
  4. Generate video
- **Cost**: $30/month or pay-per-video
- **Time**: 20-40 minutes
- **Limitation**: Avatars can feel impersonal

#### 4. **Descript** (BEST FOR EDITING)
- **Why**: Edit video by editing text transcript
- **Process**:
  1. Record screen + voice
  2. AI transcribes
  3. Delete/rearrange text to edit video
  4. AI removes filler words, generates captions
- **Cost**: Free tier available
- **Time**: 45-90 minutes
- **Best For**: If you want to record yourself

### My Recommendation for This Hackathon

**Option A: Quick & Professional (Loom)**
1. Open Loom, paste the script below as teleprompter
2. Record yourself clicking through the app (2-3 takes)
3. Use Loom's AI to add captions
4. Trim to 2-3 minutes
5. Export and upload

**Option B: No Face on Camera (Guidde + Descript)**
1. Use Guidde to record clicking through app
2. Export to Descript
3. Replace Guidde's auto-narration with your voice or AI voice
4. Add intro/outro slides

**Option C: Fully AI-Generated (Synthesia)**
1. Paste script into Synthesia
2. Record screen captures separately
3. Add screen recordings as B-roll
4. Let AI avatar do the talking

---

## ALTERNATIVE: 60-SECOND PITCH VERSION

If you need an even shorter version:

```
EasySale is a white-label POS system I built spec-first with Kiro AI. 

It's offline-first, multi-tenant, and integrates with QuickBooks and WooCommerce out of the box.

[Show quick montage: login, sell page, inventory, sync dashboard]

The secret? Spec-driven development. I wrote requirements first, let Kiro implement them, and documented everything. The kiro folder has 26 spec folders, and the blog has 64 entries tracking the journey.

150 API endpoints. 57 database migrations. Production-ready.

Check out the repo at github.com/derickladwig/EasySale. Thanks!
```

---

## POST-PRODUCTION

### If Using Loom
1. Trim dead air at start/end
2. Enable AI captions
3. Add chapter markers
4. Export as MP4

### If Using Guidde
1. Review auto-generated narration
2. Re-record any awkward sections
3. Add intro/outro slides
4. Export at 1080p

### If Using Synthesia/HeyGen
1. Upload screen recordings as B-roll
2. Time avatar speech to match visuals
3. Add transitions between sections
4. Export at 1080p

### Final Checks
- [ ] Video is 2-3 minutes (not over 5!)
- [ ] Audio is clear and consistent
- [ ] All text is readable
- [ ] No sensitive data visible (passwords, keys)
- [ ] Captions/subtitles added
- [ ] Thumbnail created

---

## UPLOAD DESTINATIONS

| Platform | Purpose | Settings |
|----------|---------|----------|
| YouTube | Primary host | Unlisted or Public |
| Loom | Backup/easy sharing | Public link |
| Google Drive | Submission backup | Anyone with link |

### Submission Checklist
- [ ] Video uploaded and playable
- [ ] Link tested in incognito browser
- [ ] Link added to hackathon submission form
- [ ] Link added to README.md

---

*Last Updated: 2026-01-30*
