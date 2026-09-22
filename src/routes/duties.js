import express from "express";
import * as dutiesRepository from "../db/dutiesDB.js";
import { validate } from "../middleware/validate.js";

import {
	dutySchema,
	getDutySchema,
	objectIdSchema,
	patchDutySchema,
	patchTimeOrRankSchema,
} from "../schemas/duties.js";

const dutiesRouter = express.Router();

dutiesRouter.post("/", validate({ body: dutySchema }), async (req, res) => {
	const newDuty = req.validatedBody;

	await dutiesRepository.insertOne(newDuty);

	req.log.info({ newDuty }, "successfully added new duty.");

	return res.status(201).json(newDuty);
});

dutiesRouter.get("/", validate({ query: getDutySchema }), async (req, res) => {
	const dutyQuery = req.validatedQuery;

	const dutiesInDb = await dutiesRepository.find(dutyQuery);

	req.log.info({ dutyQuery }, "duty found successfully.");

	return res.status(200).json(dutiesInDb);
});

dutiesRouter.get(
	"/:id",
	validate({ params: objectIdSchema }),
	async (req, res) => {
		const dutyId = req.validatedParams.id;

		const dutyFound = await dutiesRepository.findById(dutyId);

		if (!dutyFound) {
			req.log.warn({ dutyId }, "request failed. duty id wasn't found.");

			return res
				.status(404)
				.json({ status: "error", message: "duty was not found." });
		}

		req.log.info({ dutyFound }, "duty found successfully.");

		return res.status(200).json(dutyFound);
	},
);

dutiesRouter.delete(
	"/:id",
	validate({ params: objectIdSchema }),
	async (req, res) => {
		const dutyId = req.validatedParams.id;

		const deleteResponse = await dutiesRepository.deleteById(dutyId);

		if (deleteResponse.deletedCount) {
			req.log.info({ dutyId }, "duty deleted successfully.");

			return res.sendStatus(204);
		}

		const existingDuty = await dutiesRepository.findById(dutyId);

		if (existingDuty?.status === "scheduled") {
			req.log.warn({ dutyId }, "delete request failed. duty was scheduled.");

			return res
				.status(409)
				.json({ status: "error", message: "scheduled duty can't be deleted." });
		}

		req.log.warn({ dutyId }, "request failed. duty id wasn't found.");

		return res
			.status(404)
			.json({ status: "error", message: "duty wasn't found." });
	},
);

dutiesRouter.patch(
	"/:id",
	validate({ params: objectIdSchema, body: patchDutySchema }),
	async (req, res, next) => {
		const dutyId = req.validatedParams.id;
		const patchedDuty = req.validatedBody;

		const dutyFound = await dutiesRepository.findById(dutyId);

		if (!dutyFound) {
			req.log.warn({ dutyId }, "patch request failed. duty wasn't found.");

			return res.status(404).json({
				status: "error",
				message: "duty wasn't found.",
			});
		}

		if (dutyFound.status === "scheduled") {
			req.log.warn({ dutyId }, "patch request failed. duty was scheduled.");

			return res
				.status(409)
				.json({ status: "error", message: "scheduled duty can't be changed." });
		}

		const mergedData = {
			startTime: dutyFound.startTime,
			endTime: dutyFound.endTime,
			minRank: dutyFound.minRank,
			maxRank: dutyFound.maxRank,
			...patchedDuty,
		};

		const additionalValidation = patchTimeOrRankSchema.safeParse(mergedData);

		if (!additionalValidation.success) {
			req.log.warn(
				{ dutyId, errors: additionalValidation.error.issues },
				"cross-field validation failed.",
			);

			return next(additionalValidation.error);
		}

		const updatedDuty = await dutiesRepository.updateById(dutyId, patchedDuty);

		if (!updatedDuty) {
			req.log.warn({ dutyId }, "patch request failed. duty can't be changed.");

			return res.status(404).json({
				status: "error",
				message: "duty couldn't be changed.",
			});
		}

		req.log.info({ dutyId, updatedDuty }, "duty was patched successfully.");

		return res.status(200).json(updatedDuty);
	},
);

export default dutiesRouter;
