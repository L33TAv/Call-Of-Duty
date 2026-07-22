import express from "express";
import * as z from "zod";
import connectSoldiersCollection from "../soldiersDB.js";

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
			const rankValue = data.rankValue;
			const rankName = data.rankName;

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

const soldierIdSchema = z.object({
	_id: z
		.string()
		.regex(/^\d+$/, { message: "the id must contain only numbers." })
		.length(7),
});

const soldierGetSchema = z
	.object({
		name: z.string().min(3).max(50).optional(),
		rankValue: z.coerce.number().gte(0).lte(6).optional(),
		rankName: z.string().optional(),
		limitations: z.array(z.string()).optional(),
	})
	.strict()
	.refine(
		(data) => {
			const rankValue = data.rankValue;
			const rankName = data.rankName;

			if (
				rankValue !== null &&
				rankValue !== undefined &&
				rankName !== null &&
				rankName !== undefined
			)
				return RANK_NAMES[rankValue] === rankName;
			else if (rankName !== null && rankName !== undefined)
				return Object.values(RANK_NAMES).includes(rankName);
			return true;
		},
		{
			error: "rankName or rankValue doesn't match the requirements.",
		},
	);

const soldierLimitationSchema = z
	.object({
		limitations: z.array(z.string()),
	})
	.strict();

function createSoldierRouter(client) {
	const router = express.Router();

	router.post("/", async (req, res) => {
		const validatedSoldier = soldierSchema.parse(req.body);

		if (validatedSoldier.limitations) {
			validatedSoldier.limitations = validatedSoldier.limitations.map(
				(limitation) => limitation.toLowerCase(),
			);
		}

		validatedSoldier.createdAt = new Date();
		validatedSoldier.updatedAt = new Date();

		const soldiersCollection = connectSoldiersCollection(client);

		await soldiersCollection.insertOne(validatedSoldier);

		return res.status(201).json({
			message: `soldier was added successfully, \n${JSON.stringify(validatedSoldier)}`,
		});
	});

	router.get("/:id", async (req, res) => {
		const soldierToFind = soldierIdSchema.parse({ _id: req.params.id });

		const soldiersCollection = connectSoldiersCollection(client);

		const soldierInDB = await soldiersCollection.findById(soldierToFind);

		if (soldierInDB) {
			return res.status(200).json({
				message: `soldier was found ${JSON.stringify(soldierInDB)} `,
			});
		}

		return res
			.status(404)
			.json({ status: "error", message: "soldier was not found." });
	});

	router.get("/", async (req, res) => {
		let limitations = req.query.limitations
			?.split(",")
			?.filter((item) => item.trim() !== "");
		if (limitations?.length === 0) limitations = undefined;

		const validatedSearch = soldierGetSchema.parse({
			...req.query,
			limitations,
		});

		const filter = Object.fromEntries(
			Object.entries(validatedSearch).filter(
				([_key, value]) => value !== undefined && value !== null,
			),
		);

		const soldierCollection = connectSoldiersCollection(client);
		const soldiersFound = await soldierCollection.find(filter);

		return res.status(200).json(soldiersFound);
	});

	router.delete("/:id", async (req, res) => {
		const validatedSoldierId = soldierIdSchema.parse({ _id: req.params.id });

		const soldierCollection = connectSoldiersCollection(client);

		const deleteResponse =
			await soldierCollection.deleteById(validatedSoldierId);

		if (!deleteResponse.deletedCount)
			return res
				.status(404)
				.json({ status: "error", message: "soldier wasn't found" });

		return res.sendStatus(204);
	});

	router.patch("/:id", async (req, res) => {
		const validatedSoldierId = soldierIdSchema.parse({ _id: req.params.id });

		const validatedSoldier = soldierGetSchema.parse(req.body);

		validatedSoldier.updatedAt = new Date();

		const soldierCollection = connectSoldiersCollection(client);

		const patchResponse = await soldierCollection.updateById(
			validatedSoldierId,
			validatedSoldier,
		);

		if (!(patchResponse.modifiedCount === 1))
			return res.status(404).json({
				status: "error",
				message: "soldier wasn't found or couldn't be changed",
			});

		res
			.status(200)
			.json({ message: `new soldier:${JSON.stringify(validatedSoldier)}` });
	});

	router.patch("/:id/limitations", async (req, res) => {
		const validatedSoldierId = soldierIdSchema.parse({ _id: req.params.id });
		const newLimitations = soldierLimitationSchema.parse(req.body);
		const updatedAt = { updatedAt: new Date() };

		const soldierCollection = connectSoldiersCollection(client);

		const patchResponse = await soldierCollection.updateLimitationsById(
			validatedSoldierId,
			newLimitations,
			updatedAt,
		);

		if (!(patchResponse.modifiedCount === 1))
			return res.status(404).json({
				status: "error",
				message: "soldier wasn't found or couldn't be changed",
			});

		res.status(200).json({
			message: `new limitations:${JSON.stringify(newLimitations.limitations)}`,
		});
	});

	return router;
}

export default createSoldierRouter;
