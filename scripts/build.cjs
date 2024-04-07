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
 * @param {(json: object) => void} preprocess
 * @param {(content: string) => string} postprocess
 */
function minifyJson(filepath, preprocess, postprocess) {
  const dstPath = srcToDstPath(filepath);
  const json = JSON.parse(fs.readFileSync(filepath).toString());
  delete json.$schema;
  preprocess?.(json);
  let content = JSON.stringify(json);
  if (postprocess) content = postprocess(content);
  fs.writeFileSync(dstPath, content);
}

//#endregion

//#region Build

const variables = {
  numPublishedProjects: 0, // count maintained/archived projects in projects.json
  homeProjects: [], // list projects with includeInHome=true in projects.json
};

minifyJson(path.join(SRC_DIR, "projects.json"), (json) => {
  json.sections.forEach(({ projects }) => {
    projects.forEach((project) => {
      if (project.includeInHome) {
        delete project.includeInHome;
        variables.homeProjects.push(project);
      }

      if (project.status === "maintained" || project.status === "archived") {
        variables.numPublishedProjects++;
      }
    });
  });
});

minifyJson(
  path.join(SRC_DIR, "home.json"),
  (json) => {
    json.projects.projects.push(...variables.homeProjects);
  },
  (content) =>
    content.replace(
      /{{numPublishedProjects}}/g,
      variables.numPublishedProjects.toString()
    )
);

//#endregion
