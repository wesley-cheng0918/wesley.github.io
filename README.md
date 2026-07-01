# 3D Game Modeling Portfolio

A lightweight static portfolio site for GitHub Pages. The structure is set up for an Issuu-like presentation style with project issues, thumbnails, renders, and future 3D model previews.

## Structure

- `index.html` - main page shell
- `style.css` - page styling
- `script.js` - sample project data, page behavior, PDF.js rendering, and PageFlip reader logic
- `assets/images/` - final renders and process images
- `assets/pdf/portfolio.pdf` - fixed portfolio PDF loaded by the reader
- `assets/thumbnails/` - project cover thumbnails
- `assets/models/` - exported model files for future viewers
- `data/` - optional structured content files

## Local Preview

Open `index.html` in a browser, or serve the folder with any static file server.
The reader loads PDF.js and PageFlip from CDNs, so it needs internet access unless those libraries are vendored locally later.
The page loads `assets/pdf/portfolio.pdf` automatically and still allows replacing it with a local PDF.
PageFlip is configured to show the first and last PDF pages as single cover pages, with the middle pages arranged as regular spreads.
The reader toolbar supports previous page, next page, PDF download, fullscreen, and zoom controls.
The UI includes subtle entrance, hover, and cover-motion animations with reduced-motion support.
The layout is tuned for desktop, tablet, and mobile breakpoints.
The PDF reader disables unavailable controls and protects against overlapping page-render requests.
Zoom controls scale the loaded PageFlip book without re-rendering the PDF pages.
