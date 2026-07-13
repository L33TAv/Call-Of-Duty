import request from "supertest";

import { describe, expect, it } from "vitest";

import createApp from "../src/app.js";

const mockClient = {
	db: () => ({
		command: async () => ({ ok: 1 }),
	}),
};

const mockBrokenClient = {
	db: () => ({
		command: async () => {
			throw new Error("connection lost");
		},
	}),
};

const app = createApp(mockClient);
const badApp = createApp(mockBrokenClient);

describe("checks that health endpoints works correctly", () => {
	it("should return code 200 for /health endpoint", async () => {
		const response = await request(app).get("/health");
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
	});

	it("should return status code 200 for /health/db get route", async () => {
		const response = await request(app).get("/health/db");
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
	});

	it("should return status code 500 when fails to ping /health/db get route", async () => {
		const badResponse = await request(badApp).get("/health/db");
		expect(badResponse.statusCode).toBe(500);
		expect(badResponse.body.status).toBe("error");
	});
});
