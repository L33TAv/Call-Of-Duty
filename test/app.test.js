import request from "supertest";

import { describe, expect, it } from "vitest";

import createApp from "../src/app.js";

const mockClient = {
	db: () => ({
		command: async () => ({ ok: 1 }),
		connect: async () => ({}),
		collection: () => ({
			insertOne: async () => {},
			findOne: async (soldier) => {
				if (soldier._id === "1234567") return "exists";
				return null;
			},
		}),
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

describe("check if /soldiers post endpoint works correctly", () => {
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

describe("check if /soldiers get endpoint works correctly", () => {
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
