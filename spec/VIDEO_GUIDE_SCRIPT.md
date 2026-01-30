# EasySale — Hackathon Demo Video Script

**Version**: 2.0 (Hackathon Edition)  
**Last Updated**: 2026-01-30  
**Total Runtime**: 2-3 minutes  
**Purpose**: Kiro AI Hackathon Submission

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

#### 4. **HeyGen** (ALTERNATIVE AI AVATAR)
- **Why**: Similar to Synthesia, good voice cloning
- **Process**: Same as Synthesia
- **Cost**: Free tier (1 min/month), $24/month for more
- **Time**: 20-40 minutes

#### 5. **Descript** (BEST FOR EDITING)
- **Why**: Edit video by editing text transcript
- **Process**:
  1. Record screen + voice
  2. AI transcribes
  3. Delete/rearrange text to edit video
  4. AI removes filler words, generates captions
- **Cost**: Free tier available
- **Time**: 45-90 minutes
- **Best For**: If you want to record yourself

#### 6. **Pictory** (SCRIPT TO VIDEO)
- **Why**: Turns script into video with stock footage
- **Process**:
  1. Paste script
  2. AI selects visuals
  3. Add your screen recordings
  4. AI generates voiceover
- **Cost**: $23/month
- **Time**: 30-45 minutes

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

## THE 2-3 MINUTE SCRIPT

### Structure Overview

| Section | Duration | Content |
|---------|----------|---------|
| Hook | 0:00-0:15 | Problem statement + solution |
| Demo | 0:15-1:45 | Show the app working |
| Kiro Process | 1:45-2:15 | How Kiro AI helped build it |
| Wrap-up | 2:15-2:30 | Call to action |

---

### SECTION 1: HOOK (0:00 - 0:15)

**[VISUAL: EasySale logo on dark background, then cut to login screen]**

**NARRATION:**

> "Small retailers need a POS system that works offline, handles multiple stores, and doesn't cost a fortune. I built EasySale in 3 weeks using Kiro AI—a complete point-of-sale system with 150+ API endpoints, multi-tenant architecture, and integrations with QuickBooks and WooCommerce."

**[VISUAL: Quick montage of key screens - dashboard, sell page, inventory]**

---

### SECTION 2: LIVE DEMO (0:15 - 1:45)

#### Part A: Login & Dashboard (0:15 - 0:30)

**[VISUAL: Login page → Dashboard]**

**NARRATION:**

> "The system uses JWT authentication with role-based access. Here's the dashboard showing real-time sales stats, alerts for low stock, and quick actions."

**ACTIONS:**
1. Show login page (2 sec)
2. Login with admin credentials (created during setup) (3 sec)
3. Pan across dashboard stats (5 sec)
4. Hover over quick actions (3 sec)

---

#### Part B: Making a Sale (0:30 - 1:00)

**[VISUAL: Sell page - add products, checkout]**

**NARRATION:**

> "The core POS flow: search products, add to cart, apply discounts, and checkout. Everything persists to SQLite locally and syncs when online. Watch the totals calculate in real-time."

**ACTIONS:**
1. Navigate to Sell page (2 sec)
2. Search for a product (3 sec)
3. Click to add to cart (2 sec)
4. Add another product (2 sec)
5. Adjust quantity with +/- (3 sec)
6. Show totals updating (3 sec)
7. Click Cash payment (2 sec)
8. Complete sale in modal (5 sec)
9. Show success state (3 sec)

---

#### Part C: Inventory & Customers (1:00 - 1:20)

**[VISUAL: Inventory page → Customers page]**

**NARRATION:**

> "Full inventory management with stock tracking, low-stock alerts, and barcode scanning. Customer profiles track purchase history and loyalty tiers."

**ACTIONS:**
1. Navigate to Inventory (2 sec)
2. Show stats cards (3 sec)
3. Click Alerts tab - show low stock items (4 sec)
4. Navigate to Customers (2 sec)
5. Click a customer to show profile (4 sec)
6. Show loyalty tier badge (3 sec)

---

#### Part D: Admin & Integrations (1:20 - 1:45)

**[VISUAL: Admin page → Integrations → Sync Dashboard]**

**NARRATION:**

> "The admin panel configures everything: users, taxes, hardware, and integrations. Connect to QuickBooks, WooCommerce, Stripe, and more. The sync dashboard shows real-time status across all platforms."

**ACTIONS:**
1. Navigate to Admin (2 sec)
2. Click through sidebar items quickly (5 sec)
3. Go to Integrations page (2 sec)
4. Show integration cards (4 sec)
5. Go to System Health (2 sec)
6. Show sync dashboard metrics (5 sec)
7. Show sync history (3 sec)

---

### SECTION 3: KIRO AI PROCESS (1:45 - 2:15)

**[VISUAL: Show .kiro folder structure, then specs, then blog posts]**

**NARRATION:**

> "Here's how Kiro AI made this possible. I used spec-driven development—writing requirements and design docs first, then letting Kiro execute. The `.kiro` folder contains steering documents, global rules, and feature specs. Each feature started as a spec, got implemented, then documented in the dev blog. Over 50 blog posts track the entire journey from foundation to production."

**ACTIONS:**
1. Show `.kiro/` folder in VS Code (3 sec)
2. Open `steering/product.md` briefly (3 sec)
3. Open `specs/` folder, show list (4 sec)
4. Open one spec's `tasks.md` (3 sec)
5. Show `blog/` folder with dated entries (4 sec)
6. Open one blog post briefly (3 sec)
7. Show `archive/` folder with 300+ files (3 sec)
8. Quick scroll through archive (3 sec)

---

### SECTION 4: WRAP-UP (2:15 - 2:30)

**[VISUAL: GitHub repo → README → Back to app]**

**NARRATION:**

> "EasySale is open source under Apache 2.0. Check out the GitHub repo for full documentation, the complete development log, and instructions to run it yourself. Thanks for watching!"

**ACTIONS:**
1. Show GitHub repo page (3 sec)
2. Scroll README briefly (4 sec)
3. Show the running app one more time (3 sec)
4. End on logo or repo URL (3 sec)

---

## RECORDING CHECKLIST

### Before Recording

- [ ] App running at `localhost:7945`
- [ ] Logged out (to show login flow)
- [ ] Demo data seeded (products, customers, transactions)
- [ ] Browser at 1920x1080, no extensions visible
- [ ] Dark theme enabled
- [ ] VS Code open with `.kiro/` folder ready
- [ ] GitHub repo page open in another tab

### Demo Data Needed

- [ ] 10+ products across 3 categories
- [ ] 5+ customers with different tiers
- [ ] 3+ recent transactions
- [ ] At least 2 low-stock items for alerts

### Recording Tips

1. **Practice the flow 2-3 times** before recording
2. **Move the mouse slowly** - AI tools track cursor
3. **Pause briefly** on important screens (2-3 sec)
4. **Don't rush** - 2:30 is fine, don't squeeze to 2:00
5. **Record in segments** if easier, then stitch together

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

## QUICK SCRIPT (COPY-PASTE VERSION)

For AI voiceover tools, here's the script as plain text:

```
Small retailers need a POS system that works offline, handles multiple stores, and doesn't cost a fortune. I built EasySale in 3 weeks using Kiro AI—a complete point-of-sale system with 150 API endpoints, multi-tenant architecture, and integrations with QuickBooks and WooCommerce.

The system uses JWT authentication with role-based access. Here's the dashboard showing real-time sales stats, alerts for low stock, and quick actions.

The core POS flow: search products, add to cart, apply discounts, and checkout. Everything persists to SQLite locally and syncs when online. Watch the totals calculate in real-time.

Full inventory management with stock tracking, low-stock alerts, and barcode scanning. Customer profiles track purchase history and loyalty tiers.

The admin panel configures everything: users, taxes, hardware, and integrations. Connect to QuickBooks, WooCommerce, Stripe, and more. The sync dashboard shows real-time status across all platforms.

Here's how Kiro AI made this possible. I used spec-driven development—writing requirements and design docs first, then letting Kiro execute. The kiro folder contains steering documents, global rules, and feature specs. Each feature started as a spec, got implemented, then documented in the dev blog. Over 50 blog posts track the entire journey from foundation to production.

EasySale is open source under Apache 2.0. Check out the GitHub repo for full documentation, the complete development log, and instructions to run it yourself. Thanks for watching!
```

---

## ALTERNATIVE: 60-SECOND PITCH VERSION

If you need an even shorter version:

```
EasySale is a white-label POS system I built in 3 weeks with Kiro AI. 

It's offline-first, multi-tenant, and integrates with QuickBooks and WooCommerce out of the box.

[Show quick montage: login, sell page, inventory, sync dashboard]

The secret? Spec-driven development. I wrote requirements first, let Kiro implement them, and documented everything. The kiro folder has all the specs, and the blog folder has 50+ entries tracking the journey.

150 API endpoints. 50 database tables. Production-ready.

Check out the repo at github.com/derickladwig/EasySale. Thanks!
```

---

*Last Updated: 2026-01-30*
