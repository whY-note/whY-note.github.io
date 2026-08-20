/* Shared article table-of-contents and reading-progress behavior. */
(function () {
  "use strict";

  const articleBody = document.querySelector(".article-body");
  const tocList = document.getElementById("toc-list");
  const tocToggle = document.getElementById("toc-toggle");
  const tocPanel = document.getElementById("toc-panel");
  const progressBar = document.getElementById("reading-progress-bar");
  const scrollRoot = document.getElementById("article-scroll");
  const tocContainer = document.querySelector(".article-toc");
  const articleShell = document.querySelector(".article-shell");

  if (!articleBody) return;

  const alertTypes = {
    NOTE: {
      name: "note",
      label: "Note",
      icon: '<circle cx="8" cy="8" r="6.25"></circle><path d="M8 7.25v4M8 4.75h.01"></path>'
    },
    TIP: {
      name: "tip",
      label: "Tip",
      icon: '<path d="M5.5 12.25h5M6.25 14.25h3.5M8 1.25a4.75 4.75 0 0 0-2.85 8.55c.45.34.72.86.72 1.42v.03h4.26v-.03c0-.56.27-1.08.72-1.42A4.75 4.75 0 0 0 8 1.25Z"></path><path d="M8 4v3.25"></path>'
    },
    IMPORTANT: {
      name: "important",
      label: "Important",
      icon: '<path d="M8 1.25 14.75 8 8 14.75 1.25 8 8 1.25Z"></path><path d="M8 5v4M8 11.25h.01"></path>'
    },
    WARNING: {
      name: "warning",
      label: "Warning",
      icon: '<path d="M7.13 2.03 1.15 12.4a1 1 0 0 0 .87 1.5h11.96a1 1 0 0 0 .87-1.5L8.87 2.03a1 1 0 0 0-1.74 0Z"></path><path d="M8 5.25v4M8 11.5h.01"></path>'
    },
    CAUTION: {
      name: "caution",
      label: "Caution",
      icon: '<path d="m5.2 1.25-3.95 3.9v5.7l3.95 3.9h5.6l3.95-3.9v-5.7l-3.95-3.9H5.2Z"></path><path d="M8 4.75v4.5M8 11.5h.01"></path>'
    }
  };

  alertTypes.INFORMATION = alertTypes.IMPORTANT;
  alertTypes.IMFORMATION = alertTypes.IMPORTANT;

  function createAlertIcon(iconMarkup) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "markdown-alert-icon");
    icon.setAttribute("viewBox", "0 0 16 16");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.innerHTML = iconMarkup;
    return icon;
  }

  function removeLeadingBreaks(paragraph) {
    while (paragraph.firstChild) {
      const first = paragraph.firstChild;
      if (first.nodeType === Node.TEXT_NODE && first.nodeValue.trim() === "") {
        first.remove();
      } else if (first.nodeType === Node.ELEMENT_NODE && first.tagName === "BR") {
        first.remove();
      } else {
        break;
      }
    }
  }

  function findAlertMarker(paragraph) {
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();

    while (textNode && textNode.nodeValue.trim() === "") {
      textNode = walker.nextNode();
    }
    if (!textNode) return null;

    const marker = textNode.nodeValue.match(
      /^\s*(?:>\s*)?\[!\s*(NOTE|TIP|IMPORTANT|INFORMATION|IMFORMATION|WARNING|CAUTION)\s*\]\s*(?:>\s*)?/i
    );
    if (!marker) return null;

    textNode.nodeValue = textNode.nodeValue.slice(marker[0].length);
    removeLeadingBreaks(paragraph);
    return alertTypes[marker[1].toUpperCase()];
  }

  function enhanceMarkdownAlerts() {
    const blockquotes = Array.from(articleBody.querySelectorAll("blockquote"));

    blockquotes.forEach((blockquote) => {
      if (blockquote.classList.contains("markdown-alert")) return;

      const firstContent = blockquote.firstElementChild;
      if (!firstContent || firstContent.tagName !== "P") return;

      const alertType = findAlertMarker(firstContent);
      if (!alertType) return;

      blockquote.classList.add("markdown-alert", `markdown-alert-${alertType.name}`);

      const title = document.createElement("p");
      title.className = "markdown-alert-title";
      title.appendChild(createAlertIcon(alertType.icon));
      title.appendChild(document.createTextNode(alertType.label));
      blockquote.insertBefore(title, firstContent);

      if (!firstContent.hasChildNodes()) {
        firstContent.remove();
      }
    });
  }

  enhanceMarkdownAlerts();

  if (!tocList || !scrollRoot) return;

  const headings = Array.from(articleBody.querySelectorAll("h2, h3, h4"));
  const usedIds = new Set();
  const hasTableOfContents = headings.length > 0;

  if (tocContainer) {
    tocContainer.hidden = !hasTableOfContents;
  }
  if (articleShell) {
    articleShell.classList.toggle("article-shell-no-toc", !hasTableOfContents);
  }

  function createHeadingId(heading, index) {
    const presetId = heading.id.trim();
    if (presetId && !usedIds.has(presetId)) {
      usedIds.add(presetId);
      return presetId;
    }

    const baseId = heading.textContent
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^\w\-\u3400-\u9fff]/g, "") || `section-${index + 1}`;

    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id) || document.getElementById(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    return id;
  }

  headings.forEach((heading, index) => {
    heading.id = createHeadingId(heading, index);

    const item = document.createElement("li");
    const link = document.createElement("a");
    item.className = `toc-item toc-item-level-${heading.tagName.slice(1)}`;
    link.className = "toc-link";
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent.trim();
    link.dataset.target = heading.id;
    item.appendChild(link);
    tocList.appendChild(item);
  });

  const tocLinks = Array.from(tocList.querySelectorAll(".toc-link"));

  function setActiveLink(id) {
    tocLinks.forEach((link) => {
      const active = link.dataset.target === id;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (hasTableOfContents && "IntersectionObserver" in window) {
    const visibleHeadings = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visibleHeadings.set(entry.target.id, entry.boundingClientRect.top);
        } else {
          visibleHeadings.delete(entry.target.id);
        }
      });

      if (visibleHeadings.size > 0) {
        const nearest = Array.from(visibleHeadings.entries()).sort((a, b) => a[1] - b[1])[0];
        setActiveLink(nearest[0]);
      }
    }, { root: scrollRoot, rootMargin: "-12% 0px -70% 0px", threshold: 0 });

    headings.forEach((heading) => observer.observe(heading));
    setActiveLink(headings[0].id);
  }

  function isCompactLayout() {
    return window.matchMedia("(max-width: 820px)").matches;
  }

  function syncTocLayout() {
    if (!tocToggle || !tocPanel) return;
    if (isCompactLayout()) {
      const expanded = tocToggle.getAttribute("aria-expanded") === "true";
      tocPanel.hidden = !expanded;
    } else {
      tocToggle.setAttribute("aria-expanded", "true");
      tocPanel.hidden = false;
    }
  }

  if (hasTableOfContents && tocToggle && tocPanel) {
    tocToggle.addEventListener("click", () => {
      if (!isCompactLayout()) return;
      const expanded = tocToggle.getAttribute("aria-expanded") === "true";
      tocToggle.setAttribute("aria-expanded", String(!expanded));
      tocPanel.hidden = expanded;
    });

    tocLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (isCompactLayout()) {
          tocToggle.setAttribute("aria-expanded", "false");
          tocPanel.hidden = true;
        }
      });
    });

    window.addEventListener("resize", syncTocLayout, { passive: true });
    syncTocLayout();
  }

  function updateReadingProgress() {
    if (!progressBar) return;
    const scrollable = scrollRoot.scrollHeight - scrollRoot.clientHeight;
    const progress = scrollable > 0 ? Math.min(scrollRoot.scrollTop / scrollable, 1) : 0;
    progressBar.style.width = `${progress * 100}%`;
  }

  scrollRoot.addEventListener("scroll", updateReadingProgress, { passive: true });
  window.addEventListener("resize", updateReadingProgress, { passive: true });
  updateReadingProgress();
})();
