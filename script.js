const defaultPdfUrl = "assets/pdf/portfolio.pdf";

const pdfState = {
  document: null,
  pageNumber: 1,
  scale: 1,
  pageFlip: null,
  fileName: "",
  fileUrl: "",
  fileUrlIsObject: false,
  isRendering: false,
  renderToken: 0,
  pageSize: {
    width: 480,
    height: 640
  }
};

const pdfFileInput = document.querySelector("#pdf-file");
const pdfReader = document.querySelector("[data-pdf-reader]");
const pdfBook = document.querySelector("#pdf-book");
const pdfStatus = document.querySelector("[data-pdf-status]");
const pdfEmpty = document.querySelector("[data-pdf-empty]");
const pdfPrevButton = document.querySelector("[data-pdf-prev]");
const pdfNextButton = document.querySelector("[data-pdf-next]");
const pdfDownloadButton = document.querySelector("[data-pdf-download]");
const pdfFullscreenButton = document.querySelector("[data-pdf-fullscreen]");
const pdfZoomOutButton = document.querySelector("[data-pdf-zoom-out]");
const pdfZoomInButton = document.querySelector("[data-pdf-zoom-in]");
const pdfBookWrap = document.querySelector(".pdf-book-wrap");
const maxPdfCanvasSide = 1600;
const minPdfZoom = 0.8;
const maxPdfZoom = 1.8;
const textLinkPattern = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/gi;
const fallbackPdfLinks = [
  {
    pageNumber: 36,
    href: "https://youtube.com/shorts/OIk8ZS0a4FA",
    label: "https://youtube.com/shorts/OIk8ZS0a4FA",
    pageWidth: 858.898,
    pageHeight: 612.283,
    left: 433.2256,
    top: 539.6977,
    width: 244.5552,
    height: 12
  },
  {
    pageNumber: 37,
    href: "https://youtu.be/S9zbaoA9CcE",
    label: "https://youtu.be/S9zbaoA9CcE",
    pageWidth: 858.898,
    pageHeight: 612.283,
    left: 501.6143,
    top: 539.6977,
    width: 179.3676,
    height: 12
  }
];

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function updatePdfControls() {
  const hasDocument = Boolean(pdfState.document);
  const hasPageFlip = Boolean(pdfState.pageFlip);
  const isFirstPage = pdfState.pageNumber <= 1;
  const isLastPage = hasDocument && pdfState.pageNumber >= pdfState.document.numPages;

  pdfPrevButton.disabled = !hasPageFlip || isFirstPage || pdfState.isRendering;
  pdfNextButton.disabled = !hasPageFlip || isLastPage || pdfState.isRendering;
  pdfDownloadButton.disabled = !pdfState.fileUrl || pdfState.isRendering;
  pdfZoomOutButton.disabled = !hasDocument || pdfState.scale <= minPdfZoom || pdfState.isRendering;
  pdfZoomInButton.disabled = !hasDocument || pdfState.scale >= maxPdfZoom || pdfState.isRendering;
}

function updateReaderLayout() {
  if (!pdfBookWrap || !pdfState.document) {
    return;
  }

  pdfBookWrap.classList.toggle("is-cover-start", pdfState.pageNumber === 1);
  pdfBookWrap.classList.toggle("is-cover-end", pdfState.pageNumber === pdfState.document.numPages);
}

function updatePdfStatus() {
  const totalPages = pdfState.document ? pdfState.document.numPages : 0;

  pdfStatus.textContent = `Page ${totalPages ? pdfState.pageNumber : 0} / ${totalPages}`;
  updateReaderLayout();
  updatePdfControls();
}

function resetPageFlip() {
  if (!pdfState.pageFlip) {
    return;
  }

  pdfState.pageFlip.destroy();
  pdfState.pageFlip = null;
}

function createPageFlip() {
  if (!window.St || !St.PageFlip || !pdfBook) {
    pdfStatus.textContent = "PageFlip is unavailable.";
    return;
  }

  resetPageFlip();

  pdfState.pageFlip = new St.PageFlip(pdfBook, {
    width: pdfState.pageSize.width,
    height: pdfState.pageSize.height,
    size: "stretch",
    minWidth: 260,
    maxWidth: 520,
    minHeight: 360,
    maxHeight: 760,
    maxShadowOpacity: 0.45,
    mobileScrollSupport: false,
    showCover: true
  });

  pdfState.pageFlip.loadFromHTML(pdfBook.querySelectorAll(".pdf-page"));
  pdfState.pageFlip.on("flip", (event) => {
    pdfState.pageNumber = event.data + 1;
    updatePdfStatus();
  });

  pdfState.pageFlip.on("changeState", (event) => {
    pdfBookWrap.classList.toggle("is-flipping", event.data !== "read");
  });

  applyPdfZoom();
  updatePdfStatus();
}

function applyPdfZoom() {
  if (!pdfBook) {
    return;
  }

  pdfBook.style.setProperty("--pdf-zoom", pdfState.scale);
}

function getRenderViewport(page, scale) {
  const baseViewport = page.getViewport({ scale: 1 });
  const safeScale = Math.min(
    scale,
    maxPdfCanvasSide / Math.max(baseViewport.width, baseViewport.height)
  );

  return page.getViewport({ scale: safeScale });
}

async function getDestinationPageIndex(destination) {
  if (!pdfState.document || !destination) {
    return null;
  }

  const explicitDestination = typeof destination === "string"
    ? await pdfState.document.getDestination(destination)
    : destination;

  if (!explicitDestination || !explicitDestination[0]) {
    return null;
  }

  const pageIndex = await pdfState.document.getPageIndex(explicitDestination[0]);
  return Number.isInteger(pageIndex) ? pageIndex : null;
}

function createPdfLink(annotation, viewport) {
  if (!annotation.url && !annotation.unsafeUrl && !annotation.dest) {
    return null;
  }

  const bounds = viewport.convertToViewportRectangle(annotation.rect);
  const left = Math.min(bounds[0], bounds[2]);
  const top = Math.min(bounds[1], bounds[3]);
  const width = Math.abs(bounds[0] - bounds[2]);
  const height = Math.abs(bounds[1] - bounds[3]);
  const link = document.createElement("a");
  const url = annotation.url || annotation.unsafeUrl;

  link.className = "pdf-link";
  link.style.left = `${left}px`;
  link.style.top = `${top}px`;
  link.style.width = `${width}px`;
  link.style.height = `${height}px`;

  if (url) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", url);
    return link;
  }

  link.href = "#";
  link.setAttribute("aria-label", "Go to linked PDF page");
  link.addEventListener("click", async (event) => {
    event.preventDefault();

    const pageIndex = await getDestinationPageIndex(annotation.dest);

    if (pageIndex === null || !pdfState.pageFlip) {
      return;
    }

    if (typeof pdfState.pageFlip.flip === "function") {
      pdfState.pageFlip.flip(pageIndex);
    }

    pdfState.pageNumber = pageIndex + 1;
    updatePdfStatus();
  });

  return link;
}

function normalizeTextLink(text) {
  const cleanText = text.replace(/[).,\]]+$/, "");

  if (cleanText.includes("@") && !cleanText.startsWith("http")) {
    return `mailto:${cleanText}`;
  }

  if (cleanText.startsWith("www.")) {
    return `https://${cleanText}`;
  }

  return cleanText;
}

function createTextPdfLinks(textContent, viewport) {
  if (!window.pdfjsLib || !pdfjsLib.Util) {
    return [];
  }

  return textContent.items.flatMap((item) => {
    if (!item.str) {
      return [];
    }

    const matches = [...item.str.matchAll(textLinkPattern)];

    if (!matches.length) {
      return [];
    }

    const transform = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(transform[2], transform[3]);
    const itemWidth = item.width * viewport.scale;

    return matches.map((match) => {
      const link = document.createElement("a");
      const startRatio = match.index / item.str.length;
      const widthRatio = match[0].length / item.str.length;

      link.className = "pdf-link";
      link.href = normalizeTextLink(match[0]);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", match[0]);
      link.style.left = `${transform[4] + itemWidth * startRatio}px`;
      link.style.top = `${transform[5] - fontHeight}px`;
      link.style.width = `${Math.max(itemWidth * widthRatio, fontHeight)}px`;
      link.style.height = `${fontHeight * 1.2}px`;

      return link;
    });
  });
}

function createFallbackPdfLinks(pageNumber, viewport) {
  return fallbackPdfLinks
    .filter((linkData) => linkData.pageNumber === pageNumber)
    .map((linkData) => {
      const link = document.createElement("a");
      const scaleX = viewport.width / linkData.pageWidth;
      const scaleY = viewport.height / linkData.pageHeight;

      link.className = "pdf-link";
      link.href = linkData.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", linkData.label);
      link.style.left = `${linkData.left * scaleX}px`;
      link.style.top = `${linkData.top * scaleY}px`;
      link.style.width = `${linkData.width * scaleX}px`;
      link.style.height = `${linkData.height * scaleY}px`;

      return link;
    });
}

async function renderPdfPages() {
  if (!pdfState.document || !pdfBook) {
    updatePdfStatus();
    return;
  }

  const renderToken = pdfState.renderToken + 1;

  pdfState.renderToken = renderToken;
  pdfState.isRendering = true;
  pdfEmpty.hidden = true;
  pdfStatus.textContent = "Loading pages...";
  updatePdfControls();

  try {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdfState.document.numPages; pageNumber += 1) {
      if (renderToken !== pdfState.renderToken) {
        return;
      }

      const page = await pdfState.document.getPage(pageNumber);
      const viewport = getRenderViewport(page, pdfState.scale);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (pageNumber === 1) {
        pdfState.pageSize = {
          width: viewport.width,
          height: viewport.height
        };
      }

      await page.render({
        canvasContext: context,
        viewport
      }).promise;

      const pageElement = document.createElement("div");
      const pageImage = document.createElement("img");
      const annotations = await page.getAnnotations({ intent: "display" });
      const textContent = await page.getTextContent();

      pageElement.className = "pdf-page";
      pageElement.style.width = `${viewport.width}px`;
      pageElement.style.height = `${viewport.height}px`;
      pageImage.decoding = "async";
      pageImage.src = canvas.toDataURL("image/png");
      pageImage.alt = `PDF page ${pageNumber}`;
      pageElement.append(pageImage);

      annotations.forEach((annotation) => {
        const link = createPdfLink(annotation, viewport);

        if (link) {
          pageElement.append(link);
        }
      });

      createTextPdfLinks(textContent, viewport).forEach((link) => {
        pageElement.append(link);
      });

      createFallbackPdfLinks(pageNumber, viewport).forEach((link) => {
        pageElement.append(link);
      });

      pages.push(pageElement);
    }

    if (renderToken !== pdfState.renderToken) {
      return;
    }

    resetPageFlip();
    pdfBook.replaceChildren(...pages);
    pdfState.pageNumber = 1;
    pdfState.isRendering = false;
    createPageFlip();
  } catch (error) {
    if (renderToken !== pdfState.renderToken) {
      return;
    }

    pdfState.isRendering = false;
    pdfStatus.textContent = "Could not render PDF.";
    updatePdfControls();
  }
}

async function loadPdfData(data, fileName, fileUrl, fileUrlIsObject) {
  if (!window.pdfjsLib || !data) {
    return;
  }

  if (pdfState.fileUrl && pdfState.fileUrlIsObject) {
    URL.revokeObjectURL(pdfState.fileUrl);
  }

  pdfState.fileName = fileName || "portfolio.pdf";
  pdfState.fileUrl = fileUrl || "";
  pdfState.fileUrlIsObject = fileUrlIsObject;
  pdfState.document = await pdfjsLib.getDocument({ data }).promise;
  pdfState.pageNumber = 1;
  pdfState.scale = 1;
  applyPdfZoom();
  await renderPdfPages();
}

async function loadPdf(file) {
  if (!file) {
    return;
  }

  await loadPdfData(
    await file.arrayBuffer(),
    file.name || "portfolio.pdf",
    URL.createObjectURL(file),
    true
  );
}

async function loadDefaultPdf() {
  if (!window.pdfjsLib) {
    pdfStatus.textContent = "PDF.js is unavailable.";
    return;
  }

  try {
    pdfStatus.textContent = "Loading portfolio PDF...";
    const response = await fetch(defaultPdfUrl);

    if (!response.ok) {
      throw new Error("Default PDF was not found.");
    }

    await loadPdfData(await response.arrayBuffer(), "portfolio.pdf", defaultPdfUrl, false);
  } catch (error) {
    pdfStatus.textContent = "Could not load portfolio PDF.";
    updatePdfControls();
  }
}

pdfFileInput.addEventListener("change", (event) => {
  loadPdf(event.target.files[0]);
});

pdfPrevButton.addEventListener("click", () => {
  if (!pdfState.document || !pdfState.pageFlip || pdfState.pageNumber <= 1) {
    return;
  }

  pdfState.pageFlip.flipPrev();
});

pdfNextButton.addEventListener("click", () => {
  if (!pdfState.document || !pdfState.pageFlip || pdfState.pageNumber >= pdfState.document.numPages) {
    return;
  }

  pdfState.pageFlip.flipNext();
});

pdfDownloadButton.addEventListener("click", () => {
  if (!pdfState.fileUrl) {
    return;
  }

  const link = document.createElement("a");

  link.href = pdfState.fileUrl;
  link.download = pdfState.fileName;
  link.click();
});

pdfFullscreenButton.addEventListener("click", () => {
  if (!pdfReader || !document.fullscreenEnabled) {
    return;
  }

  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }

  pdfReader.requestFullscreen();
});

pdfZoomOutButton.addEventListener("click", () => {
  if (!pdfState.document || pdfState.isRendering) {
    return;
  }

  pdfState.scale = Math.max(minPdfZoom, pdfState.scale - 0.1);
  applyPdfZoom();
  updatePdfControls();
});

pdfZoomInButton.addEventListener("click", () => {
  if (!pdfState.document || pdfState.isRendering) {
    return;
  }

  pdfState.scale = Math.min(maxPdfZoom, pdfState.scale + 0.1);
  applyPdfZoom();
  updatePdfControls();
});

updatePdfStatus();
loadDefaultPdf();
