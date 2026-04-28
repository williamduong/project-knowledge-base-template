const FALLBACK_OWNER = "williamduong";
const FALLBACK_REPO = "project-knowledge-base-template";

const state = {
  manifest: null,
  tree: null,
  allItems: [],
  activePath: null,
  owner: FALLBACK_OWNER,
  repo: FALLBACK_REPO,
  docsBasePath: "/docs"
};

function detectRepository() {
  const host = window.location.hostname;
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const docsIndex = pathParts.lastIndexOf("docs");

  if (docsIndex >= 0) {
    state.docsBasePath = `/${pathParts.slice(0, docsIndex + 1).join("/")}`;
  }

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
  return `${state.docsBasePath}/${encodeURI(toPublicPath(docPath))}`;
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

  const currentPath = decodeURIComponent(window.location.pathname);
  const prefix = `${state.docsBasePath}/`;
  if (currentPath.startsWith(prefix)) {
    const publicPath = currentPath.slice(prefix.length);
    if (publicPath) {
      return toRepoPath(publicPath);
    }
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

async function loadTree() {
  try {
    const response = await fetch("./tree.json", { cache: "no-cache" });
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
      btn.onclick = () => loadDoc(item.path);
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

function createFileButton(node) {
  const button = document.createElement("button");
  button.className = "doc-item tree-file";
  if (node.repoPath === state.activePath) {
    button.classList.add("active");
  }
  button.type = "button";
  button.textContent = node.name;
  button.onclick = () => loadDoc(node.repoPath);
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
  details.open = Boolean(filter) || depth === 0 || hasActiveDescendant(node);

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
    decorateContentLinks(content, normalizedPath);

    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        target.scrollIntoView();
      }
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

  const response = await fetch("./manifest.json");
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
  search.addEventListener("input", (event) => {
    renderNav(event.target.value);
    renderTree(event.target.value);
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
