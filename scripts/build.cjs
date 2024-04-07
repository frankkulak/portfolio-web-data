const fs = require("fs");
const path = require("path");

const SRC_DIR = path.resolve(__dirname, "../data");
const DST_DIR = path.resolve(__dirname, "../build");

//#region Helpers

/**
 * @param {string} srcPath
 * @returns {string}
 */
function srcToDstPath(srcPath) {
  const destPath = srcPath.replace(SRC_DIR, DST_DIR);
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  return destPath;
}

/**
 * @param {string} filepath
 * @param {object} options
 * @param {(content: string) => string} options.modifyInputContent
 * @param {(json: object) => void} options.processObject
 * @param {(content: string) => string} options.modifyOutputContent
 */
function minifyJson(filepath, options) {
  const dstPath = srcToDstPath(filepath);
  const rawContent = fs.readFileSync(filepath).toString();
  const contentToParse = options?.modifyInputContent
    ? options.modifyInputContent(rawContent)
    : rawContent;
  const json = JSON.parse(contentToParse);
  delete json.$schema;
  options?.processObject?.(json);
  let outputContent = JSON.stringify(json);
  if (options?.modifyOutputContent)
    outputContent = options.modifyOutputContent(content);
  fs.writeFileSync(dstPath, outputContent);
}

//#endregion

//#region Build

const variables = {
  numProjects: 0, // all
  numAvailableProjects: 0, // maintained/archived only
  numWebsiteProjects: 0, // tag=website
  numModToolProjects: 0, // tag=ts4-tool
  numModProjects: 0, // tag=ts4-mod
};

minifyJson(path.join(SRC_DIR, "projects.json"), {
  processObject(json) {
    json.sections.forEach(({ projects }) => {
      variables.numProjects += projects.length;
      projects.forEach(({ status, tags }) => {
        if (status === "maintained" || status === "archived")
          variables.numAvailableProjects++;
        if (tags.includes("website")) variables.numWebsiteProjects++;
        if (tags.includes("ts4-tool")) variables.numModToolProjects++;
        if (tags.includes("ts4-mod")) variables.numModProjects++;
      });
    });
  },
});

minifyJson(path.join(SRC_DIR, "home.json"), {
  modifyInputContent(content) {
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    }

    return content;
  },
  processObject(json) {
    json.projects.dashboard.cells.sort((a, b) => {
      return parseInt(b.count) - parseInt(a.count);
    });
  },
});

//#endregion
