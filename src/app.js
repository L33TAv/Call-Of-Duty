import express from "express";
import { pino } from "pino";
import config from "./config.js";

const logger = pino({level:config.logLevel});

import * as z from "zod";

const RANK_NAMES = {
	0: "private",
	1: "corporal",
	2: "sergeant",
	3: "lieutenant",
	4: "captain",
	5: "major",
	6: "colonel",
};

const soldierSchema = z
	.object({
		_id: z
			.string()
			.regex(/^\d+$/, { message: "the id must contain only numbers." })
			.length(7),
		name: z.string().min(3).max(50),
		rankValue: z.number().gte(0).lte(6).optional(),
		rankName: z.string().optional(),
		limitations: z.array(z.string()).optional(),
	})
	.strict()
	.refine(
		(data) => {
			const rankValue = data["rankValue"];
			const rankName = data["rankName"];

			if (
				rankValue !== null &&
				rankValue !== undefined &&
				rankName !== null &&
				rankName !== undefined
			)
				return RANK_NAMES[rankValue] === rankName;
			else if (rankName !== null && rankName !== undefined)
				return Object.values(RANK_NAMES).includes(rankName);
			else if (rankValue !== null && rankValue !== undefined) return true;
			return false;
		},
		{
			error: "rankName or rankValue doesn't match the requirements.",
		},
	);

function createApp(client) {
	const app = express();

	app.use(express.json());

	app.get("/health", (_req, res) => {
		return res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (req, res) => {
		try {
			await client.db("admin").command({ ping: 1 });
			return res.status(200).json({ status: "ok" });
		} catch (err) {
			logger.error(`error with ${req.path} get request.\n`, err);
			res.status(500).json({ status: "error", message: err.message });
		}
	});

	app.post("/soldiers", async (req, res) => {
		try {
			const validatedSoldier = soldierSchema.parse(req.body);

			if (validatedSoldier.limitations) {
				validatedSoldier.limitations = validatedSoldier.limitations.map(
					(limitation) => limitation.toLowerCase(),
				);
			}

			validatedSoldier["createdAt"] = new Date();
			validatedSoldier["updatedAt"] = new Date();

			const database = await client.db("users");
			const soldiersCollection = await database.collection("soldiers");

			await soldiersCollection.insertOne(validatedSoldier);

			logger.info("post request for /soldiers endpoint was successful.");

			return res.status(201).json({
				message: `soldier was added successfully, \n${JSON.stringify(validatedSoldier)}`,
			});
		} catch (err) {
			logger.error("error with /soldiers post request.");
			if (err instanceof z.ZodError)
				return res.status(400).json({
					status: "error",
					message: `there was a problem with the soldier information given \n${err}`,
				});
			res
				.status(400)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	app.get("/soldiers/:id", async (req, res) => {
		try {
			const soldierToFind = req.params.id;

			const database = await client.db("users");
			const soldiersCollection = await database.collection("soldiers");

			const soldierInDB = await soldiersCollection.findOne({
				_id: soldierToFind,
			});

			if (soldierInDB)
				return res.status(200).json({
					message: `soldier was found ${JSON.stringify(soldierInDB)} `,
				});
			return res
				.status(404)
				.json({ status: "error", message: "soldier was not found." });
		} catch (err) {
			return res
				.status(404)
				.json({ status: "error", message: `there was a problem. \n${err}` });
		}
	});

	return app;
	
}

export default createApp;
