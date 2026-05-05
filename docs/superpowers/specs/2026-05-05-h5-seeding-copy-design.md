# H5 Seeding Copy Design

## Goal

Optimize the H5 landing page for social seeding. The page should make users want to calculate their own workday cashflow and share the idea, while still explaining that the desktop product is offline-first and privacy-conscious.

## Audience And Tone

- Target audience: Windows office workers who enjoy light workplace self-mockery.
- Primary emotion: "This is funny and I want to try it."
- Tone: playful, concrete, office-safe, not preachy.
- Avoid: heavy release/download process copy, salary-management seriousness, or overclaiming financial accuracy.

## Content Structure

- Hero: lead with a spreadable question such as "今天上班，回血了吗？"
- Calculator: keep local-only estimate inputs and make the privacy note casual.
- Feature highlights: add visible product capability cards for:
  - 每秒到账
  - 自动状态
  - 摸鱼收益
  - 轻角色
  - 低频提醒
  - 分享战报
- Share scenario: explain that the page and share cards are suitable for sending to coworkers or group chats.
- Privacy: keep the promise that inputs and desktop data do not upload by default.
- FAQ: remove download-related questions. Keep questions about income upload, accuracy, and office usage.
- CTA: prefer "先在线算一下", "去 GitHub 看项目", and "提建议".

## Out Of Scope

- No deployment URL change.
- No analytics.
- No real package download workflow.
- No new frontend build configuration.

## Testing

- Static H5 tests should require the new highlight copy and absence of download FAQ.
- Tests should keep coverage for local-only calculator behavior, no network collection, responsive styling, and accessible result announcement.
