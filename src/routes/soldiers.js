import express from "express";

import * as soldiersRepository from "../db/soldiersDB.js";
import { validate } from "../middleware/validate.js";
import {
	soldierIdSchema,
	soldierLimitationSchema,
	soldierQuerySchema,
	soldierSchema,
} from "../schemas/soldiers.js";

const soldiersRouter = express.Router();

soldiersRouter.post(
	"/",
	validate({ body: soldierSchema }),
	async (req, res) => {
		const newSoldier = req.validatedBody;
		await soldiersRepository.insertOne(newSoldier);

		return res.status(201).json({
			message: newSoldier,
		});
	},
);

soldiersRouter.get(
	"/:id",
	validate({ params: soldierIdSchema }),
	async (req, res) => {
		const soldierId = { _id: req.validatedParams.id };
		const soldierInDB = await soldiersRepository.findById(soldierId);

		if (!soldierInDB) {
			return res
				.status(404)
				.json({ status: "error", message: "soldier was not found." });
		}
		return res.status(200).json(soldierInDB);
	},
);

soldiersRouter.get(
	"/",
	validate({ query: soldierQuerySchema }),
	async (req, res) => {
		const soldierQuery = req.validatedQuery;
		const filter = Object.fromEntries(
			Object.entries(soldierQuery).filter(
				([_key, value]) => value !== undefined && value !== null,
			),
		);

		const soldiersFound = await soldiersRepository.find(filter);

		return res.status(200).json(soldiersFound);
	},
);

soldiersRouter.delete(
	"/:id",
	validate({ params: soldierIdSchema }),
	async (req, res) => {
		const soldierId = { _id: req.validatedParams.id };
		const deleteResult = await soldiersRepository.deleteById(soldierId);

		if (deleteResult.deletedCount !== 1) {
			return res
				.status(404)
				.json({ status: "error", message: "soldier wasn't found" });
		}

		return res.sendStatus(204);
	},
);

soldiersRouter.patch(
	"/:id",
	validate({ params: soldierIdSchema, body: soldierQuerySchema }),
	async (req, res) => {
		const soldierId = { _id: req.validatedParams.id };
		const patchedSoldier = req.validatedBody;
		const patchResult = await soldiersRepository.updateById(
			soldierId,
			patchedSoldier,
		);

		if (patchResult.modifiedCount !== 1) {
			return res.status(404).json({
				status: "error",
				message: "soldier wasn't found or couldn't be changed",
			});
		}

		const newSoldier = await soldiersRepository.findById(soldierId);
		return res.status(200).json({ message: newSoldier });
	},
);

soldiersRouter.patch(
	"/:id/limitations",
	validate({ params: soldierIdSchema, body: soldierLimitationSchema }),
	async (req, res) => {
		const soldierId = { _id: req.validatedParams.id };
		const newLimitations = req.validatedBody;
		const patchResult = await soldiersRepository.updateLimitationsById(
			soldierId,
			newLimitations,
		);

		if (!(patchResult.modifiedCount === 1))
			return res.status(404).json({
				status: "error",
				message: "soldier wasn't found or couldn't be changed",
			});

		const newSoldier = await soldiersRepository.findById(soldierId);

		res.status(200).json({
			message: newSoldier,
		});
	},
);

export default soldiersRouter;
