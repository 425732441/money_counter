# H5 Seeding Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the static H5 page copy from release/download framing into social seeding framing with clear project feature highlights.

**Architecture:** Keep the existing single-file static page at `public/h5/index.html`. Update only text, section structure, and CSS needed for the new feature-highlight and sharing sections. Keep the calculator script local-only and unchanged except for display copy.

**Tech Stack:** Static HTML/CSS/JavaScript, Vite public asset copying, Node test runner.

---

## Files

- Modify `tests/h5-page.test.js`: replace download-oriented assertions with social seeding, feature-highlight, and FAQ assertions.
- Modify `public/h5/index.html`: update hero, navigation, feature cards, share scenario, FAQ, and CTAs.

## Tasks

### Task 1: Update H5 Copy Contract

**Files:**
- Modify: `tests/h5-page.test.js`

- [x] **Step 1: Write failing assertions**

Require `"今天上班，回血了吗？"`, `"项目功能亮点"`, `"每秒到账"`, `"自动状态"`, `"摸鱼收益"`, `"轻角色"`, `"低频提醒"`, `"分享战报"`, `"适合发给同事"`, and FAQ questions about upload, accuracy, and office usage.

- [x] **Step 2: Assert removed download FAQ**

Assert the H5 page does not contain `"为什么下载入口还没有安装包？"`.

- [x] **Step 3: Run test red**

Run: `node --test tests/h5-page.test.js`
Expected: FAIL because current page still uses download/release copy.

### Task 2: Implement H5 Copy And Sections

**Files:**
- Modify: `public/h5/index.html`

- [x] **Step 1: Replace hero copy**

Use social seeding copy:

```html
<h1 id="hero-title">今天上班，回血了吗？</h1>
```

- [x] **Step 2: Replace download framing**

Remove download FAQ and replace the release/download card with feature and share-scenario content.

- [x] **Step 3: Add feature highlight cards**

Add six short cards covering every required project feature highlight.

- [x] **Step 4: Keep local-only calculator**

Keep existing calculator inputs, `calculateEstimate`, and no network calls.

- [x] **Step 5: Run full verification**

Run:

```bash
npm test
npm run build
cargo test
git diff --check
```

Expected: all commands pass.
