import { defineConfig } from "vite";
import { resolve } from "path";
import solid from "vite-plugin-solid";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    solid(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  css: {
    postcss: "./postcss.config.js",
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "shared",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [
        "solid-js",
        "wgpu-matrix",
        "@influxdata/influxdb-client-browser",
        "@mono424/stalker-ts",
        "lucide-solid",
      ],
      output: {
        globals: {
          "solid-js": "SolidJS",
          "wgpu-matrix": "WgpuMatrix",
          "@influxdata/influxdb-client-browser": "InfluxDBClient",
          "@mono424/stalker-ts": "StalkerTS",
          "lucide-solid": "LucideSolid",
        },
      },
    },
  },
});
