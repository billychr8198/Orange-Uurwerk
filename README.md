# Oranje Uurwerk 🇳🇱

*Build the Netherlands, one focused hour at a time.*

A Dutch-themed focus timer game in the style of Pomofocus. Work or study in
60-minute focus rounds with 10-minute short breaks and a 40-minute long break
(every time is editable). Every full hour of focus unlocks something:

| Level | Hours | What you unlock |
|---|---|---|
| 1 | 1–12 | The 12 provinces, on an interactive map with stories and photos |
| 2 | 13–24 | 12 famous Dutch icons |
| 3 | 25–36 | 12 Dutch innovations |

Every hour also gives you a gift (a Delft-blue tile), and the Netherlands'
HDI, quality of life, healthcare, safety, education, tourism, population and
GDP rise live while you focus. After 36 hours the Netherlands becomes the best
country in the world to live in.

## Put it on GitHub Pages

1. Create a new public repository on GitHub (for example `Oranje-Uurwerk`).
2. Upload **everything inside this folder** to the root of the repository,
   keeping the folders as they are: `index.html`, `.nojekyll`, `css/`, `js/`
   and `assets/`. (Drag the folders into GitHub's "Add file → Upload files"
   page.)
3. Go to **Settings → Pages**, choose **Deploy from a branch**, pick `main`
   and `/ (root)`, then **Save**.
4. After a minute your site is live at
   `https://<your-username>.github.io/<repository-name>/`.

No build step, no packages. Everything (fonts, photos, anthem) is included.

## Run it on your computer

Double-click `index.html`. Progress is saved with `localStorage` in your
browser. (The YouTube video may refuse to play from a local file; it works on
GitHub Pages.)

## Files

```
index.html                 the page
css/style.css              all styling
js/data.js                 provinces, icons, innovations and map shapes
js/app.js                  timer engine, storage, audio, game model
js/ui.js                   timer page, tasks, settings, unlock pop-ups
js/views.js                map, collections, Nederland report, start-up
assets/logo/               your flag logo (also the favicon)
assets/audio/              the Wilhelmus (instrumental) alarm
assets/fonts/              Nunito (SIL Open Font License)
assets/img/provinces/      5 photos per province (+ small thumbnails)
assets/img/icons/          12 portraits
assets/img/innovations/    12 innovation images
```

## Timer accuracy

The clock is calculated from the real time (`Date.now()`), not by counting
ticks, so it never drifts. A Web Worker keeps checking in the background, the
page re-syncs when you come back to the tab, and the optional "Keep timer
awake" setting plays a silent sound so browsers do not slow the tab down.
