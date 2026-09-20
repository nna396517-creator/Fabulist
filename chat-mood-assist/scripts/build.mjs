// esbuild bundle + static asset copy. `node scripts/build.mjs [--watch]`
import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outdir = join(root, "dist");
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: {
    background: join(root, "src/background/index.ts"),
    content: join(root, "src/content/index.ts"),
    popup: join(root, "src/popup/index.ts"),
  },
  outdir,
  bundle: true,
  format: "esm",
  target: ["chrome120"],
  platform: "browser",
  // The Anthropic SDK ships browser-safe entry points behind this condition.
  conditions: ["browser", "import", "default"],
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": JSON.stringify(watch ? "development" : "production"),
  },
};

function copyStatic() {
  cpSync(join(root, "public"), outdir, { recursive: true });
  console.log("copied public/ -> dist/");
}

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  copyStatic();
  console.log("watching...");
} else {
  await build(options);
  copyStatic();
}
