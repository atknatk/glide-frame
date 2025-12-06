import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["components/glide-frame/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  treeshake: true,
  minify: true,
  outDir: "dist",
  tsconfig: "tsconfig.build.json",
});

