const FALLBACK_OWNER = "williamduong";
const FALLBACK_REPO = "project-knowledge-base-template";

const state = {
  manifest: null,
  tree: null,
  allItems: [],
  activePath: null,
  owner: FALLBACK_OWNER,
  repo: FALLBACK_REPO,
  docsPagePath: "/docs.html",
  treeExpansion: new Map()
};

function trackEvent(eventName, payload = {}) {
  if (typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, payload);
}

function classifyDocPath(docPath) {
  if (!docPath) {
    return "unknown";
  }

  if (docPath === "README.md") {
    return "root";
  }

  const top = docPath.split("/")[1] || "other";
  return top;
}

function detectRepository() {
  const host = window.location.hostname;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const pathPrefix = pathParts.length > 0 ? `/${pathParts.slice(0, -1).join("/")}` : "";
  state.docsPagePath = `${pathPrefix}/docs.html`;

  if (host.endsWith(".github.io")) {
    state.owner = host.replace(".github.io", "");
    if (pathParts.length > 0) {
      state.repo = pathParts[0];
    }
  }
}

function rawUrl(docPath) {
  return `https://raw.githubusercontent.com/${state.owner}/${state.repo}/main/${docPath}`;
}

function githubUrl(docPath) {
  return `https://github.com/${state.owner}/${state.repo}/blob/main/${docPath}`;
}

function normalizeDocPath(docPath) {
  return docPath.replace(/^\/+/, "").replace(/\\/g, "/");
}

function toPublicPath(repoPath) {
  const normalized = normalizeDocPath(repoPath);
  if (normalized === "README.md") {
    return normalized;
  }

  return normalized.startsWith("template/")
    ? normalized.slice("template/".length)
    : normalized;
}

function toRepoPath(publicPath) {
  const normalized = normalizeDocPath(publicPath);
  if (!normalized || normalized === "README.md") {
    return "README.md";
  }

  return normalized.startsWith("template/") ? normalized : `template/${normalized}`;
}

function docsUrl(docPath) {
  return `${state.docsPagePath}?path=${encodeURIComponent(toPublicPath(docPath))}`;
}

function parseInitialDoc() {
  const params = new URLSearchParams(window.location.search);
  const explicitPath = params.get("path");
  const legacyDoc = params.get("doc");

  if (explicitPath) {
    return toRepoPath(explicitPath);
  }

  if (legacyDoc) {
    return normalizeDocPath(legacyDoc);
  }

  return state.manifest.defaultDoc;
}

function setRepoLink() {
  const link = document.getElementById("repoLink");
  link.href = `https://github.com/${state.owner}/${state.repo}`;
}

function flattenItems(groups) {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupTitle: group.title,
      publicPath: toPublicPath(item.path)
    }))
  );
}

function flattenTree(node, acc = []) {
  if (!node) {
    return acc;
  }

  if (node.type === "file") {
    acc.push({
      label: node.name,
      path: node.repoPath,
      publicPath: node.publicPath,
      groupTitle: "KB Tree"
    });
    return acc;
  }

  for (const child of node.children || []) {
    flattenTree(child, acc);
  }

  return acc;
}

function mergeItems(manifestItems, treeItems) {
  const byPath = new Map();
  [...manifestItems, ...treeItems].forEach((item) => {
    byPath.set(item.path, item);
  });

  return Array.from(byPath.values());
}

function setTreeStatus(text) {
  document.getElementById("treeStatus").textContent = text;
}

function setTreeExpansionForAll(expanded) {
  state.treeExpansion.clear();
  walkTree(state.tree.root, (node) => {
    if (node.type === "directory" && node.repoPath) {
      state.treeExpansion.set(node.repoPath, expanded);
    }
  });

  trackEvent("docs_tree_expand_toggle_all", {
    event_category: "docs_tree",
    state: expanded ? "expanded" : "collapsed"
  });
}

function walkTree(node, visitor) {
  if (!node) {
    return;
  }

  visitor(node);
  for (const child of node.children || []) {
    walkTree(child, visitor);
  }
}

async function loadTree() {
  try {
    const response = await fetch("./data/tree.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error("missing tree metadata");
    }

    return response.json();
  } catch {
    return {
      root: {
        type: "directory",
        name: "KB",
        repoPath: "",
        publicPath: "",
        children: state.allItems
          .filter((item) => item.path !== state.manifest.defaultDoc || item.path === "README.md")
          .map((item) => ({
            type: "file",
            name: item.label,
            repoPath: item.path,
            publicPath: item.publicPath
          }))
      }
    };
  }
}

function renderNav(filterText = "") {
  const nav = document.getElementById("nav");
  nav.innerHTML = "";

  const filter = filterText.trim().toLowerCase();
  for (const group of state.manifest.groups) {
    const filteredItems = group.items.filter((item) => {
      if (!filter) return true;
      return (
        item.label.toLowerCase().includes(filter) ||
        item.path.toLowerCase().includes(filter)
      );
    });

    if (filteredItems.length === 0) continue;

    const title = document.createElement("h2");
    title.className = "group-title";
    title.textContent = group.title;
    nav.appendChild(title);

    filteredItems.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "doc-item";
      if (state.activePath === item.path) {
        btn.classList.add("active");
      }
      btn.textContent = item.label;
      btn.type = "button";
      btn.onclick = () => {
        trackEvent("docs_highlight_click", {
          event_category: "docs_navigation",
          doc_path: item.path,
          doc_group: group.title
        });
        loadDoc(item.path);
      };
      nav.appendChild(btn);
    });
  }
}

function treeNodeMatches(node, filter) {
  if (!filter) {
    return true;
  }

  const haystack = `${node.name} ${node.publicPath || ""}`.toLowerCase();
  if (haystack.includes(filter)) {
    return true;
  }

  return (node.children || []).some((child) => treeNodeMatches(child, filter));
}

function hasActiveDescendant(node) {
  if (node.type === "file") {
    return node.repoPath === state.activePath;
  }

  return (node.children || []).some((child) => hasActiveDescendant(child));
}

function shouldFolderBeOpen(node, filter, depth) {
  if (filter) {
    return true;
  }

  if (state.treeExpansion.has(node.repoPath)) {
    return state.treeExpansion.get(node.repoPath);
  }

  return depth === 0 ? hasActiveDescendant(node) : hasActiveDescendant(node);
}

function createFileButton(node) {
  const button = document.createElement("button");
  button.className = "doc-item tree-file";
  if (node.repoPath === state.activePath) {
    button.classList.add("active");
  }
  button.type = "button";
  button.textContent = node.name;
  button.onclick = () => {
    trackEvent("docs_tree_file_click", {
      event_category: "docs_tree",
      doc_path: node.repoPath,
      doc_group: classifyDocPath(node.repoPath)
    });
    loadDoc(node.repoPath);
  };
  return button;
}

function createTreeNode(node, filter, depth = 0) {
  if (!treeNodeMatches(node, filter)) {
    return null;
  }

  if (node.type === "file") {
    const wrapper = document.createElement("div");
    wrapper.className = "tree-node";
    wrapper.appendChild(createFileButton(node));
    return wrapper;
  }

  const details = document.createElement("details");
  details.className = "tree-folder";
  details.open = shouldFolderBeOpen(node, filter, depth);
  if (node.repoPath) {
    details.dataset.repoPath = node.repoPath;
  }
  details.addEventListener("toggle", () => {
    if (!node.repoPath) {
      return;
    }
    state.treeExpansion.set(node.repoPath, details.open);
    setTreeStatus(`${state.treeExpansion.size} folder states saved`);
    trackEvent("docs_tree_folder_toggle", {
      event_category: "docs_tree",
      folder_path: node.repoPath,
      state: details.open ? "open" : "closed"
    });
  });

  const summary = document.createElement("summary");
  const label = document.createElement("span");
  label.className = "tree-folder-label";
  label.textContent = node.name;
  summary.appendChild(label);
  details.appendChild(summary);

  const children = document.createElement("div");
  children.className = "tree-children";

  for (const child of node.children || []) {
    const childNode = createTreeNode(child, filter, depth + 1);
    if (childNode) {
      children.appendChild(childNode);
    }
  }

  if (children.children.length > 0) {
    details.appendChild(children);
    return details;
  }

  return null;
}

function renderTree(filterText = "") {
  const tree = document.getElementById("tree");
  tree.innerHTML = "";

  const filter = filterText.trim().toLowerCase();
  const root = document.createElement("div");
  root.className = "tree-root";

  for (const child of state.tree.root.children || []) {
    const childNode = createTreeNode(child, filter);
    if (childNode) {
      root.appendChild(childNode);
    }
  }

  if (root.children.length === 0) {
    const empty = document.createElement("p");
    empty.className = "tree-empty";
    empty.textContent = "No matching KB files.";
    tree.appendChild(empty);
    return;
  }

  tree.appendChild(root);
}

function buildBreadcrumbSegments(docPath) {
  const publicPath = toPublicPath(docPath);
  const segments = publicPath.split("/");
  const items = [];

  if (publicPath === "README.md") {
    return [{ label: "README", path: "README.md" }];
  }

  let currentPublicPath = "";
  segments.forEach((segment, index) => {
    currentPublicPath = currentPublicPath ? `${currentPublicPath}/${segment}` : segment;
    const isLast = index === segments.length - 1;
    items.push({
      label: segment,
      path: isLast ? toRepoPath(currentPublicPath) : null
    });
  });

  return items;
}

function renderBreadcrumb(docPath) {
  const segments = buildBreadcrumbSegments(docPath);
  const breadcrumb = document.createElement("nav");
  breadcrumb.className = "breadcrumb";
  breadcrumb.setAttribute("aria-label", "Breadcrumb");

  const home = document.createElement("a");
  home.className = "breadcrumb-link breadcrumb-item";
  home.href = docsUrl("README.md");
  home.textContent = "Docs";
  home.addEventListener("click", (event) => {
    event.preventDefault();
    loadDoc("README.md");
  });
  breadcrumb.appendChild(home);

  segments.forEach((segment) => {
    const separator = document.createElement("span");
    separator.className = "breadcrumb-sep";
    separator.textContent = "/";
    breadcrumb.appendChild(separator);

    if (segment.path) {
      const link = document.createElement("a");
      link.className = "breadcrumb-link breadcrumb-item";
      link.href = docsUrl(segment.path);
      link.textContent = segment.label;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        loadDoc(segment.path);
      });
      breadcrumb.appendChild(link);
      return;
    }

    const text = document.createElement("span");
    text.className = "breadcrumb-current";
    text.textContent = segment.label;
    breadcrumb.appendChild(text);
  });

  return breadcrumb;
}

function joinRepoPath(baseFilePath, relativePath) {
  const baseDir = normalizeDocPath(baseFilePath).split("/").slice(0, -1);
  const segments = relativePath.split("/");
  const joined = relativePath.startsWith("/") ? [] : [...baseDir];

  segments.forEach((segment) => {
    if (!segment || segment === ".") {
      return;
    }
    if (segment === "..") {
      joined.pop();
      return;
    }
    joined.push(segment);
  });

  return joined.join("/");
}

function decorateContentLinks(content, currentDocPath) {
  const links = content.querySelectorAll("a[href]");
  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || /^[a-z]+:/i.test(href)) {
      return;
    }

    const [pathPart, hashPart] = href.split("#");
    if (!pathPart.toLowerCase().endsWith(".md")) {
      return;
    }

    const targetRepoPath = pathPart.startsWith("template/") || pathPart === "README.md"
      ? normalizeDocPath(pathPart)
      : joinRepoPath(currentDocPath, pathPart);

    const hashSuffix = hashPart ? `#${hashPart}` : "";
    link.href = `${docsUrl(targetRepoPath)}${hashSuffix}`;
    link.classList.add("internal-doc-link");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      loadDoc(targetRepoPath);
      if (hashPart) {
        window.location.hash = hashPart;
      }
    });
  });
}

async function loadDoc(docPath, options = {}) {
  const normalizedPath = normalizeDocPath(docPath);
  const { pushHistory = true, replaceHistory = false } = options;

  state.activePath = normalizedPath;
  trackEvent("docs_doc_open", {
    event_category: "docs_navigation",
    doc_path: normalizedPath,
    doc_group: classifyDocPath(normalizedPath)
  });

  trackEvent("page_view", {
    page_title: `KB Docs - ${toPublicPath(normalizedPath)}`,
    page_path: docsUrl(normalizedPath)
  });

  renderNav(document.getElementById("search").value);
  renderTree(document.getElementById("search").value);

  const targetUrl = docsUrl(normalizedPath);
  if (pushHistory) {
    if (replaceHistory) {
      window.history.replaceState({ docPath: normalizedPath }, "", targetUrl);
    } else {
      window.history.pushState({ docPath: normalizedPath }, "", targetUrl);
    }
  }

  const content = document.getElementById("content");
  content.innerHTML = `<p>Loading <strong>${normalizedPath}</strong>...</p>`;

  try {
    const response = await fetch(rawUrl(normalizedPath));
    if (!response.ok) {
      throw new Error(`Cannot fetch ${normalizedPath} (${response.status})`);
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);

    content.innerHTML = `
      <p class="note">
        Source file: <a href="${githubUrl(normalizedPath)}" target="_blank" rel="noreferrer">${normalizedPath}</a>
      </p>
      ${html}
    `;
    content.prepend(renderBreadcrumb(normalizedPath));
    decorateContentLinks(content, normalizedPath);

    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        target.scrollIntoView();
      }
    }

    const sourceAnchor = content.querySelector(".note a");
    if (sourceAnchor) {
      sourceAnchor.addEventListener("click", () => {
        trackEvent("docs_open_github_source", {
          event_category: "docs_external",
          doc_path: normalizedPath
        });
      });
    }
  } catch (error) {
    content.innerHTML = `
      <h2>Unable to load this document</h2>
      <p>${error.message}</p>
      <p>
        Open directly on GitHub:
        <a href="${githubUrl(normalizedPath)}" target="_blank" rel="noreferrer">${normalizedPath}</a>
      </p>
    `;
  }
}

async function bootstrap() {
  detectRepository();
  setRepoLink();

  const response = await fetch("./data/manifest.json");
  if (!response.ok) {
    throw new Error("Cannot load docs manifest.");
  }

  state.manifest = await response.json();
  const manifestItems = flattenItems(state.manifest.groups);
  state.allItems = manifestItems;
  state.tree = await loadTree();
  state.allItems = mergeItems(manifestItems, flattenTree(state.tree.root));
  setTreeStatus("Repository view");

  const search = document.getElementById("search");
  let searchDebounceTimer = null;
  search.addEventListener("input", (event) => {
    renderNav(event.target.value);
    renderTree(event.target.value);
    setTreeStatus(event.target.value.trim() ? "Filtered view" : "Repository view");

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      const query = event.target.value.trim();
      if (!query) {
        return;
      }

      trackEvent("docs_search", {
        event_category: "docs_navigation",
        query,
        query_length: query.length
      });
    }, 400);
  });

  document.getElementById("expandTree").addEventListener("click", () => {
    setTreeExpansionForAll(true);
    renderTree(document.getElementById("search").value);
    setTreeStatus("All folders expanded");
  });

  document.getElementById("collapseTree").addEventListener("click", () => {
    setTreeExpansionForAll(false);
    renderTree(document.getElementById("search").value);
    setTreeStatus("All folders collapsed");
  });

  trackEvent("docs_portal_view", {
    event_category: "page",
    event_label: "docs_home"
  });

  window.addEventListener("popstate", async () => {
    const docPath = parseInitialDoc();
    await loadDoc(docPath, { pushHistory: false });
  });

  const initialDoc = parseInitialDoc();
  const knownDoc = state.allItems.find((item) => item.path === initialDoc);
  const docToLoad = knownDoc ? initialDoc : state.manifest.defaultDoc;

  renderNav();
  renderTree();
  await loadDoc(docToLoad, { replaceHistory: true });
}

bootstrap().catch((error) => {
  const content = document.getElementById("content");
  content.innerHTML = `<h2>Portal initialization failed</h2><p>${error.message}</p>`;
});
