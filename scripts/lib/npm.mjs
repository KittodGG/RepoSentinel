import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

function quote(argument) {
  return /[\s"&|<>^]/u.test(argument)
    ? `"${argument.replaceAll('"', '\\"')}"`
    : argument;
}

/**
 * Runs npm portably.
 *
 * On Windows npm is `npm.cmd`, and since CVE-2024-27980 Node refuses to spawn a
 * `.cmd` without a shell. Node also deprecates passing an argument array
 * alongside `shell: true`, so the Windows path builds one quoted command string
 * and uses `exec`; every other platform stays on shell-free `execFile`.
 *
 * All arguments come from build scripts, never from user input.
 */
export async function runNpm(args, options = {}) {
  const settings = { maxBuffer: 8 * 1024 * 1024, ...options };
  if (process.platform !== "win32") return execFileAsync("npm", args, settings);
  const command = ["npm.cmd", ...args.map(quote)].join(" ");
  return execAsync(command, settings);
}
