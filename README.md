# Engagement Invite

A three-page scrolling invitation: painting → animated scene → event details.

## Update the details page (page 3)

Replace `3.PNG` with your new image and keep the same name. Any size or shape works, and the page adjusts to fit it.

- **On GitHub:** open the repo, click **Add file → Upload files**, drop in the new `3.PNG`, then click **Commit changes**. The live site updates in about a minute.
- A JPG is fine too. Name it `3.jpg` and delete the old `3.PNG`. A JPG loads faster on phones.

## Optional buttons under page 3

Near the bottom of `index.html`, paste links into `BUTTONS`:

```js
{ label: 'Directions', icon: 'pin',  url: 'https://maps.app.goo.gl/…' },
{ label: 'RSVP',       icon: 'chat', url: 'https://wa.me/91XXXXXXXXXX?text=Count%20me%20in!' },
```

A button with an empty `url` stays hidden.

## WhatsApp link preview

- The preview picture is `og-image.jpg`, a crop of page 1.
- The title and description are the `og:title` and `og:description` lines at the top of `index.html`.
- WhatsApp caches a link's preview. Send the link to yourself once to check it before sending it to guests.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `1.jpg` | Page 1 (optimized from the original 1.png) |
| `2.mp4`, `2-poster.jpg` | Page 2 video (compressed from 10.8 MB to 2.6 MB) and its first frame |
| `3.PNG` | Page 3. Replace this one |
| `og-image.jpg` | WhatsApp/iMessage preview image |
