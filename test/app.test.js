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

describe("check if /soldiers post endpoint works correctly", () => {
	it("should return 400 when can't connect to db", async () => {
		const validSoldier = {
			_id: "1234567",
			name: "Liav",
			rankValue: 0,
			rankName: "private",
		};
		const response = await request(badApp).post("/soldiers").send(validSoldier);

		expect(response.statusCode).toBe(503);
	});

	const scenarios = [
		{
			label: "should return 400 when name is missing",
			body: { _id: "1234567", rankName: "private" },
			expectedStatus: 400,
		},
		{
			label: "should return 400 when id is missing",
			body: { name: "Liav", rankName: "private" },
			expectedStatus: 400,
		},
		{
			label: "should return 400 when rankValue or rankName is missing",
			body: { name: "Liav", _id: "1234567" },
			expectedStatus: 400,
		},

		{
			label: "should return 400 when rankName is invalid",
			body: { name: "Liav", rankName: "Superman", _id: "1234567" },
			expectedStatus: 400,
		},
		{
			label: "should return 400 when rankValue is invalid",
			body: { _id: "1234567", name: "Liav", rankValue: "14" },
			expectedStatus: 400,
		},
		{
			label: "should return 400 when limitations format is invalid",
			body: {
				_id: "1234567",
				name: "Liav",
				rankName: "private",
				limitations: [1],
			},
			expectedStatus: 400,
		},
		{
			label: "should return 400 when id is invalid",
			body: { _id: "1", name: "Liav", rankName: "private" },
			expectedStatus: 400,
		},
		{
			label: "should return 400 when name is invalid",
			body: { _id: "1234567", name: "S", rankName: "private" },
			expectedStatus: 400,
		},

		{
			label: "should return 400 when rankName doesnt match rankValue",
			body: { _id: "1234567", name: "S", rankName: "private", rankValue: 3 },
			expectedStatus: 400,
		},

		{
			label: "should return 201 when soldier is valid",
			body: { _id: "1234567", name: "Liav", rankName: "private" },
			expectedStatus: 201,
		},
		{
			label: "should return 201 when soldier is valid",
			body: {
				_id: "1234567",
				name: "Liav",
				rankValue: 1,
				limitations: ["be nice"],
			},
			expectedStatus: 201,
		},
		{
			label: "should return 201 when soldier is valid",
			body: { _id: "1234567", name: "Liav", rankValue: 0, rankName: "private" },
			expectedStatus: 201,
		},
	];

	scenarios.forEach(({ label, body, expectedStatus }) => {
		it(label, async () => {
			const response = await request(app).post("/soldiers").send(body);

			expect(response.statusCode).toBe(expectedStatus);
		});
	});
});

describe("check if /soldiers/:id get endpoint works correctly", () => {
	it("should return 400 when can't connect to db", async () => {
		const response = await request(badApp).get("/soldiers/1234567");

		expect(response.statusCode).toBe(503);
	});

	it("should return status code 200 when soldier was found", async () => {
		const response = await request(app).get(`/soldiers/1234567`);

		expect(response.statusCode).toBe(200);
	});

	it("should return status code 400 when soldier id isn't valid", async () => {
		const response = await request(app).get(`/soldiers/notValidId`);
		expect(response.statusCode).toBe(400);
	});

	it("should return status code 404 when soldier was not found", async () => {
		const response = await request(app).get(`/soldiers/1111111`);
		expect(response.statusCode).toBe(404);
	});
});
