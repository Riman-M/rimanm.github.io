# rimanm.com — Dr. Riman Mandal

Static academic portfolio. No build step, no framework. Three pages, all
driven by JSON data files so updating content never means touching HTML.

```
index.html          Home — hero, consolidation diagram, metrics, research, selected work, teaching, contact
publications.html   Full list + filter, plus patents
teaching.html       All teaching roles + Students Corner
CNAME               rimanm.com
Riman_Mandal_CV.pdf  ← you add this
/data               ← edit these to update the site
/assets             style.css, site.js, /img, /course-materials
```

---

## Deploy in three steps

### 1. Push to GitHub
1. Create a **public** repo named exactly `rimanm.github.io` (replace `rimanm`
   with your GitHub username if different — for a custom domain the repo name
   doesn't strictly matter, but a user site is simplest).
2. Upload everything in this folder to the repo root, keeping the folder
   structure. Add your CV as `Riman_Mandal_CV.pdf` at the root.
3. **Settings → Pages** → Source: *Deploy from a branch*, Branch `main` / `(root)`.
   Save. Your site appears at `https://<username>.github.io` within a minute.

### 2. Point the Hostinger domain at GitHub
In Hostinger: **Domains → rimanm.com → DNS records**. Delete existing `@` A
records, then add these four A records and one CNAME:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 185.199.108.153 | 14400 |
| A | @ | 185.199.109.153 | 14400 |
| A | @ | 185.199.110.153 | 14400 |
| A | @ | 185.199.111.153 | 14400 |
| CNAME | www | `rimanm.github.io.` | 14400 |

Make sure the domain is using **Hostinger's nameservers** so these records apply.

### 3. Finish in GitHub
**Settings → Pages → Custom domain** → enter `rimanm.com`, save. DNS check can
take 15 min to a few hours. When it passes, tick **Enforce HTTPS**. Done.

---

## Updating the site later

Everything lives in `/data`. No HTML editing.

**Add a publication** → open `data/publications.json`, add one entry to
`journals`, `conferences`, or `chapters`:
```json
{ "title": "...", "authors": "R. Mandal, ...", "venue": "...",
  "year": 2026, "index": "SCIE", "impact": "IF 5.0", "doi": "10....",
  "featured": true }
```
`"featured": true` also shows it in the "Selected work" block on the homepage.
Bold your own name by writing it as `R. Mandal` — the site bolds it automatically.

**Update your metrics** → `data/metrics.json` (citations, h-index, etc.).

**Add a patent** → `data/patents.json`.

**Add course materials** →
1. Drop the PDF into `assets/course-materials/operating-systems/`.
2. In `data/courses.json`, under that course's `materials`, set the item to
   `"available": true` and add a `"url"` if you want it linked.
   To add a whole new course, copy an existing block and set `"status": "live"`.

**Swap in your photo** → save it as `assets/img/portrait.jpg`, then in
`index.html` replace the `<div class="portrait">…</div>` block with
`<img class="portrait" src="assets/img/portrait.jpg" alt="Dr. Riman Mandal">`.
Until then it shows an "RM" monogram.

---

## Notes
- **Dark mode** remembers the visitor's choice and follows their system setting by default.
- **The consolidation diagram** animates once on load and respects
  `prefers-reduced-motion` (shows the final state instantly for those users).
- Links (Scholar, ORCiD, ResearchGate, LinkedIn, email) all live in
  `data/profile.json` — change them in one place.

## Phase 2, when you have content
Projects page, News/updates, and expanding Students Corner to more courses.
Each is a new data file + a thin HTML page that reuses `style.css` and `site.js`.
If the publication list ever gets long, the next step is auto-syncing counts
from your Google Scholar profile.
