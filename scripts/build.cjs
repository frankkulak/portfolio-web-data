const fs = require("fs");
const path = require("path");
const glob = require("glob");
const htmlMinify = require("html-minifier").minify;

const BUILD_DIR = path.resolve(__dirname, "../build");
const DATA_DIR = path.resolve(__dirname, "../data");
const SPOTLIGHT_BUILD_DIR = path.join(BUILD_DIR, "spotlights");
const SPOTLIGHT_DATA_DIR = path.join(DATA_DIR, "spotlights");

//#region Helpers

/**
 * Figures out where the built file should be written to and ensures that all
 * necessary folders exist.
 *
 * @param {string} sourcePath File to source file
 * @returns {string}
 */
function getDestinationPath(sourcePath) {
  const rel = sourcePath.replace(DATA_DIR, "");
  const dest = path.join(BUILD_DIR, rel);
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dest;
}

/**
 * Parses the content of the give JSON file into an object.
 *
 * @param {string} filepath Path to JSON file
 * @returns {object}
 */
function parseJsonFile(filepath) {
  return JSON.parse(fs.readFileSync(filepath).toString());
}

/**
 * Replaces any occurrences of variables with their values.
 *
 * @param {string} fileContent Content of file to replace variables of
 * @returns {string}
 */
function replaceVariables(fileContent) {
  variables.forEach(({ name, value }) => {
    fileContent = fileContent.replace(new RegExp(`{{${name}}}`, "g"), value);
  });

  return fileContent;
}

/**
 * Reads the JSON at the given filepath, removes the schema, and writes it to
 * the build directory without any whitespace.
 *
 * @param {string} filepath Path to source file to minify
 */
function minifyJson(filepath) {
  const dest = getDestinationPath(filepath);
  const json = parseJsonFile(filepath);
  delete json.$schema;
  fs.writeFileSync(dest, replaceVariables(JSON.stringify(json)));
}

//#endregion

//#region Variables

const variables = [];

const variableProcessors = [
  {
    pattern: "projects.json",
    process(projectsData) {
      let numPublishedProjects = 0;
      projectsData.sections.forEach(({ projects }) => {
        numPublishedProjects += projects.filter((project) => {
          return (
            project.status === "maintained" || project.status === "archived"
          );
        }).length;
      });

      variables.push({
        name: "numPublishedProjects",
        value: numPublishedProjects,
      });
    },
  },
];

//#endregion

//#region Build

// process variables
variableProcessors.forEach((processor) => {
  glob.sync(path.join(DATA_DIR, processor.pattern)).forEach((filepath) => {
    const json = parseJsonFile(filepath);
    processor.process(json);
  });
});

// minify top-level data
glob.sync(path.join(DATA_DIR, "*.json")).forEach(minifyJson);

// minify spotlights
if (!fs.existsSync(SPOTLIGHT_BUILD_DIR)) fs.mkdirSync(SPOTLIGHT_BUILD_DIR);
glob.sync(path.join(SPOTLIGHT_DATA_DIR, "*.html")).forEach((filepath) => {
  const html = htmlMinify(fs.readFileSync(filepath).toString(), {
    collapseWhitespace: true,
  });
  const dest = path.join(SPOTLIGHT_BUILD_DIR, path.basename(filepath));
  fs.writeFileSync(dest, html);
});

//#endregion
