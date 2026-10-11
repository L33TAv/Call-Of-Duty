import { MongoNetworkError } from "mongodb";
import request from "supertest";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createApp } from "../src/app.js";
import * as clientDB from "../src/db/client.js";

const app = createApp();

beforeAll(async () => {
	await clientDB.connectClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await clientDB.closeDb();
});

describe("Test health endpoints", () => {
	it("should return code 200 for /health", async () => {
		const response = await request(app).get("/health");
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
	});

	it("should return status code 200 for GET /health/db", async () => {
		const response = await request(app).get("/health/db");
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: "ok" });
	});

	it("should return status code 500 when fails to ping GET /health/db", async () => {
		vi.spyOn(clientDB, "getClient").mockRejectedValue({
			db: () => ({
				command: async () => {
					throw new MongoNetworkError(
						"failed to connect to server on first connect",
					);
				},
			}),
		});

		const response = await request(app).get("/health/db");
		expect(response.statusCode).toBe(500);
		expect(response.body.status).toBe("error");
	});
});
