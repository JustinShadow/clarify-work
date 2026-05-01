import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getGitVersion() {
  try {
    const tag = execSync("git describe --tags --abbrev=0", { encoding: "utf8" }).trim();
    return tag.replace(/^v/, "");
  } catch {
    console.warn("No git tag found, using 0.0.0");
    return "0.0.0";
  }
}

const version = getGitVersion();
console.log(`Syncing version to: ${version}`);

const rootDir = path.resolve(__dirname, "..", "..");
const tauriConfPath = path.join(__dirname, "tauri.conf.json");
const cargoPath = path.join(__dirname, "Cargo.toml");
const pkgPath = path.join(rootDir, "package.json");

const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`  Updated tauri.conf.json -> ${version}`);

let cargo = fs.readFileSync(cargoPath, "utf8");
cargo = cargo.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo);
console.log(`  Updated Cargo.toml -> ${version}`);

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`  Updated package.json -> ${version}`);
