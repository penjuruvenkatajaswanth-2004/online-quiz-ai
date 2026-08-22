# Online Quiz — Build Tasks

## Phase 1: Backend
- [x] Create setup.sql (full schema with user_answers table)
- [x] Add JWT auth middleware + admin middleware
- [x] Protect all routes with appropriate middleware
- [x] Fix POST /submit-quiz (answer format + save user_answers)
- [x] Add GET /user/dashboard
- [x] Add GET /user/results/:id (answer review)
- [x] Add GET /leaderboard (filtered admin accounts)
- [x] Add admin endpoints (stats, users, quizzes, results, delete)
- [x] Keep and clean up POST /generate-quiz

## Phase 2: Frontend Architecture
- [x] Update index.html (title, fonts, meta)
- [x] Redesign index.css (dark-mode design system)
- [x] Redesign App.css (premium neo-glassmorphism visuals and vector SVG styles)
- [x] Rewrite App.jsx (multi-page state machine, custom SVG icons, dynamic ranks, stats fix)

## Phase 3: Feature Pages
- [x] Login + Register pages (glowing floating background blobs)
- [x] User Dashboard (stats, recent results, CTA, SVGs)
- [x] Quiz Setup (topic, difficulty, count, generate)
- [x] Quiz Taking (one-at-a-time, timer, next/prev, progress)
- [x] Result page (animated score, badge, stats)
- [x] Answer Review page (color-coded correct/wrong)
- [x] Leaderboard page (top 20, medal SVGs)
- [x] Admin Dashboard (stats, tabs, tables, delete)

## Phase 4: Polish & Verify
- [x] Animations and transitions
- [x] Responsive design
- [x] Toast notifications
- [x] End-to-end testing (generate AI quiz → take quiz → submit → review answers flow verified)
- [x] Premium SVG outlines and glassmorphism styling
