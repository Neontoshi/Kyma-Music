import { rmSync, mkdirSync, cpSync, copyFileSync } from "fs";

rmSync("../Kyma_Backend/remote-dist", { recursive: true, force: true });
mkdirSync("../Kyma_Backend/remote-dist/assets", { recursive: true });
copyFileSync(
  "dist/remote/index.html",
  "../Kyma_Backend/remote-dist/index.html",
);
cpSync("dist/assets", "../Kyma_Backend/remote-dist/assets", {
  recursive: true,
});

console.log("remote-dist copied successfully");
