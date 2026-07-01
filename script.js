const portfolioProjects = [
  {
    number: "01",
    title: "Hard Surface Kitbash",
    category: "Environment Props",
    year: "2026",
    description: "A modular sci-fi asset set prepared for game engine presentation.",
    tags: ["Modular", "Trim sheets", "UE ready"]
  },
  {
    number: "02",
    title: "Creature Sculpt",
    category: "Character Art",
    year: "2026",
    description: "High-poly creature study with anatomy, material, and silhouette notes.",
    tags: ["Sculpt", "Anatomy", "Materials"]
  },
  {
    number: "03",
    title: "Stylized Market Stall",
    category: "Environment Art",
    year: "2025",
    description: "A compact scene for showing color, prop density, and trim-sheet use.",
    tags: ["Stylized", "Props", "Scene"]
  }
];

const projectGrid = document.querySelector("#project-grid");

function renderProjects(projects) {
  if (!projectGrid) {
    return;
  }

  projectGrid.innerHTML = projects
    .map((project) => {
      return `
        <article class="project-card">
          <div class="project-thumb">
            <strong>${project.number}</strong>
            <span>${project.category} / ${project.year}</span>
          </div>
          <h3>${project.title}</h3>
          <p>${project.description}</p>
          <div class="project-tags">
            ${project.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

renderProjects(portfolioProjects);

function initScrollAnimations() {
  const animatedElements = document.querySelectorAll(
    ".section-heading, .project-card, .pdf-reader, .about-section > p"
  );

  if (!("IntersectionObserver" in window)) {
    animatedElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18
    }
  );

  animatedElements.forEach((element) => {
    element.classList.add("reveal");
    observer.observe(element);
  });
}

initScrollAnimations();

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
const maxPdfCanvasSide = 1600;

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
  pdfZoomOutButton.disabled = !hasDocument || pdfState.scale <= 0.6 || pdfState.isRendering;
  pdfZoomInButton.disabled = !hasDocument || pdfState.scale >= 2.2 || pdfState.isRendering;
}

function updatePdfStatus() {
  const totalPages = pdfState.document ? pdfState.document.numPages : 0;

  pdfStatus.textContent = `Page ${totalPages ? pdfState.pageNumber : 0} / ${totalPages}`;
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

  updatePdfStatus();
}

function getRenderViewport(page, scale) {
  const baseViewport = page.getViewport({ scale: 1 });
  const safeScale = Math.min(
    scale,
    maxPdfCanvasSide / Math.max(baseViewport.width, baseViewport.height)
  );

  return page.getViewport({ scale: safeScale });
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

      pageElement.className = "pdf-page";
      pageImage.decoding = "async";
      pageImage.src = canvas.toDataURL("image/png");
      pageImage.alt = `PDF page ${pageNumber}`;
      pageElement.append(pageImage);
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

  pdfState.scale = Math.max(0.6, pdfState.scale - 0.2);
  renderPdfPages();
});

pdfZoomInButton.addEventListener("click", () => {
  if (!pdfState.document || pdfState.isRendering) {
    return;
  }

  pdfState.scale = Math.min(2.2, pdfState.scale + 0.2);
  renderPdfPages();
});

updatePdfStatus();
loadDefaultPdf();
