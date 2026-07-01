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
	it("checks if /health returns status code 200", async () => {
		const response = await request(app).get("/health");
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
	});

	it("checks if /health/db returns status code 200 if the server is connected to the DB client properly", async () => {
		const response = await request(app).get("/health/db");
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: "ok" });

		const badResponse = await request(badApp).get("/health/db");
		expect(badResponse.statusCode).toBe(500);
		expect(badResponse.body.status).toBe("error");
	});
});
