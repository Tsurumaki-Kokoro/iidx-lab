import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

const dataRoot = fileURLToPath(new URL("./dist/data/", import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "iidxlab-static-data",
      configureServer(server) {
        const sdkFiles = new Set(["index.mjs", "core.mjs", "render.mjs", "browse.mjs", "difficulty.mjs"]);
        server.middlewares.use((req,res,next)=>{
          const name=new URL(req.url||"/", "http://localhost").pathname.slice(1);
          if(!sdkFiles.has(name))return next();
          res.setHeader("Content-Type","text/javascript; charset=utf-8");
          createReadStream(path.join(dataRoot,"..",name)).on("error",()=>res.destroy()).pipe(res);
        });
        server.middlewares.use("/data", (req, res, next) => {
          try {
            const file = path.resolve(
              dataRoot,
              "." +
                decodeURIComponent(
                  new URL(req.url || "/", "http://localhost").pathname,
                ),
            );
            if (
              !file.startsWith(dataRoot) ||
              ![".gz", ".json"].includes(path.extname(file)) ||
              !existsSync(file)
            )
              return next();
            res.setHeader(
              "Content-Type",
              file.endsWith(".json")
                ? "application/json"
                : "application/octet-stream",
            );
            createReadStream(file)
              .on("error", () => res.destroy())
              .pipe(res);
          } catch {
            next();
          }
        });
      },
    },
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { emptyOutDir: false },
});
