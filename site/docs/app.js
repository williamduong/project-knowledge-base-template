const FALLBACK_OWNER = "williamduong";
const FALLBACK_REPO = "project-knowledge-base-template";

const state = {
  manifest: null,
  allItems: [],
  activePath: null,
  owner: FALLBACK_OWNER,
  repo: FALLBACK_REPO
};

function detectRepository() {
  const host = window.location.hostname;
  const pathParts = window.location.pathname.split("/").filter(Boolean);

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

function setRepoLink() {
  const link = document.getElementById("repoLink");
  link.href = `https://github.com/${state.owner}/${state.repo}`;
}

function flattenItems(groups) {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupTitle: group.title
    }))
  );
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

async function loadDoc(docPath) {
  state.activePath = docPath;
  renderNav(document.getElementById("search").value);

  const content = document.getElementById("content");
  content.innerHTML = `<p>Loading <strong>${docPath}</strong>...</p>`;

  try {
    const response = await fetch(rawUrl(docPath));
    if (!response.ok) {
      throw new Error(`Cannot fetch ${docPath} (${response.status})`);
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);

    content.innerHTML = `
      <p class="note">
        Source file: <a href="${githubUrl(docPath)}" target="_blank" rel="noreferrer">${docPath}</a>
      </p>
      ${html}
    `;
  } catch (error) {
    content.innerHTML = `
      <h2>Unable to load this document</h2>
      <p>${error.message}</p>
      <p>
        Open directly on GitHub:
        <a href="${githubUrl(docPath)}" target="_blank" rel="noreferrer">${docPath}</a>
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
  state.allItems = flattenItems(state.manifest.groups);

  const search = document.getElementById("search");
  search.addEventListener("input", (event) => {
    renderNav(event.target.value);
  });

  const params = new URLSearchParams(window.location.search);
  const selected = params.get("doc");
  const initialDoc = state.allItems.find((item) => item.path === selected)
    ? selected
    : state.manifest.defaultDoc;

  renderNav();
  await loadDoc(initialDoc);
}

bootstrap().catch((error) => {
  const content = document.getElementById("content");
  content.innerHTML = `<h2>Portal initialization failed</h2><p>${error.message}</p>`;
});
