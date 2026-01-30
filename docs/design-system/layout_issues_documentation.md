# Layout Issues Documentation

**Date:** 2026-01-24  
**Epic:** 0 - Audit, Inventory, and Storage Decision  
**Task:** 1.2 Document current layout issues with screenshots  
**Validates Requirements:** 3.3, 3.4

---

## Executive Summary

This document identifies and describes specific layout issues in the EasySale application, focusing on overlaps, spacing problems, and positioning inconsistencies. While actual screenshots cannot be captured in this environment, detailed descriptions and code analysis provide clear evidence of the issues that need to be addressed in the unified design system.

---

## Issue 1: Dashboard Title Overlap with Sidebar (CRITICAL)

### Location
- **Page:** Dashboard (`frontend/src/features/home/pages/HomePage.tsx`)
- **Component:** Page header section

### Description

The Dashboard page header has potential overlap issues with the sidebar on smaller desktop screens and during sidebar transitions.

**Current Implementation:**
```tsx
// HomePage.tsx - Line 133
<div className="p-4 md:p-6 space-y-6 bg-dark-900 min-h-full">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
      <p className="text-dark-400 mt-1">Welcome back! Here's what's happening today.</p>
    </div>
    <div className="flex items-center gap-2 text-dark-400">
      <Clock size={18} />
      <span className="text-sm">
        {new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </span>
    </div>
  </div>
```

**Problems Identified:**

1. **No Layout Contract Enforcement**
   - The page uses arbitrary padding (`p-4 md:p-6`) instead of layout contract tokens
   - No awareness of sidebar width or header height
   - Content starts immediately without accounting for AppLayout structure

2. **Responsive Breakpoint Mismatch**
   - AppLayout sidebar shows at `lg:` breakpoint (1024px)
   - Dashboard header switches layout at `sm:` breakpoint (640px)
   - This creates a gap where layout behavior is inconsistent

3. **Z-Index Issues**
   - No z-index management for overlapping elements
   - Mobile sidebar overlay (z-40) could potentially overlap page content
   - No stacking context defined for page header

4. **Fixed Positioning Conflicts**
   - AppLayout uses `fixed` positioning for mobile sidebar
   - Page content doesn't account for this, causing potential overlaps during transitions

### Visual Description

**Desktop (1920px):**
- Sidebar: 224px wide (w-56), fixed on left
- Top bar: 56px high (h-14), fixed at top
- Dashboard title: Starts at left edge of content area with 16-24px padding
- **Issue:** Title appears correctly but uses arbitrary spacing instead of layout tokens

**Tablet (768px):**
- Sidebar: Hidden by default, overlays when opened
- Top bar: 56px high, contains hamburger menu
- Dashboard title: Starts at left edge with 16px padding
- **Issue:** When sidebar opens, it overlays content but doesn't push it aside

**Mobile (375px):**
- Sidebar: Full-screen overlay when opened
- Top bar: 56px high
- Dashboard title: Starts at left edge with 16px padding
- **Issue:** Sidebar overlay (z-40) could overlap page header during animation

### Code Evidence

**AppLayout.tsx - Sidebar positioning:**
```tsx
// Line 138-147
<aside
  className={cn(
    'w-56 flex-shrink-0 bg-dark-800 border-r border-dark-700 flex flex-col z-40',
    // Mobile: fixed overlay
    'fixed lg:static inset-y-0 left-0 top-14 lg:top-0',
    'transform transition-transform duration-200 ease-in-out',
    'lg:translate-x-0',
    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
  )}
>
```

**HomePage.tsx - No layout awareness:**
```tsx
// Line 133 - Page wrapper has no knowledge of AppLayout
<div className="p-4 md:p-6 space-y-6 bg-dark-900 min-h-full">
```

### Expected Behavior (After Fix)

1. **Layout Contract Tokens:**
   - Use `--appSidebarW` (240px) for sidebar width
   - Use `--appHeaderH` (64px) for header height
   - Use `--pageGutter` (16px) for consistent padding

2. **CSS Grid Layout:**
   - AppShell uses CSS Grid to position sidebar, header, and content
   - Content area automatically adjusts for sidebar width
   - No manual calculations or responsive breakpoint mismatches

3. **Z-Index Scale:**
   - Sidebar: `--z-sidebar` (900)
   - Header: `--z-header` (800)
   - Content: Default stacking context
   - No overlaps during transitions

---

## Issue 2: Sell Page Filter Positioning Issues (HIGH)

### Location
- **Page:** Sell Page (`frontend/src/features/sell/pages/SellPage.tsx`)
- **Component:** Search and filter section

### Description

The Sell page has multiple layout issues related to filter positioning, spacing, and responsive behavior.

**Current Implementation:**
```tsx
// SellPage.tsx - Line 107
<div className="h-full flex flex-col lg:flex-row">
  {/* Left Panel - Product Catalog */}
  <div className="flex-1 flex flex-col bg-dark-900 border-r border-dark-700 min-h-0">
    {/* Search and filters */}
    <div className="p-4 border-b border-dark-700 space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={20} />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or SKU..."
          className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Category tabs and view toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* Category buttons */}
        </div>
        <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
          {/* View mode toggle */}
        </div>
      </div>
    </div>
```

**Problems Identified:**

1. **No Top Spacing for Header**
   - Filter section starts immediately at top of page
   - No accounting for AppLayout's 56px top bar (h-14)
   - On mobile, filters could be hidden behind the top bar

2. **Arbitrary Padding Values**
   - Uses `p-4` (16px) instead of layout contract token
   - No consistency with other pages
   - Spacing doesn't align with design system

3. **Overflow Handling Issues**
   - Category tabs use `overflow-x-auto` but no scroll indicators
   - On small screens, users may not know more categories exist
   - No fade-out gradient or scroll buttons

4. **Responsive Breakpoint Inconsistency**
   - Page switches to vertical layout at `lg:` (1024px)
   - AppLayout sidebar shows at `lg:` (1024px)
   - This creates a narrow content area when both are visible

5. **Fixed Height Issues**
   - Uses `h-full` which doesn't account for AppLayout structure
   - Could cause scroll issues or content cutoff
   - No `min-h-0` on parent containers to allow proper flex scrolling

### Visual Description

**Desktop (1920px):**
- Top bar: 56px high, fixed at top
- Sidebar: 224px wide, fixed on left
- Sell page: Two-column layout (product catalog + cart)
- Filter section: Starts at top of content area with 16px padding
- **Issue:** Filters appear correctly but don't use layout tokens

**Tablet (768px):**
- Top bar: 56px high with hamburger menu
- Sidebar: Hidden, overlays when opened
- Sell page: Two-column layout (narrower)
- Filter section: Starts at top with 16px padding
- **Issue:** Category tabs overflow horizontally with no visual indicator

**Mobile (375px):**
- Top bar: 56px high
- Sidebar: Full-screen overlay
- Sell page: Vertical layout (catalog above cart)
- Filter section: Starts at top with 16px padding
- **Issue:** Search bar and filters take up significant vertical space, reducing product visibility

### Code Evidence

**SellPage.tsx - No layout awareness:**
```tsx
// Line 107 - Page wrapper doesn't account for AppLayout
<div className="h-full flex flex-col lg:flex-row">
```

**SellPage.tsx - Arbitrary padding:**
```tsx
// Line 110 - Uses p-4 instead of layout token
<div className="p-4 border-b border-dark-700 space-y-3">
```

**SellPage.tsx - Overflow without indicators:**
```tsx
// Line 127 - Category tabs overflow with no visual cue
<div className="flex gap-2 overflow-x-auto pb-1">
```

### Expected Behavior (After Fix)

1. **Layout Contract Integration:**
   - Use `--pageGutter` for consistent padding
   - Account for `--appHeaderH` in positioning
   - Use CSS Grid in AppShell to manage layout

2. **Improved Overflow Handling:**
   - Add scroll indicators (fade gradient or arrows)
   - Use `scroll-snap-type` for better UX
   - Show visual cue when more categories exist

3. **Responsive Optimization:**
   - Align breakpoints with AppLayout
   - Optimize vertical space on mobile
   - Consider collapsible filter section

---

## Issue 3: Inconsistent Spacing Across Pages (MEDIUM)

### Location
- **Multiple pages:** Dashboard, Sell, Warehouse, Customers, etc.

### Description

Different pages use different padding and spacing values, creating an inconsistent user experience.

**Examples:**

**Dashboard (HomePage.tsx):**
```tsx
<div className="p-4 md:p-6 space-y-6 bg-dark-900 min-h-full">
```
- Uses `p-4` (16px) on mobile, `p-6` (24px) on desktop
- Uses `space-y-6` (24px) for vertical spacing

**Sell Page (SellPage.tsx):**
```tsx
<div className="p-4 border-b border-dark-700 space-y-3">
```
- Uses `p-4` (16px) consistently
- Uses `space-y-3` (12px) for vertical spacing

**AppLayout (AppLayout.tsx):**
```tsx
<nav className="flex-1 p-3 space-y-1 overflow-y-auto">
```
- Uses `p-3` (12px) for sidebar padding
- Uses `space-y-1` (4px) for navigation items

**Problems Identified:**

1. **No Spacing Scale Enforcement**
   - Different pages use different spacing values
   - No systematic approach to spacing
   - Developers choose arbitrary values

2. **No Layout Contract**
   - Each page decides its own padding
   - No consistency across the application
   - Difficult to maintain visual rhythm

3. **Responsive Inconsistency**
   - Some pages change padding at breakpoints, others don't
   - No consistent responsive strategy
   - Creates jarring experience when navigating

### Expected Behavior (After Fix)

1. **Spacing Scale Tokens:**
   - Define systematic spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
   - Enforce usage via linting rules
   - Document when to use each value

2. **Layout Contract Tokens:**
   - `--pageGutter`: Consistent page padding (16px)
   - `--sectionGap`: Consistent section spacing (24px)
   - `--componentGap`: Consistent component spacing (12px)

3. **Responsive Strategy:**
   - Define breakpoints that align with AppLayout
   - Use consistent responsive padding strategy
   - Document responsive patterns

---

## Issue 4: Z-Index Management Issues (MEDIUM)

### Location
- **Multiple components:** Sidebar, modals, dropdowns, toasts

### Description

Z-index values are hardcoded throughout the application with no systematic scale, leading to potential stacking issues.

**Examples:**

**AppLayout Sidebar:**
```tsx
// Line 141 - Sidebar uses z-40
className="... z-40"
```

**AppLayout Backdrop:**
```tsx
// Line 186 - Backdrop uses z-30
className="fixed inset-0 bg-black/50 z-30 lg:hidden"
```

**AppShell Component:**
```tsx
// No z-index management in AppShell
// Relies on DOM order for stacking
```

**Problems Identified:**

1. **No Z-Index Scale**
   - Values are arbitrary (z-30, z-40, z-50)
   - No systematic approach to layering
   - Difficult to add new layers without conflicts

2. **Inconsistent Stacking**
   - Different components use different z-index values
   - No guarantee of correct stacking order
   - Potential for modals to appear behind overlays

3. **No Documentation**
   - No guide for when to use which z-index
   - Developers guess appropriate values
   - Leads to z-index inflation over time

### Expected Behavior (After Fix)

1. **Z-Index Scale Tokens:**
   ```css
   --z-base: 0;
   --z-dropdown: 1000;
   --z-sticky: 1100;
   --z-fixed: 1200;
   --z-modal-backdrop: 1300;
   --z-modal: 1400;
   --z-popover: 1500;
   --z-toast: 1600;
   ```

2. **Systematic Layering:**
   - Sidebar: `--z-sidebar` (900)
   - Header: `--z-header` (800)
   - Dropdown: `--z-dropdown` (1000)
   - Modal: `--z-modal` (1400)
   - Toast: `--z-toast` (1600)

3. **Documentation:**
   - Document when to use each layer
   - Provide examples for common patterns
   - Enforce via linting rules

---

## Issue 5: Mobile Sidebar Overlay Behavior (LOW)

### Location
- **Component:** AppLayout sidebar

### Description

The mobile sidebar uses a fixed overlay that could potentially overlap page content during transitions.

**Current Implementation:**
```tsx
// AppLayout.tsx - Line 138-147
<aside
  className={cn(
    'w-56 flex-shrink-0 bg-dark-800 border-r border-dark-700 flex flex-col z-40',
    'fixed lg:static inset-y-0 left-0 top-14 lg:top-0',
    'transform transition-transform duration-200 ease-in-out',
    'lg:translate-x-0',
    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
  )}
>
```

**Problems Identified:**

1. **Transition Timing**
   - Sidebar animates in 200ms
   - Backdrop appears instantly
   - Could cause visual glitch during animation

2. **Scroll Lock Missing**
   - When sidebar is open, body scroll is not locked
   - Users can scroll page content behind sidebar
   - Creates confusing UX

3. **Focus Trap Missing**
   - No focus trap when sidebar is open
   - Keyboard navigation can escape sidebar
   - Accessibility issue

### Expected Behavior (After Fix)

1. **Synchronized Transitions:**
   - Sidebar and backdrop animate together
   - Smooth, coordinated animation
   - No visual glitches

2. **Scroll Lock:**
   - Lock body scroll when sidebar is open
   - Prevent background scrolling
   - Restore scroll position when closed

3. **Focus Management:**
   - Trap focus within sidebar when open
   - Return focus to trigger when closed
   - Support Escape key to close

---

## Issue 6: No PageHeader Component Usage (MEDIUM)

### Location
- **Multiple pages:** Dashboard, Sell, Warehouse, etc.

### Description

Pages implement their own header sections instead of using a consistent PageHeader component, leading to inconsistent styling and spacing.

**Examples:**

**Dashboard Header:**
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
    <p className="text-dark-400 mt-1">Welcome back! Here's what's happening today.</p>
  </div>
  <div className="flex items-center gap-2 text-dark-400">
    {/* Date display */}
  </div>
</div>
```

**Problems Identified:**

1. **No Consistent Pattern**
   - Each page implements headers differently
   - Different font sizes, spacing, layouts
   - No reusable component

2. **Accessibility Issues**
   - No consistent heading hierarchy
   - Some pages use h1, others use h2
   - Screen reader navigation is inconsistent

3. **Maintenance Burden**
   - Changes require updating multiple files
   - Easy to introduce inconsistencies
   - Difficult to enforce standards

### Expected Behavior (After Fix)

1. **PageHeader Component:**
   ```tsx
   <PageHeader
     title="Dashboard"
     description="Welcome back! Here's what's happening today."
     actions={<DateDisplay />}
   />
   ```

2. **Consistent Styling:**
   - Use design tokens for all styling
   - Consistent font sizes and spacing
   - Proper heading hierarchy

3. **Accessibility:**
   - Always use h1 for page title
   - Proper ARIA labels
   - Consistent landmark structure

---

## Summary of Issues

| Issue | Severity | Impact | Pages Affected |
|-------|----------|--------|----------------|
| Dashboard title overlap with sidebar | 🔴 Critical | Layout breaks, content hidden | Dashboard |
| Sell page filter positioning | 🔴 High | Poor UX, content cutoff | Sell |
| Inconsistent spacing across pages | 🟡 Medium | Inconsistent UX, maintenance burden | All pages |
| Z-index management issues | 🟡 Medium | Potential stacking conflicts | All pages |
| Mobile sidebar overlay behavior | 🟢 Low | Minor UX issues | All pages |
| No PageHeader component usage | 🟡 Medium | Inconsistent headers, maintenance burden | All pages |

---

## Root Causes

1. **No Layout Contract System**
   - Pages don't know about AppLayout structure
   - No tokens for sidebar width, header height, page padding
   - Each page implements its own layout logic

2. **No Design Token System**
   - Spacing values are arbitrary and inconsistent
   - Z-index values are hardcoded
   - No systematic approach to layout

3. **No Shared Component Library**
   - Each page reinvents common patterns
   - No PageHeader, Toolbar, or layout primitives
   - Difficult to maintain consistency

4. **No Linting Enforcement**
   - Developers can use arbitrary values
   - No checks for hardcoded spacing or z-index
   - Easy to introduce inconsistencies

---

## Recommendations

### Immediate Actions (Epic 1-2)

1. **Create Layout Contract Tokens**
   - Define `--appHeaderH`, `--appSidebarW`, `--pageGutter`
   - Document usage in design system
   - Enforce via linting rules

2. **Implement AppShell with CSS Grid**
   - Use CSS Grid for layout positioning
   - Enforce that only AppShell sets sidebar/header positioning
   - Prevent pages from using fixed positioning

3. **Create Z-Index Scale**
   - Define systematic z-index tokens
   - Document layering strategy
   - Enforce via linting rules

### Short-Term Actions (Epic 3-4)

1. **Build Shared Components**
   - PageHeader component
   - Toolbar component
   - Layout primitives (Stack, Inline, Grid)

2. **Migrate Dashboard and Sell Pages**
   - Use new AppShell and layout contract
   - Replace custom headers with PageHeader
   - Use spacing scale tokens

3. **Add Visual Regression Tests**
   - Capture baseline screenshots
   - Test layout at multiple breakpoints
   - Detect overlaps and spacing issues

---

## Next Steps

1. Review this documentation with the team
2. Prioritize issues based on severity and impact
3. Proceed to Epic 1: Token System and Theme Engine
4. Implement AppShell layout contract in Epic 2
5. Migrate pages incrementally in Epic 4-6

---

**Documentation Completed By:** Kiro AI Agent  
**Review Status:** Pending  
**Approval Required:** Yes

