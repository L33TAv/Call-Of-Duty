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
import * as soldiersRepository from "../src/db/soldiersDB.js";

let idCounter = "1111111";

function createSoldierDocument(override = {}) {
	const soldierDocument = {
		name: "bobi",
		_id: idCounter.toString(),
		rank: {
			name: "private",
			value: 0,
		},
		createdAt: new Date(),
		updatedAt: new Date(),
		...override,
	};

	idCounter++;

	return soldierDocument;
}

function createSoldierBody(override = {}) {
	const body = {
		name: "bobi",
		_id: idCounter.toString(),
		rankName: "private",
	};

	idCounter++;

	return { ...body, ...override };
}

function createScenario(label, body = {}, expectedIssue) {
	const override = createSoldierBody(body);
	return { label, body: override, expectedIssue };
}

const app = createApp();

beforeAll(async () => {
	await clientDB.connectClient();
});

beforeEach(async () => {
	await soldiersRepository.soldiersCollection().deleteMany({});
});

afterEach(async () => {
	vi.restoreAllMocks();
	await soldiersRepository.soldiersCollection().deleteMany({});
});

afterAll(async () => {
	await clientDB.closeDb();
});

describe("Test /soldiers endpoints", () => {
	describe("Test POST /soldiers endpoint", () => {
		it("should return 201 when soldier is valid", async () => {
			const body = createSoldierBody();

			const response = await request(app).post("/soldiers").send(body);

			expect(response.statusCode).toBe(201);
			expect(response.body).toEqual({
				_id: body._id,
				name: body.name,
				rank: { name: "private", value: 0 },
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		it("should return 201 when soldier is valid - with limitations", async () => {
			const body = createSoldierBody({ limitations: ["rest"] });

			const response = await request(app).post("/soldiers").send(body);

			expect(response.statusCode).toBe(201);
			expect(response.body).toEqual({
				_id: body._id,
				name: body.name,
				rank: { name: "private", value: 0 },
				limitations: ["rest"],
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		it("should return 500 when an unexpected error occurs", async () => {
			const validSoldier = createSoldierBody();

			vi.spyOn(soldiersRepository, "insertOne").mockRejectedValue(
				new Error("something unexpected happened"),
			);

			const response = await request(app).post("/soldiers").send(validSoldier);

			expect(response.statusCode).toBe(500);
			expect(response.body.status).toBe("error");
		});

		it("should return 503 when fails connect to DB", async () => {
			const validSoldier = createSoldierBody();

			vi.spyOn(soldiersRepository, "insertOne").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app).post("/soldiers").send(validSoldier);

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
		});

		const badScenarios = [
			createScenario("_id is missing", { _id: undefined }, "_id"),
			createScenario("name is missing", { name: undefined }, "name"),
			createScenario(
				"rankValue/rankName is missing",
				{ rankName: undefined, rankValue: undefined },
				"rank",
			),
			createScenario(
				"rankValue is invalid",
				{ rankValue: 14, rankName: undefined },
				"rankValue",
			),
			createScenario("name is invalid", { name: "n" }, "name"),
			createScenario("id is invalid", { _id: "not a valid Id" }, "_id"),
			createScenario(
				"limitations are invalid - not a string",
				{ limitations: [1, 12, 3] },
				"limitations",
			),
			createScenario(
				"limitations are invalid - duplicate limitations",
				{ limitations: ["food", "FOOD"] },
				"limitations",
			),
			createScenario(
				"rank value doesn't match rank name",
				{ rankName: "private", rankValue: 4 },
				"rank",
			),
			createScenario(
				"rank name isn't valid",
				{ rankName: "not a real rank" },
				"rankName",
			),
		];

		it.each(badScenarios)("should return 400 when $label", async ({
			label,
			body,
			expectedIssue,
		}) => {
			const response = await request(app).post("/soldiers").send(body);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain(expectedIssue);
		});

		it("should return 409 when posting duplicate soldier", async () => {
			const body = createSoldierBody();

			const response = await request(app).post("/soldiers").send(body);

			expect(response.statusCode).toBe(201);

			const response2 = await request(app).post("/soldiers").send(body);

			expect(response2.statusCode).toBe(409);
			expect(response2.body.message).toBe("Resource already exists");
		});
	});

	describe("Test GET /soldiers/:id endpoint", () => {
		it("should return 200 when soldier found", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app).get(
				`/soldiers/${validSoldierDocument._id}`,
			);

			expect(response.statusCode).toBe(200);

			const { createdAt, updatedAt, ...expectedFields } = validSoldierDocument;

			expect(response.body).toEqual({
				...expectedFields,
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		});

		it("should return 503 when fails connect to DB", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			vi.spyOn(soldiersRepository, "findById").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app).get(
				`/soldiers/${validSoldierDocument._id}`,
			);

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("database error");
		});

		it("should return 400 when id isn't valid - not a number", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app).get(`/soldiers/notValidId`);
			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain(
				"the id must contain only numbers.",
			);
		});

		it("should return 400 when id isn't valid - length", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app).get(`/soldiers/1234`);
			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("id");
		});

		it("should return 404 when soldier not found", async () => {
			const response = await request(app).get(`/soldiers/0000000`);

			expect(response.statusCode).toBe(404);
			expect(response.body.message).toContain("soldier was not found.");
		});
	});

	describe("Test GET /soldiers endpoint", () => {
		it("should return 200 when soldier search is valid", async () => {
			const name = "liav";
			const validSoldierDocument = createSoldierDocument({ name });
			const validSoldierDocument2 = createSoldierDocument({ name });
			const validSoldierDocument3 = createSoldierDocument({ name: "daniel" });

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument2,
			});

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument3,
			});

			const response = await request(app).get(`/soldiers?name=${name}`);

			expect(response.statusCode).toBe(200);

			expect(response.body.length).toBe(2);

			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						name,
					}),
				]),
			);
		});

		it("should return status code 200 when limitations are given", async () => {
			const validSoldierDocument = createSoldierDocument({
				limitations: ["food", "money"],
			});
			const validSoldierDocument2 = createSoldierDocument({
				limitations: ["money"],
			});
			const validSoldierDocument3 = createSoldierDocument({
				limitations: ["food"],
			});

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument2,
			});

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument3,
			});

			const response = await request(app).get(`/soldiers?limitations=food`);

			expect(response.statusCode).toBe(200);

			expect(response.body.length).toBe(2);

			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						limitations: ["food"],
					}),
				]),
			);
		});

		it("should return status code 200 when no soldier attributes are given", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app).get(`/soldiers`);

			expect(response.statusCode).toBe(200);

			expect(response.body.length).toBe(1);

			const { createdAt, updatedAt, ...expectedFields } = validSoldierDocument;

			expect(response.body).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						...expectedFields,
						createdAt: expect.any(String),
						updatedAt: expect.any(String),
					}),
				]),
			);
		});

		it("should return 503 when fails connect to DB", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			vi.spyOn(soldiersRepository, "find").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app).get(`/soldiers/?rankValue=3`);

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("database error");
		});

		it("should return 400 when search using _id", async () => {
			const response = await request(app).get(`/soldiers?_id=1234567`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("_id");
		});

		it("should return 400 when search using invalid rankName", async () => {
			const response = await request(app).get(`/soldiers?rankName=1`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("rankName");
		});

		it("should return 400 when search using duplicate limitations", async () => {
			const response = await request(app).get(`/soldiers?limitations=a,a`);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain("limitations");
		});

		it("should return 400 when search using unmatched rankName and rankValue", async () => {
			const response = await request(app).get(
				`/soldiers?rankName=private&rankValue=3`,
			);

			expect(response.statusCode).toBe(400);

			expect(response.body.issues).toContain(
				"rank doesn't match the requirements.",
			);
		});
	});

	describe("Test DELETE /soldiers/:id endpoint", () => {
		it("should return 204 when soldier was deleted", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app).delete(
				`/soldiers/${validSoldierDocument._id}`,
			);

			const soldierInDB = await soldiersRepository
				.soldiersCollection()
				.findOne({ _id: validSoldierDocument._id });

			expect(response.statusCode).toBe(204);
			expect(soldierInDB).toBe(null);
		});

		it("should return 503 when fails connect to DB", async () => {
			const validSoldierDocument = createSoldierDocument();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			vi.spyOn(soldiersRepository, "deleteById").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app).delete(
				`/soldiers/${validSoldierDocument._id}`,
			);

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("database error");
		});

		it("should return 404 when soldier was not found", async () => {
			const response = await request(app).delete(`/soldiers/0000000`);

			expect(response.statusCode).toBe(404);
			expect(response.body.message).toContain("");
			expect(response.body.status).toBe("error");
		});

		it("should return 400 when  the soldier id isn't valid - length", async () => {
			const response = await request(app).delete(`/soldiers/1`);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("id");
		});

		it("should return 400 when  the soldier id isn't valid - not a number", async () => {
			const response = await request(app).delete(`/soldiers/notValidId`);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain(
				"the id must contain only numbers.",
			);
		});
	});

	describe("Test PATCH /soldiers/:id endpoint", () => {
		it("should return status code 200 when the soldier was patched", async () => {
			const validSoldierDocument = createSoldierDocument();

			const newPatch = { name: "patrick", limitations: ["food"] };

			const updatedAt = new Date();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
				updatedAt,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}`)
				.send(newPatch);

			expect(response.statusCode).toBe(200);
			expect(response.body._id).toBe(validSoldierDocument._id);
			expect(response.body.name).toBe(newPatch.name);
			expect(response.body.limitations).toEqual(
				expect.arrayContaining(newPatch.limitations),
			);

			const newUpdated = new Date(response.body.updatedAt);

			expect(newUpdated).not.toBe(updatedAt);
		});

		it("should return status code 200 when the soldier limitations were patched", async () => {
			const validSoldierDocument = createSoldierDocument({
				limitations: ["food"],
			});
			const newPatch = { name: "patrick", limitations: ["food", "water"] };

			const updatedAt = new Date();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
				updatedAt,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}`)
				.send(newPatch);

			expect(response.statusCode).toBe(200);
			expect(response.body._id).toBe(validSoldierDocument._id);
			expect(response.body.name).toBe(newPatch.name);
			expect(response.body.limitations).toEqual(
				expect.arrayContaining(newPatch.limitations),
			);

			const newUpdated = new Date(response.body.updatedAt);

			expect(newUpdated).not.toBe(updatedAt);
		});

		it("should return status code 200 when the soldier rankName was patched", async () => {
			const validSoldierDocument = createSoldierDocument({});
			const newPatch = { rankName: "lieutenant" };

			const updatedAt = new Date();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
				updatedAt,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}`)
				.send(newPatch);

			expect(response.statusCode).toBe(200);
			expect(response.body._id).toBe(validSoldierDocument._id);
			expect(response.body.rank.name).toBe(newPatch.rankName);
			expect(response.body.rank.value).toBe(3);

			const newUpdated = new Date(response.body.updatedAt);

			expect(newUpdated).not.toBe(updatedAt);
		});

		it("should return 503 when fails connect to DB", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newPatch = { name: "bobi" };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			vi.spyOn(soldiersRepository, "updateById").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}`)
				.send(newPatch);

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("database error");
		});

		it("should return status code 400 when the soldier id isn't valid - length", async () => {
			const newPatch = { name: "sam" };
			const response = await request(app)
				.patch(`/soldiers/1234`)
				.send(newPatch);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("id");
		});

		it("should return status code 400 when the soldier id can't be changed", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newPatch = { _id: "1234567" };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}`)
				.send(newPatch);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("id");
			expect(response.body.issues).toContain("Unrecognized key");
		});

		it("should return status code 400 when the parameters aren't valid - unknown property", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newPatch = { notRealProperty: "avocado" };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}`)
				.send(newPatch);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("Unrecognized key");
		});

		it("should return status code 400 when the parameters aren't valid - name", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newPatch = { name: "a" };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}`)
				.send(newPatch);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("name");
		});

		it("should return status code 404 when the soldier wasn't found", async () => {
			const newPatch = { name: "sandy" };

			const response = await request(app)
				.patch(`/soldiers/9999999`)
				.send(newPatch);

			expect(response.statusCode).toBe(404);
			expect(response.body.message).toBe(
				"soldier wasn't found or couldn't be changed",
			);
		});
	});

	describe("Test PUT /soldiers/:id/limitations", () => {
		it("should return 200 when put soldier limitations", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newLimitations = { limitations: ["food", "walking"] };

			const updatedAt = new Date();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
				updatedAt,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(200);

			expect(response.body._id).toBe(validSoldierDocument._id);
			expect(response.body.limitations).toEqual(
				expect.arrayContaining(newLimitations.limitations),
			);

			const newUpdated = new Date(response.body.updatedAt);

			expect(newUpdated.getTime()).toBeGreaterThan(updatedAt.getTime());
		});

		it("should return 200 when soldier limitations patched - patching existing limitations", async () => {
			const validSoldierDocument = createSoldierDocument({
				limitations: ["walking"],
			});
			const newLimitations = { limitations: ["food", "walking"] };

			const updatedAt = new Date();

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
				updatedAt,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(200);

			expect(response.body._id).toBe(validSoldierDocument._id);
			expect(response.body.limitations).toEqual(
				expect.arrayContaining(newLimitations.limitations),
			);

			const newUpdated = new Date(response.body.updatedAt);

			expect(newUpdated.getTime()).toBeGreaterThan(updatedAt.getTime());
		});

		it("should return 503 when fails connect to DB", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newLimitations = { limitations: ["food"] };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			vi.spyOn(soldiersRepository, "updateLimitationsById").mockRejectedValue(
				new MongoNetworkError("failed to connect to server on first connect"),
			);

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(503);
			expect(response.body.status).toBe("error");
			expect(response.body.message).toContain("database error");
		});

		it("should return status code 400 when the limitations aren't valid - using numbers", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newLimitations = { limitations: [1, "walking"] };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("limitations");
			expect(response.body.issues).toContain("number");
		});

		it("should return status code 400 when the limitations aren't valid - not an array", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newLimitations = { limitations: "water" };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("limitations");
			expect(response.body.issues).toContain("array");
		});

		it("should return status code 400 when the limitations aren't valid - empty limitations", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newLimitations = { limitations: "" };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("limitations");
			expect(response.body.issues).toContain("string");
		});

		it("should return status code 400 when the limitations aren't valid - duplicate limitations", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newLimitations = { limitations: ["water", "water"] };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/${validSoldierDocument._id}/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("limitations");
			expect(response.body.issues).toContain("duplicate");
		});

		it("should return status code 400 when the id isn't valid", async () => {
			const validSoldierDocument = createSoldierDocument();
			const newLimitations = { limitations: ["water", "water"] };

			await soldiersRepository.soldiersCollection().insertOne({
				...validSoldierDocument,
			});

			const response = await request(app)
				.patch(`/soldiers/notValidId/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(400);
			expect(response.body.issues).toContain("id");
		});

		it("should return status code 404 when the soldier wasn't found", async () => {
			const newLimitations = { limitations: ["water", "food"] };

			const response = await request(app)
				.patch(`/soldiers/1234567/limitations`)
				.send(newLimitations);

			expect(response.statusCode).toBe(404);

			expect(response.body.message).toBe(
				"soldier wasn't found or couldn't be changed",
			);
		});
	});
});
