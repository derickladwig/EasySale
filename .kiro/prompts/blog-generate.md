# Blog Content Generator

You are generating blog content from the development session's commit history.

## Your Task

1. **Gather commits:**
   - Run `git log --all --oneline --decorate` to see recent commits
   - Look for commits with `[BLOG]` prefix
   - Read full commit messages for blog-worthy commits

2. **Analyze the narrative:**
   - What was the goal?
   - What approaches were tried?
   - What worked and what didn't?
   - What was learned?
   - Were there any funny/ironic moments?

3. **Generate blog post:**
   - Title: Catchy and descriptive
   - Opening: Set the scene (what we wanted to accomplish)
   - Body: Tell the story chronologically
     - What we tried first
     - What happened (good or bad)
     - Pivots and iterations
     - The "aha!" moments
     - The struggles (be honest!)
   - Closing: What we learned, what's next
   - Mood: Include emoji to capture the vibe

4. **Style guidelines:**
   - **Humorous & Vulnerable**: Admit mistakes, share struggles
   - **Narrative-Driven**: Tell a story, not just list facts
   - **Technically Honest**: Show the messy reality, not just happy path
   - **Developer-to-Developer**: Write for someone who codes

## Output Format

Create a markdown file in `blog/` directory with format: `YYYY-MM-DD-slug.md`

```markdown
---
title: "Your Catchy Title"
date: 2026-01-08
tags: [relevant, tags, here]
mood: 🎉
---

# Your Catchy Title

## The Goal
[What we set out to accomplish]

## The Journey
[The story of what happened - chronological, honest, detailed]

### What We Tried
[Approach 1, 2, 3...]

### What Actually Happened
[The reality - bugs, pivots, surprises]

### The Breakthrough (or Breakdown)
[The key moment - success or learning experience]

## The Lessons
[What we learned - technical and process]

## What's Next
[Where we're headed from here]

---

**Time Invested:** [X hours]
**Commits:** [N commits]
**Coffee Consumed:** ☕☕☕
```

## Important Notes

- Focus on the story, not just the code
- Highlight AI collaboration moments (good and bad)
- Include specific technical details where relevant
- Be honest about struggles and failures
- Look for the "loops" - recursive errors, funny misunderstandings
- Make it entertaining while being educational
