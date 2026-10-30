import { defineConfig } from "vitest/config";

process.loadEnvFile(".env.test");

export default defineConfig({
	test: {},
});
