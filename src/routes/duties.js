import express from "express";
import * as dutiesRepository from "../db/dutiesDB.js";
import { validate } from "../middleware/validate.js";

import {
	dutyScehma,
	getDutySchema,
	objectIdSchema,
	patchDutyScehma,
	patchTimeOrRankSchema,
} from "../schemas/duties.js";

const dutiesRouter = express.Router();

dutiesRouter.post("/", validate({ body: dutyScehma }), async (req, res) => {
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

		const dutyFound = await dutiesRepository.findById(dutyId);

		if (dutyFound?.status === "scheduled") {
			req.log.warn({ dutyId }, "delete request failed. duty was scheduled.");

			return res
				.status(409)
				.json({ status: "error", message: "scheduled duty can't be deleted." });
		}

		const deleteResponse = await dutiesRepository.deleteById(dutyId);

		if (!deleteResponse.deletedCount) {
			req.log.warn({ dutyId }, "request failed. duty id wasn't found.");

			return res
				.status(404)
				.json({ status: "error", message: "duty wasn't found." });
		}
		req.log.info({ dutyFound }, "duty deleted successfully.");

		return res.sendStatus(204);
	},
);

dutiesRouter.patch(
	"/:id",
	validate({ params: objectIdSchema, body: patchDutyScehma }),
	async (req, res) => {
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

		patchTimeOrRankSchema.parse({
			startTime: dutyFound.startTime.toISOString(),
			endTime: dutyFound.endTime.toISOString(),
			minRank: dutyFound.minRank,
			maxRank: dutyFound.maxRank,
			...patchedDuty,
		});

		const patchResult = await dutiesRepository.updateById(dutyId, patchedDuty);

		if (!patchResult.modifiedCount) {
			req.log.warn({ dutyId }, "patch request failed. duty can't be changed.");

			return res.status(404).json({
				status: "error",
				message: "duty couldn't be changed.",
			});
		}

		req.log.info({ dutyId, patchedDuty }, "duty was patched successfully.");

		const newDuty = await dutiesRepository.findById(dutyId);

		return res.status(200).json(newDuty);
	},
);

export default dutiesRouter;
