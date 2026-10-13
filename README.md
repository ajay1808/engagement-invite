# Engagement Invite

Opens on a "You're invited" page with the logo, then scrolls through three pages: blessings (Ganesha) → names and date (courtyard) → venue and time.

## Update a page

Replace `0.jpg`, `2.jpg` or `3.jpg` with the new picture and keep the same name. Keep pictures at a 4:5 shape (for example 1200 × 1500) so the border lines up.

- **On GitHub:** open the repo, click **Add file → Upload files**, drop in the new file, then click **Commit changes**. The live site updates in about a minute.

## Change the logo

Replace `logo.png` with the new logo and keep the same name. A PNG with a transparent background looks best on the dark opening page. If the logo file is missing, the page simply shows "You're invited" without it.

## Directions and RSVP buttons (under the last page)

Near the bottom of `index.html`, in `BUTTONS`:

```js
{ label: 'Directions', icon: 'pin',   url: 'https://maps.app.goo.gl/g7oSCpVAiHDaX7pBA' },
{ label: 'RSVP',       icon: 'check', url: '' },  // ← paste the Google Form link between the quotes
```

While a button's `url` is empty, it shows as a dimmed placeholder. Tapping it says the link is coming soon. To remove a button completely, delete its line.

## Border

`border.png` is drawn on top of every page, with its main line running along the picture's edges, so it stays when you replace a picture. Keep replacement pictures at a 4:5 shape so the border lines up exactly.

## Offline PDF ("Save invite as PDF")

`invite.pdf` is the downloadable copy linked under the buttons on the last page: the "You're invited" page, the three pictures, and a details page with the full Sai Villa address, a tappable Google Maps button and a QR code for directions.

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
| `0.jpg` | Blessings page with Ganesha (from 0-final.webp) |
| `2.jpg` | Names and date, courtyard (from 2-final.webp) |
| `3.jpg` | Venue and time (from 3-final.webp) |
| `logo.png` | Logo on the opening page. Replace this one to change it |
| `invite.pdf` | Downloadable offline copy of the invite (see above) |
| `border.png` | Decorative border shown over every page |
| `og-image.jpg` | WhatsApp/iMessage preview image |
