import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths allow the same build to work on a project Pages URL.
  base: "./",
  plugins: [react()],
});
