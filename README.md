# Engagement Invite

Live at **https://shreya-ajay.pages.dev** (Cloudflare Pages) and **https://ajay1808.github.io/engagement-invite/** (GitHub Pages). Both update automatically whenever this repository changes.

Opens on a "You're invited" page with the logo, then scrolls through three pages: blessings (Ganesha) → Nichayathartham, Shreya & Ajay (courtyard) → date, time and venue.

## Update a page

Replace `1.jpg`, `2.jpg` or `3.jpg` with the new picture and keep the same name. Keep pictures at a 4:5 shape (for example 1200 × 1500) so the border lines up.

- **On GitHub:** open the repo, click **Add file → Upload files**, drop in the new file, then click **Commit changes**. The live site updates in about a minute.

## Change the logo

Replace `logo.png` with the new logo and keep the same name. A PNG with a transparent background looks best on the dark opening page. If the logo file is missing, the page simply shows "You're invited" without it.

## Directions and RSVP buttons (under the last page)

Near the bottom of `index.html`, in `BUTTONS`:

```js
{ label: 'Directions', icon: 'pin',   url: 'https://maps.app.goo.gl/g7oSCpVAiHDaX7pBA' },
{ label: 'RSVP',       icon: 'check', url: '' },  // ← paste the Google Form link between the quotes
```

RSVP goes to the Google Form (https://forms.gle/tU1bEZkjQRunACQm6). While a button's `url` is empty, it shows as a dimmed "coming soon" placeholder. To remove a button completely, delete its line.

## Background music

Put the track in this folder as `music.mp3`. The speaker button (top right) and the credit line on the last page appear automatically once the file is there. Music starts on the guest's first tap (browsers don't allow sound before that) and the speaker button turns it on or off. Settings are in `MUSIC` near the bottom of `index.html`: `start` is where the track begins and loops back to (currently 8 seconds), and `credit` is the credit line. The current track, "Bhakthinamam" by Bank Of Sounds NCS, is free to use with credit.

## Border

`border.png` is drawn on top of every page, with its main line running along the picture's edges, so it stays when you replace a picture. Keep replacement pictures at a 4:5 shape so the border lines up exactly.

## Offline PDF ("Save invite as PDF")

`invite.pdf` is the downloadable copy linked under the buttons on the last page: a logo cover, the three pictures, and a details page with the full Sai Villa address and a tappable Directions button.

It is built from files in the `pdf-build` folder next to this one, so **rebuild it after changing any picture or the logo**, then upload the new `invite.pdf`:

```
cd "Engagement Invite"
swiftc -O pdf-build/make_pdf.swift -o pdf-build/make_pdf && pdf-build/make_pdf
```

The details page text (date, time, address) is in `pdf-build/invite-pdf.html`.

## WhatsApp link preview

- The preview picture is `og-image.jpg`, a crop of the Ganesha painting.
- The title and description are the `og:title` and `og:description` lines at the top of `index.html`.
- WhatsApp caches a link's preview. Send the link to yourself once to check it before sending it to guests.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `1.jpg` | Blessings page with Ganesha (from `source/pages/1.png`) |
| `2.jpg` | Nichayathartham, Shreya & Ajay (from `source/pages/2.png`) |
| `3.jpg` | Date, time and venue (from `source/pages/3.png`) |
| `logo.png` | Logo on the opening page. Replace this one to change it |
| `music.mp3` | Background music (see above) |
| `invite.pdf` | Downloadable offline copy of the invite (see above) |
| `border.png` | Decorative border shown over every page |
| `og-image.jpg` | WhatsApp/iMessage preview image |

---

# Save the date (wedding, 5 July 2027)

Live at **https://shreya-ajay.pages.dev/save-the-date/**. The page plays the save-the-date film, then a parchment scroll asks five questions (name, WhatsApp number, email, joining?, total guests). Replies are saved in a Cloudflare D1 database. The engagement invite above doesn't use any of this.

The full write-up (architecture, decisions, setup) is in the wedding-invite repository: `save-the-date/README.md`.

## Files

| File / folder | What it is |
|---|---|
| `save-the-date/index.html`, `style.css`, `app.js` | The page |
| `save-the-date/media/` | The film (web copy), its first and last frames, and the WhatsApp preview image |
| `save-the-date/wedding.ics` | "Add to calendar" file for Apple / Outlook |
| `save-the-date/admin/` | The private replies page |
| `functions/` | The backend (Cloudflare Pages Functions): saving replies, the password gate, CSV export, and serving the film in pieces (iPhones need that, and Cloudflare's static hosting doesn't do it) |
| `migrations/` | The database table |
| `wrangler.toml` | Cloudflare settings: the database link and the spam-check key |
| `_headers` | Security headers for the save-the-date pages only |

## Seeing replies

Open **https://shreya-ajay.pages.dev/save-the-date/admin/** and enter the admin password (any username). It shows totals, every reply, numbers that appear twice, and a **Download CSV** button (Google Sheets: File → Import → Upload).

Change the password:

```
npx wrangler@4.151.1 pages secret put ADMIN_PASSWORD --project-name shreya-ajay
```

## Making changes safely

1. Work on a branch, not `main`. Cloudflare builds every branch at its own preview address, e.g. `https://save-the-date.shreya-ajay.pages.dev/save-the-date/`. (Previews save into the same database, so delete test replies afterwards from the replies page.)
2. Check it on a real iPhone and Android phone, including the WhatsApp preview.
3. Merge into `main`. Both live links update in a minute or two.

**Only publish by pushing to GitHub.** Never run `wrangler pages deploy` from this folder: it would upload local-only files such as `.dev.vars` (the local test password) and `.wrangler/` (the local test database).

## Trying it on this Mac

```
npx wrangler@4.151.1 d1 migrations apply DB --local
npx wrangler@4.151.1 pages dev . --port 8788
```

Then open http://127.0.0.1:8788/save-the-date/. Local settings go in `.dev.vars` (never committed): `ADMIN_PASSWORD=…`, and optionally Cloudflare's public Turnstile test keys `TURNSTILE_SITE_KEY=1x00000000000000000000AA` and `TURNSTILE_SECRET=1x0000000000000000000000000000000AA`.
