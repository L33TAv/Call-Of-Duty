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
import createApp from "../src/app.js";
import * as client from "../src/db/client.js";

const app = createApp();

beforeAll(async () => {
	await client.connectClient();
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(async () => {
	await client.getDb().dropDatabase();

	const mongoClient = await client.connectClient();
	await mongoClient.close();
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
		vi.spyOn(client, "connectClient").mockRejectedValue({
			db: () => ({
				command: async () => {
					throw new MongoNetworkError(
						"failed to connect to server on first connect",
					);
				},
			}),
		});

		const badResponse = await request(app).get("/health/db");
		expect(badResponse.statusCode).toBe(500);
		expect(badResponse.body.status).toBe("error");
	});
});
