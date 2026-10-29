# arpanverma001.github.io

Personal site of Arpan Verma. Plain HTML, CSS and JavaScript with no build step, served by GitHub Pages.

```
index.html            Home: opening sequence, selected work, about
research/index.html   Research areas with live figures
projects/index.html   All projects, filterable
about/index.html      Education, experience, skills, interests
404.html              Not-found page
assets/css/site.css   All styles (light theme tokens live in :root)
assets/js/site.js     Shared motion: arrival, wordmarks, canvases, filters
assets/js/home.js     Home opening: name scramble, typist, lanes
```

## Editing

- **Text and links** live directly in the HTML files.
- **Selected work and projects** are `<article data-project>` blocks. A wordmark is the
  `.wm-face` / `.wm-echo` pair; keep the two texts identical.
- **Greeting slip**: the typist deliberately mistypes one word. It's set by
  `slip: 'science'` in `assets/js/home.js`.
- **LED signs**: change the `data-sign` text on the canvas. The dot font supports A–Z, 0–9, space, `·`, `+` and `&`.
- **Colors**: edit the custom properties at the top of `assets/css/site.css`.
- **Replay the opening**: it plays once per tab. Open a new tab or run `sessionStorage.clear()`.

All motion respects `prefers-reduced-motion`.

## Run locally

```
python -m http.server 8000
```

Then open http://localhost:8000.
