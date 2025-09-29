import path from "path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import wasm from "vite-plugin-wasm";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [solidPlugin(), wasm(), tailwindcss() /*, basicSsl()*/],
  server: {
    host: "0.0.0.0",
    port: 3000,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {
      "/_zenoh": {
        target: "http://localhost:10000",
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    include: ["@mono424/cdr-ts"],
    exclude: ["@mono424/zdepth-wasm"],
  },
  assetsInclude: ["**/*.wasm"],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
      "@xylt": path.resolve(__dirname, "../xylt-build"),
    },
  },
});
