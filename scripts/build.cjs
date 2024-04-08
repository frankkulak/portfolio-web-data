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
 * @param {string} jsonName
 * @param {object} options
 * @param {(content: string) => string} options.modifyInputContent
 * @param {(json: object) => void} options.processObject
 * @param {(content: string) => string} options.modifyOutputContent
 */
function minifyJson(jsonName, options) {
  const filepath = path.join(SRC_DIR, `${jsonName}.json`);
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

const enums = {
  tags: undefined, // string set
  skills: undefined, // string set
};

minifyJson("enums", {
  processObject(json) {
    // register enums
    enums.tags = new Set(Object.keys(json.tags));
    enums.skills = new Set(Object.keys(json.skills));
  },
});

minifyJson("projects", {
  processObject(json) {
    json.sections.forEach(({ projects }) => {
      // count variables
      variables.numProjects += projects.length;
      projects.forEach(({ name, status, tags, techStack, oldTechStack }) => {
        // ensure tags / tech stack contain valid values
        const ensureValid = (list, kind) => {
          const validSet = enums[kind];
          const found = list.find((item) => !validSet.has(item));
          if (found) throw `Project '${name}' has ${kind} '${found}'`;
        };
        ensureValid(tags, "tags");
        ensureValid(techStack, "skills");
        if (oldTechStack) ensureValid(oldTechStack, "skills");

        // count variables
        if (status === "maintained" || status === "archived")
          variables.numAvailableProjects++;
        if (tags.includes("website")) variables.numWebsiteProjects++;
        if (tags.includes("ts4-tool")) variables.numModToolProjects++;
        if (tags.includes("ts4-mod")) variables.numModProjects++;
      });
    });
  },
});

minifyJson("home", {
  modifyInputContent(content) {
    // replace variables
    for (const [key, value] of Object.entries(variables))
      content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
    return content;
  },
  processObject(json) {
    // sort projects dashboard by count
    json.projects.dashboard.cells.sort((a, b) => {
      return parseInt(b.count) - parseInt(a.count);
    });
  },
});

//#endregion
