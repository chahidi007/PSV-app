const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const { blockList: defaultBlockList } = config.resolver;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const localSkillsTmp = path.join(workspaceRoot, ".local", "skills");

config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : defaultBlockList ? [defaultBlockList] : []),
  new RegExp("^" + escapeRegex(localSkillsTmp) + /[\\/]\.tmp/.source),
  new RegExp("^" + escapeRegex(path.join(workspaceRoot, ".local", "skills", ".tmp"))),
];

module.exports = config;
