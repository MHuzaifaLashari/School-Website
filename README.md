# eCoach

A responsive, standalone eLearning website based on the [eCoach homepage design by Panze Studio](https://dribbble.com/shots/25587484-eCoach-eLearning-Platform-Website-Homepage-Design).

## Open the website

Open `index.html` directly in a browser. No installation or build step is needed.

For a local server on Windows, run this in the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Then visit **http://localhost:8080**. Press Ctrl+C in the terminal to stop.

## Included

- Responsive homepage following the reference, with local student, instructor, and course imagery.
- Working desktop dropdowns and mobile navigation.
- Searchable course catalog with categories, level filters, and sorting.
- Course pages with overview, curriculum, instructor, and review tabs.
- Instructor profiles, article pages, shop products, cart, and demo checkout.
- Saved courses, demo enrollments, sample lessons, notes, and completion tracking.
- Local demo profiles, validated contact form, newsletter form, FAQ, and policy pages.
- Keyboard accessible dialogs and tabs; reduced motion support.

## Demonstration behavior

This is a front-end website. Course content, statistics, ratings, profiles, and products are sample content recreating the supplied visual reference. Login opens a browser-local demo profile. Checkout never collects payment or creates an actual order. Contact and newsletter forms validate locally and do not send messages. Progress and saved items use localStorage when available.

Reference artwork is included for this recreation; confirm image licensing before public commercial use. Shop photography loads from Unsplash; fonts load from Google Fonts. The site works with system fonts if external fonts are unavailable.

## Files

- `index.html`: page shell, navigation, footer, and dialog.
- `styles.css`: layout and responsive styles.
- `app.js`: page routing, content, and interactions.
- `assets/`: images extracted from the supplied design reference.
- `start.ps1`: optional dependency-free local server.
- `qa.mjs`: browser interaction and responsive checks using Node and installed Microsoft Edge.
- `qa-results.json`: latest browser verification results.
- `screenshots/desktop.png` and `screenshots/mobile.png`: checked previews.

## Hosting

Upload `index.html`, `styles.css`, `app.js`, and the `assets` folder to any static web host. Routes use URL hashes and need no server rewrite configuration. Automatic Sites publication was not completed because the required Git executable is not available in this environment.
