# Setup guide — getting rimanm.com live

Follow these in order. Steps 1–4 put the site online. Steps 5–6 turn on the
contact form and the automatic citation counter. Everything here is free.

Your repo already exists, so we skip creating it.

---

## The folder structure (what goes where)

```
your-repo/
├── index.html            ← Home
├── publications.html     ← Publications + patents
├── teaching.html         ← Teaching + Students Corner
├── CNAME                 ← contains: rimanm.com
├── Riman_Mandal_CV.pdf   ← YOU ADD THIS (your actual CV)
├── .gitignore
│
├── data/                 ← the whole site reads from these; editing them updates the site
│   ├── profile.json      ← your links, email, Formspree ID, Scholar ID
│   ├── metrics.json      ← citations, h-index (the Action updates this for you)
│   ├── publications.json ← journals, conferences, book, chapters
│   ├── patents.json      ← patents
│   └── courses.json      ← teaching roles + Students Corner
│
├── assets/
│   ├── style.css         ← all styling (one file)
│   ├── site.js           ← all logic (one file)
│   ├── img/              ← put portrait.jpg here later
│   └── course-materials/ ← put course PDFs here
│       └── operating-systems/
│
├── scripts/
│   └── update_scholar.py ← fetches your Scholar numbers
│
└── .github/workflows/
    └── scholar.yml       ← runs the script weekly, commits the new numbers
```

You never edit `.html`, `.css`, or `.js` to update content — only the files in `data/`.

---

## Step 1 — Put your CV in the folder

Rename your CV file to exactly **`Riman_Mandal_CV.pdf`** and place it next to
`index.html` (the repo root). The Download CV button already points there.

## Step 2 — Upload everything to GitHub (browser, no tools needed)

1. Open your repo on github.com.
2. Click **Add file → Upload files**.
3. Drag the **contents** of this folder in (not the outer folder — the files and
   the `data`, `assets`, `scripts`, `.github` folders themselves).
   - Tip: GitHub's uploader accepts folders. If drag-and-drop of folders misbehaves
     in your browser, drag the files in a few batches; the folder paths are preserved.
4. At the bottom, write a commit message like `initial site`, click **Commit changes**.

That's the upload. To change anything later, either edit a file directly on
github.com (pencil icon) or upload a replacement the same way.

> Prefer the command line? From inside this folder:
> ```
> git init
> git add .
> git commit -m "initial site"
> git branch -M main
> git remote add origin https://github.com/Riman-M/<your-repo>.git
> git push -u origin main
> ```

## Step 3 — Turn on GitHub Pages

1. In the repo: **Settings → Pages**.
2. Under *Build and deployment*, Source = **Deploy from a branch**.
3. Branch = **main**, folder = **/ (root)**. Click **Save**.
4. Wait ~1 minute. A URL appears at the top of that page — open it to confirm the
   site is live. (It'll be something like `https://riman-m.github.io/<repo>`.)

## Step 4 — Connect rimanm.com

**In Hostinger** → Domains → rimanm.com → DNS records. Remove any existing `@`
A-record, then add:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 185.199.108.153 | 14400 |
| A | @ | 185.199.109.153 | 14400 |
| A | @ | 185.199.110.153 | 14400 |
| A | @ | 185.199.111.153 | 14400 |
| CNAME | www | `riman-m.github.io.` | 14400 |

(The `CNAME` file in the repo already contains `rimanm.com`, so GitHub knows the
domain.)

**Back in GitHub** → Settings → Pages → *Custom domain* → type `rimanm.com` → Save.
GitHub re-checks DNS (15 min to a few hours). When the check clears, tick
**Enforce HTTPS**. The site is now at https://rimanm.com.

---

## Step 5 — Turn on the contact form (Formspree)

The form is built but stays hidden until you give it a destination.

1. Go to **formspree.io** and sign up (free: 50 messages/month).
2. Create a new form. Set the notification email to `mandal.riman@gmail.com`.
3. Formspree gives you an endpoint like `https://formspree.io/f/xldeabcd`.
   Copy the last part — `xldeabcd` — that's your form ID.
4. Open **`data/profile.json`**, find `"formspreeId": "YOUR_FORM_ID"`, and replace
   `YOUR_FORM_ID` with your real ID. Commit.
5. Reload rimanm.com — the form now appears in the Contact section and messages
   land in your inbox. (First submission asks you to confirm your email once.)

If you never set this, the site simply shows your email/Scholar/LinkedIn links
and no broken form — perfectly fine.

## Step 6 — Turn on automatic citation counts

The Action is already in the repo. It runs every Monday, reads your Scholar
profile (ID `RE-LPh0AAAAJ`, already set), and updates `metrics.json` if the
numbers changed.

1. In the repo: **Settings → Actions → General**. Under *Workflow permissions*,
   select **Read and write permissions**. Save. (This lets the job commit the
   updated numbers back.)
2. Go to the **Actions** tab → *Update Scholar metrics* → **Run workflow** to
   test it once now instead of waiting for Monday.

**A caveat worth knowing:** Google Scholar has no official API and sometimes
blocks automated requests coming from GitHub's servers. The script is built to
**fail safe** — if Scholar blocks it, nothing changes and your last numbers stay
put; the site never breaks. If you find it frequently isn't updating:

- Sign up at **serpapi.com** (free: 100 lookups/month — far more than you need).
- Copy your API key.
- In the repo: **Settings → Secrets and variables → Actions → New repository
  secret**, name it `SERPAPI_KEY`, paste the key.
- The workflow automatically uses it and becomes reliable. No code change needed.

Either way, you can always edit `metrics.json` by hand — it's just four numbers.

---

## Quick reference — updating the site later

| I want to… | Edit this |
|------------|-----------|
| Add a paper | `data/publications.json` (set `"featured": true` to also show it on the homepage) |
| Fix a citation number by hand | `data/metrics.json` |
| Add a patent | `data/patents.json` |
| Add / update a course or its materials | `data/courses.json` + drop PDFs in `assets/course-materials/…` |
| Change a profile link or email | `data/profile.json` |
| Add your photo | put `portrait.jpg` in `assets/img/`, then swap the `.portrait` block in `index.html` (see README.md) |

Commit the change on github.com and the live site updates within a minute.
