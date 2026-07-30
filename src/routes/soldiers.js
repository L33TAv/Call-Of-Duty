import express from "express";
import * as z from "zod";
import soldiersRepository from "../db/soldiersDB.js";
import {soldierSchema,soldierIdSchema,soldierGetSchema} from "../schemas/soldiers.js";

function createSoldierRouter(client) {
	const router = express.Router();

	router.post("/", async (req, res) => {
		const validatedSoldier = soldierSchema.parse(req.body);

		const soldiersCollection = soldiersRepository(client);

		await soldiersCollection.insertOne(validatedSoldier);

		return res.status(201).json({
			message: validatedSoldier,
		});
	});

	router.get("/:id", async (req, res) => {
		const soldierToFind = soldierIdSchema.parse({ _id: req.params.id });

		const soldiersCollection = soldiersRepository(client);

		const soldierInDB = await soldiersCollection.findById(soldierToFind);

		if (soldierInDB) {
			return res.status(200).json(soldierInDB);
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

		const soldierCollection = soldiersRepository(client);
		const soldiersFound = await soldierCollection.find(filter);

		return res.status(200).json(soldiersFound);
	});

	router.delete("/:id", async (req, res) => {
		const validatedSoldierId = soldierIdSchema.parse({ _id: req.params.id });

		const soldierCollection = soldiersRepository(client);

		const deleteResponse =
			await soldierCollection.deleteById(validatedSoldierId);

		if (deleteResponse.deletedCount === 1) return res.sendStatus(204);

		return res
			.status(404)
			.json({ status: "error", message: "soldier wasn't found" });
	});


	
	return router;
}

export default createSoldierRouter;
