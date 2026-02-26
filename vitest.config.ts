import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["_tests_/**/*.test.ts"],
    environment: "node",
  },
})
