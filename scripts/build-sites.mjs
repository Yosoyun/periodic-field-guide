import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

await run(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["build"]);
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
await writeFile("dist/server/index.js", `
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const response = await env.ASSETS.fetch(new Request(new URL(requestedPath, url), request));
    if (response.status !== 404) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
  },
};
`.trimStart());

const hosting = JSON.parse(await readFile(".openai/hosting.json", "utf8"));
if (!hosting.project_id) throw new Error("Missing Sites project_id");
