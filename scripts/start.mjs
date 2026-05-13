import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const port = process.env.PORT || "80";
const nextBinary = "node_modules/.bin/next";
const command = process.platform === "win32" ? "next" : existsSync(join(process.cwd(), nextBinary)) ? nextBinary : "next";
const child = spawn(command, ["start", "-p", port], {
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
