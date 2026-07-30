import express from "express";
import * as z from "zod";
import {soldierSchema} from "../schemas/soldiers.js";
import soldiersRepository from "../db/soldiersDB.js";

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

	
	return router;
}

export default createSoldierRouter;
