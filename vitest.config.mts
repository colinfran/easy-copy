import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    root: path.resolve(__dirname),
    include: ['_tests_/**/*.{test,spec}.?(c|m)[jt]s?(x)']
  }
});