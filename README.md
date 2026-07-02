# PDF Portfolio

A lightweight GitHub Pages site that shows a fixed PDF portfolio with PDF.js and PageFlip.

## Structure

- `index.html` - single PDF reader page
- `style.css` - reader-only styling
- `script.js` - PDF.js rendering, PageFlip controls, download, fullscreen, and zoom logic
- `assets/pdf/portfolio.pdf` - fixed portfolio PDF loaded by the reader

PDF links are restored as clickable overlay areas after each page is rendered.

## Local Preview

Open `index.html` in a browser, or serve the folder with any static file server.
The reader loads PDF.js and PageFlip from CDNs, so it needs internet access unless those libraries are vendored locally later.
