import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: false,
  bundle: true,
  target: "es2023",
  noExternal: [/^@reposentinel\//u]
});
