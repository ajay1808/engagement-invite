# Engagement Invite

A four-page scrolling invitation: Ganesha cover → home corner → courtyard → event details.

## Update the details page (the last page, 3.PNG)

Replace `3.PNG` with your new image and keep the same name. Any size or shape works, and the page adjusts to fit it.

- **On GitHub:** open the repo, click **Add file → Upload files**, drop in the new `3.PNG`, then click **Commit changes**. The live site updates in about a minute.
- A JPG is fine too. Name it `3.jpg` and delete the old `3.PNG`. A JPG loads faster on phones.

## Optional buttons under the last page

Near the bottom of `index.html`, paste links into `BUTTONS`:

```js
{ label: 'Directions', icon: 'pin',  url: 'https://maps.app.goo.gl/…' },
{ label: 'RSVP',       icon: 'chat', url: 'https://wa.me/91XXXXXXXXXX?text=Count%20me%20in!' },
```

A button with an empty `url` stays hidden.

## WhatsApp link preview

- The preview picture is `og-image.jpg`, a crop of `1.png`.
- The title and description are the `og:title` and `og:description` lines at the top of `index.html`.
- WhatsApp caches a link's preview. Send the link to yourself once to check it before sending it to guests.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `0.jpg` | Cover page (optimized from the original 0.PNG) |
| `1.jpg` | Second page (optimized from the original 1.png) |
| `2.jpg` | Third page (optimized from the original 2-Updated.PNG) |
| `3.PNG` | Event details page. Replace this one |
| `og-image.jpg` | WhatsApp/iMessage preview image |
