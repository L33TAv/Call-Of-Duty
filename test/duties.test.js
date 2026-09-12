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
	const startTime = new Date(Date.now() + ONE_DAY);

	const endTime = new Date(startTime.getTime() + ONE_DAY);

	const dutyDocument = {
		name: "hagnash",
		description: "a",
		location: {
			type: "Point",
			coordinates: [30.0, 10.0],
		},
		constraints: [],
		startTime,
		endTime,
		soldiersRequired: 5,
		value: 5,
		soldiers: [],
		status: "unscheduled",
		statusHistory: ["unscheduled", new Date()],
		createdAt: new Date(),
		updatedAt: new Date(),
		...override,
	};

	return dutyDocument;
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
			const dutyDocument = createDutyDocument();

			const dutyDocument2 = createDutyDocument({ name });

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument,
			});

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument2,
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

		it("should return 200 when constraint are given", async () => {
			const constraints = ["money", "food"];
			const dutyDocument = createDutyDocument({ constraints });

			const dutyDocument2 = createDutyDocument({
				constraints: [...constraints, "hagnash"],
			});

			const dutyDocument3 = createDutyDocument();

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument,
			});

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument2,
			});

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument3,
			});

			const response = await request(app).get(
				`/duties?constraints=${[...constraints]}`,
			);

			expect(response.statusCode).toBe(200);

			expect(response.body.length).toBe(2);

			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						constraints,
					}),
				]),
			);
		});

		it("should return 200 when location is given", async () => {
			const location = {
				type: "Point",
				coordinates: [33, 12],
			};
			const dutyDocument = createDutyDocument({ location });

			const dutyDocument2 = createDutyDocument({
				location: { type: "Point", coordinates: [33, 12.5] },
			});

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument,
			});

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument2,
			});

			const response = await request(app).get(`/duties?location=33,12`);

			expect(response.statusCode).toBe(200);

			expect(response.body.length).toBe(1);

			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						location,
					}),
				]),
			);
		});

		it("should return 503 when fails connect to DB", async () => {
			const dutyDocument = createDutyDocument();

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument,
			});

			vi.spyOn(dutiesRepository, "find").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app).get("/duties?name=task");

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
		});

		it("should return 400 when no search query is given", async () => {
			const dutyDocument = createDutyDocument();

			await dutiesRepository.dutiesCollection().insertOne({
				...dutyDocument,
			});

			const response = await request(app).get(`/duties`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain(
				"At least one filter must be provided",
			);
		});

		it("should return 400 when search using unknown property", async () => {
			const response = await request(app).get(`/duties?unkwownProperty=3`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("unkwownProperty");
		});

		it("should return 400 when search using invalid name", async () => {
			const response = await request(app).get(`/duties?name=a`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("name");
		});

		it("should return 400 when search using empty description", async () => {
			const response = await request(app).get(`/duties?description=`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("description");
		});

		it("should return 400 when search using invalid location - single point", async () => {
			const response = await request(app).get(`/duties?location=13.2`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("location");
		});

		it("should return 400 when search using invalid location - longitude value", async () => {
			const response = await request(app).get(`/duties?location=190,12`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain(
				"Invalid coordinates: Longitude (-180 to 180), Latitude (-90 to 90)",
			);
		});

		it("should return 400 when search using invalid startTime format", async () => {
			const response = await request(app).get(`/duties?startTime=abc`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("startTime");
		});

		it("should return 400 when search startTime is in the past", async () => {
			const startTime = new Date(Date.now() - ONE_DAY).toISOString();

			const response = await request(app).get(`/duties?startTime=${startTime}`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain(
				"Start time must be in the future",
			);
		});

		it("should return 400 when search using invalid endTime format", async () => {
			const response = await request(app).get(`/duties?endTime=abc`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("endTime");
		});

		it("should return 400 when search endTime is in the past", async () => {
			const endTime = new Date(Date.now() - ONE_DAY).toISOString();

			const response = await request(app).get(`/duties?endTime=${endTime}`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("End time must be in the future");
		});

		it("should return 400 when endTime is before startTime", async () => {
			const startTime = new Date(Date.now() + 2 * ONE_DAY).toISOString();
			const endTime = new Date(Date.now() + ONE_DAY).toISOString();

			const response = await request(app).get(
				`/duties?startTime=${startTime}&endTime=${endTime}`,
			);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain(
				"End time must be after the start time",
			);
		});

		it("should return 400 when search using duplicate constraints", async () => {
			const response = await request(app).get(`/duties?constraints=a,b,a`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("constraints");
		});

		it("should return 400 when search using empty constraints", async () => {
			const response = await request(app).get(`/duties?constraints=`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("constraints");
		});

		it("should return 400 when soldiersRequired isn't a number", async () => {
			const response = await request(app).get(`/duties?soldiersRequired=a`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("soldiersRequired");
		});

		it("should return 400 when soldiersRequired is negetive", async () => {
			const response = await request(app).get(`/duties?soldiersRequired=-2`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("soldiersRequired");
		});

		it("should return 400 when value is negetive", async () => {
			const response = await request(app).get(`/duties?value=-2`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("value");
		});

		it("should return 400 when minRank is above 6", async () => {
			const response = await request(app).get(`/duties?minRank=7`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("minRank");
		});

		it("should return 400 when maxRank is above 6", async () => {
			const response = await request(app).get(`/duties?maxRank=7`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("maxRank");
		});

		it("should return 400 when minRank is above maxRank", async () => {
			const response = await request(app).get(`/duties?maxRank=4&minRank=5`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("minRank must be below maxRank");
		});
	});
});
