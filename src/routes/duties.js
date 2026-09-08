import express from "express";
import { ObjectId } from "mongodb";
import * as soldiersRepository from "../db/dutiesDB.js";
import { validate } from "../middleware/validate.js";

import {
	dutyScehma,
	getDutySchema,
	objectIdSchema,
	patchDutyScehma,
} from "../schemas/duties.js";

const dutiesRouter = express.Router();

dutiesRouter.post("/", validate({ body: dutyScehma }), async (req, res) => {
	const newDuty = req.validatedBody;

	await soldiersRepository.insertOne(newDuty);

	req.log.info({ newDuty }, "successfully added new duty.");

	return res.status(201).json(newDuty);
});

dutiesRouter.get("/", validate({ query: getDutySchema }), async (req, res) => {
	const dutyQuery = getDutySchema.parse({ ...req.query });

	const dutiesInDb = await soldiersRepository.find(dutyQuery);

	req.log.info({ dutyQuery }, "duty found successfully.");

	return res.status(200).json(dutiesInDb);
});

// dutiesRouter.get("/:id", async (req, res) => {
// 	objectIdSchema.parse({ _id: req.params.id });

// 	const validatedId = { _id: new ObjectId(req.params.id) };

// 	const dutyCollection = connectDutiesCollection(client);

// 	const dutyFound = await dutyCollection.findById(validatedId);

// 	if (dutyFound) {
// 		return res.status(200).json({
// 			message: `duty was found ${JSON.stringify(dutyFound)} `,
// 		});
// 	}

// 	return res
// 		.status(404)
// 		.json({ status: "error", message: "duty was not found." });
// });

// dutiesRouter.delete("/:id", async (req, res) => {
// 	objectIdSchema.parse({ _id: req.params.id });

// 	const validatedId = { _id: new ObjectId(req.params.id) };

// 	const dutyCollection = connectDutiesCollection(client);

// 	const dutyFound = await dutyCollection.findById(validatedId);

// 	if (dutyFound?.status === "scheduled")
// 		return res
// 			.status(404)
// 			.json({ status: "error", message: "scheduled duty can't be deleted" });

// 	const deleteResponse = await dutyCollection.deleteById(validatedId);

// 	if (!deleteResponse.deletedCount)
// 		return res
// 			.status(404)
// 			.json({ status: "error", message: "duty wasn't found." });

// 	return res.sendStatus(204);
// });

// dutiesRouter.patch("/:id", async (req, res) => {
// 	objectIdSchema.parse({ _id: req.params.id });

// 	const validatedId = { _id: new ObjectId(req.params.id) };

// 	const dutyCollection = connectDutiesCollection(client);

// 	const dutyFound = await dutyCollection.findById(validatedId);

// 	if (dutyFound?.status === "scheduled")
// 		return res
// 			.status(404)
// 			.json({ status: "error", message: "scheduled duty can't be changed" });

// 	const validatedDuty = patchDutyScehma.parse(req.body);

// 	const patchResponse = await dutyCollection.updateById(
// 		validatedId,
// 		validatedDuty,
// 	);

// 	if (!(patchResponse.modifiedCount === 1))
// 		return res.status(404).json({
// 			status: "error",
// 			message: "duty wasn't found or couldn't be changed",
// 		});

// 	res.status(200).json({
// 		message: `new duty:${JSON.stringify(validatedDuty)}`,
// 	});
// });

export default dutiesRouter;
