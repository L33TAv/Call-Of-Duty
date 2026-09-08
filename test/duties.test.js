import { MongoNetworkError } from "mongodb";
import request from "supertest";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createApp } from "../src/app.js";
import * as clientDB from "../src/db/client.js";
import * as dutiesRepository from "../src/db/dutiesDB.js";

const app = createApp();

const ONE_DAY = 24 * 60 * 60 * 1000;

function createDutyDocument(override = {}) {
	const soldierDocument = {
		name: "hagnash",
		description: "a",
		location: {
			type: "Point",
			coordinates: [30.0, 10.0],
		},
		constraints: [],
		startTime: "2027-11-01T07:12:00.000Z",
		endTime: "2028-10-01T07:12:00.000Z",
		soldiersRequired: 5,
		value: 5,
		soldiers: [],
		status: "unscheduled",
		statusHistory: ["unscheduled", new Date()],
		createdAt: new Date(),
		updatedAt: new Date(),
		...override,
	};

	return soldierDocument;
}

function createDutyBody(override = {}) {
	const startTime = new Date(Date.now() + ONE_DAY);

	const endTime = new Date(startTime.getTime() + ONE_DAY);

	const body = {
		name: "bobi",
		description: "nada",
		location: {
			type: "Point",
			coordinates: [34.7818, 32.0853],
		},
		startTime,
		endTime,
		constraints: [],
		soldiersRequired: 1,
		value: 1,
	};

	return { ...body, ...override };
}

function createScenario(label, body = {}, expectedIssue) {
	const override = createDutyBody(body);
	return { label, body: override, expectedIssue };
}

beforeAll(async () => {
	await clientDB.connectClient();
});

beforeEach(async () => {
	await dutiesRepository.dutiesCollection().deleteMany({});
});

afterEach(async () => {
	vi.restoreAllMocks();
	await dutiesRepository.dutiesCollection().deleteMany({});
});

afterAll(async () => {
	await clientDB.closeDb();
});

describe("Test /duties endpoints", () => {
	describe("Test POST /duties endpoint", () => {
		it("should return 201 when duty is valid", async () => {
			const body = createDutyBody();

			const response = await request(app).post("/duties").send(body);

			expect(response.statusCode).toBe(201);
			expect(response.body).toEqual({
				...body,
				_id: expect.stringMatching(/^[0-9a-fA-F]{24}$/),
				startTime: expect.any(String),
				endTime: expect.any(String),
				soldiers: [],
				status: "unscheduled",
				statusHistory: ["unscheduled", expect.any(String)],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		it("should return 201 when duty is valid - with minRank and maxRank", async () => {
			const body = createDutyBody({ minRank: 1, maxRank: 4 });

			const response = await request(app).post("/duties").send(body);

			expect(response.statusCode).toBe(201);
			expect(response.body).toEqual({
				...body,
				_id: expect.stringMatching(/^[0-9a-fA-F]{24}$/),
				startTime: expect.any(String),
				endTime: expect.any(String),
				soldiers: [],
				status: "unscheduled",
				statusHistory: ["unscheduled", expect.any(String)],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		it("should return 500 when an unexpected error occurs", async () => {
			const body = createDutyBody({ minRank: 1, maxRank: 4 });

			vi.spyOn(dutiesRepository, "insertOne").mockRejectedValue(
				new Error("something unexpected happened"),
			);

			const response = await request(app).post("/duties").send(body);

			expect(response.statusCode).toBe(500);
			expect(response.body.status).toBe("error");
		});

		it("should return 503 when fails connect to DB", async () => {
			const body = createDutyBody({ minRank: 1, maxRank: 4 });

			vi.spyOn(dutiesRepository, "insertOne").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app).post("/duties").send(body);

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
		});

		const badScenarios = [
			createScenario("name is missing", { name: undefined }, "name"),
			createScenario("value is missing", { value: undefined }, "value"),
			createScenario("name size is invalid", { name: "a" }, "name"),
			createScenario(
				"description is empty",
				{ description: "" },
				"description",
			),
			createScenario(
				"location is invalid - type",
				{ location: { type: "notValid", coordinates: [34.7818, 32.0853] } },
				"type",
			),
			createScenario(
				"location is invalid - coordinates array size",
				{ location: { type: "Point", coordinates: [32.0853] } },
				"coordinates",
			),
			createScenario(
				"location is invalid - coordinates value",
				{ location: { type: "Point", coordinates: [32.0853, -100] } },
				"Invalid coordinates: Longitude (-180 to 180), Latitude (-90 to 90)",
			),
			createScenario(
				"startTime is invalid - not a date",
				{ startTime: 1 },
				"startTime",
			),
			createScenario(
				"startTime is in the past",
				{ startTime: new Date(Date.now() - ONE_DAY) },
				"startTime",
			),
			createScenario(
				"endTime is invalid - not a date",
				{ endTime: 1 },
				"endTime",
			),
			createScenario(
				"endTime is before startTime",
				{ endTime: new Date(Date.now() - ONE_DAY) },
				"End time must be after the start time",
			),
			createScenario(
				"constraints are invalid",
				{ constraints: "notValid" },
				"constraints",
			),
			createScenario(
				"soldiersRequired is negative",
				{ soldiersRequired: -2 },
				"soldiersRequired",
			),
			createScenario("value is invalid", { value: -2 }, "value"),
			createScenario("minRank value is invalid", { minRank: 8 }, "minRank"),
			createScenario("maxRank value is invalid", { maxRank: 8 }, "maxRank"),
		];

		it.each(badScenarios)("should return 400 when $label", async ({
			label,
			body,
			expectedIssue,
		}) => {
			const response = await request(app).post("/duties").send(body);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain(expectedIssue);
		});
	});

	describe("Test GET /duties endpoint", () => {
		it("should return 200 when duty search is valid", async () => {
			const name = "avtash";
			const soldierDoument = createDutyDocument();

			const soldierDoument2 = createDutyDocument({ name });

			await dutiesRepository.dutiesCollection().insertOne({
				...soldierDoument,
			});

			await dutiesRepository.dutiesCollection().insertOne({
				...soldierDoument2,
			});

			const response = await request(app).get(`/duties?name=${name}`);

			expect(response.statusCode).toBe(200);

			expect(response.body.length).toBe(1);

			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name,
					}),
				]),
			);
		});
	});
});
