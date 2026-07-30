import express from "express";
import * as z from "zod";
import soldiersRepository from "../db/soldiersDB.js";
import {soldierSchema,soldierIdSchema} from "../schemas/soldiers.js";

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


	
	return router;
}

export default createSoldierRouter;
