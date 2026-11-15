import {writeOfflineAssets} from "./offline-assets.mjs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
const {buildLearningPayload,finalizeLearningPayload}=await import("./learning-payload.mjs");
const {optimizeClientScripts}=await import("./client-scripts.mjs");
const {optimizeClientStyles}=await import("./client-styles.mjs");
const {finishSiteAssets}=await import("./site-build-info.mjs");
if(command==="build"){const {verifyHeartViewer}=await import("./verify-heart-viewer.mjs");verifyHeartViewer();await import("./lecture-changelog.mjs");buildLearningPayload();process.once("exit",code=>{if(code===0){finalizeLearningPayload();const scripts=optimizeClientScripts(fileURLToPath(new URL("../",import.meta.url)));console.log("Client script optimization:",JSON.stringify(scripts));console.log("Client stylesheet optimization:",JSON.stringify(optimizeClientStyles(fileURLToPath(new URL("../",import.meta.url)))));writeOfflineAssets(fileURLToPath(new URL("../",import.meta.url)));finishSiteAssets(scripts)}})}
const managedLinux = readExecutionProfile() === "managed-linux";

if (managedLinux && command === "build") {
  const result = spawnSync("bash", [
    fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args,
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli.href);
if(command==="build")finalizeLearningPayload();
