import express from "express";
import * as soldiersRepository from "../db/soldiersDB.js";
import { validate } from "../middleware/validate.js";
import {
	soldierIdSchema,
	soldierLimitationSchema,
	soldierPatchSchema,
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

		req.log.info({ newSoldier }, "successfully added new soldier.");

		return res.status(201).json(newSoldier);
	},
);

soldiersRouter.get(
	"/:id",
	validate({ params: soldierIdSchema }),
	async (req, res) => {
		const soldierId = req.validatedParams.id;
		const soldierInDB = await soldiersRepository.findById(soldierId);

		if (!soldierInDB) {
			req.log.warn(
				{ soldierId: soldierId },
				"request failed. soldier id wasn't found.",
			);

			return res
				.status(404)
				.json({ status: "error", message: "soldier was not found." });
		}

		req.log.info({ soldierId }, "soldier found successfully.");

		return res.status(200).json(soldierInDB);
	},
);

soldiersRouter.get(
	"/",
	validate({ query: soldierQuerySchema }),
	async (req, res) => {
		const soldierQuery = req.validatedQuery;

		const soldiersFound = await soldiersRepository.find(soldierQuery);

		req.log.info({ soldierQuery }, "soldier found successfully.");

		return res.status(200).json(soldiersFound);
	},
);

soldiersRouter.delete(
	"/:id",
	validate({ params: soldierIdSchema }),
	async (req, res) => {
		const soldierId = req.validatedParams.id;
		const deleteResult = await soldiersRepository.deleteById(soldierId);

		if (deleteResult.deletedCount !== 1) {
			req.log.warn(
				{ soldierId },
				"delete request failed. soldier wasn't found.",
			);

			return res
				.status(404)
				.json({ status: "error", message: "soldier wasn't found" });
		}

		req.log.info(
			{ soldierId, deleteResult },
			"soldier was deleted successfully.",
		);

		return res.sendStatus(204);
	},
);

soldiersRouter.patch(
	"/:id",
	validate({ params: soldierIdSchema, body: soldierPatchSchema }),
	async (req, res) => {
		const soldierId = req.validatedParams.id;
		const patchedSoldier = req.validatedBody;
		const patchResult = await soldiersRepository.updateById(
			soldierId,
			patchedSoldier,
		);

		if (!patchResult.matchedCount) {
			req.log.warn(
				{ soldierId },
				"patch request failed. soldier wasn't found.",
			);

			return res.status(404).json({
				status: "error",
				message: "soldier wasn't found or couldn't be changed",
			});
		}

		req.log.info(
			{ soldierId, patchedSoldier },
			"soldier was patched successfully.",
		);

		const newSoldier = await soldiersRepository.findById(soldierId);
		return res.status(200).json(newSoldier);
	},
);

soldiersRouter.put(
	"/:id/limitations",
	validate({ params: soldierIdSchema, body: soldierLimitationSchema }),
	async (req, res) => {
		const soldierId = req.validatedParams.id;
		const newLimitations = req.validatedBody;
		const patchResult = await soldiersRepository.updateLimitationsById(
			soldierId,
			newLimitations,
		);

		if (!patchResult.matchedCount) {
			req.log.warn(
				{ soldierId },
				"limitations put request failed. soldier wasn't found.",
			);

			return res.status(404).json({
				status: "error",
				message: "soldier wasn't found or couldn't be changed",
			});
		}

		const updatedSoldier = await soldiersRepository.findById(soldierId);

		req.log.info(
			{ soldierId, newLimitations },
			"soldier was updated successfully.",
		);

		res.status(200).json(updatedSoldier);
	},
);

export default soldiersRouter;
