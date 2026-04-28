const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const templateRoot = path.join(repoRoot, "template");
const readmePath = path.join(repoRoot, "README.md");
const outputPath = path.join(repoRoot, "site", "docs", "tree.json");

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function publicPathFromRepoPath(repoPath) {
  if (repoPath === "README.md") {
    return "README.md";
  }

  return repoPath.replace(/^template\//, "");
}

function compareEntries(left, right) {
  if (left.isDirectory() && !right.isDirectory()) {
    return -1;
  }

  if (!left.isDirectory() && right.isDirectory()) {
    return 1;
  }

  return left.name.localeCompare(right.name, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function scanDirectory(absDir, repoPrefix) {
  const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort(compareEntries);
  const children = [];

  for (const entry of entries) {
    const absPath = path.join(absDir, entry.name);
    const repoPath = normalizePath(path.posix.join(repoPrefix, entry.name));

    if (entry.isDirectory()) {
      const nestedChildren = scanDirectory(absPath, repoPath);
      if (nestedChildren.length > 0) {
        children.push({
          type: "directory",
          name: entry.name,
          repoPath,
          publicPath: publicPathFromRepoPath(repoPath),
          children: nestedChildren
        });
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
      continue;
    }

    children.push({
      type: "file",
      name: entry.name,
      repoPath,
      publicPath: publicPathFromRepoPath(repoPath)
    });
  }

  return children;
}

function buildTree() {
  const rootChildren = [];

  if (fs.existsSync(readmePath)) {
    rootChildren.push({
      type: "file",
      name: "README.md",
      repoPath: "README.md",
      publicPath: "README.md"
    });
  }

  rootChildren.push(...scanDirectory(templateRoot, "template"));

  return {
    generatedAt: new Date().toISOString(),
    root: {
      type: "directory",
      name: "KB",
      repoPath: "",
      publicPath: "",
      children: rootChildren
    }
  };
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(buildTree(), null, 2)}\n`, "utf8");

console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);