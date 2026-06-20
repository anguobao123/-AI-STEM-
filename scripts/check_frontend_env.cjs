const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const frontendDir = path.join(projectRoot, "frontend");
const packageJsonPath = path.join(frontendDir, "package.json");

function printResult(label, value) {
  process.stdout.write(`${label}: ${value}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

if (!fs.existsSync(packageJsonPath)) {
  fail(`Missing package.json: ${packageJsonPath}`);
  process.exit();
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const dependencies = packageJson.dependencies || {};
const devDependencies = packageJson.devDependencies || {};

const requiredDependencies = [
  "@tensorflow/tfjs",
  "vue",
  "vite",
  "element-plus",
  "echarts"
];

printResult("projectRoot", projectRoot);
printResult("frontendDir", frontendDir);
printResult("nodeVersion", process.version);
printResult("packageName", packageJson.name || "");
printResult("packageVersion", packageJson.version || "");

for (const name of requiredDependencies) {
  const version = dependencies[name] || devDependencies[name] || "";
  if (!version) {
    fail(`Missing required dependency: ${name}`);
    continue;
  }
  printResult(`dependency:${name}`, version);
}

printResult("scripts", Object.keys(packageJson.scripts || {}).join(", "));
printResult("status", process.exitCode ? "failed" : "ok");
