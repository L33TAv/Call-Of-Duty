import express from "express";
import * as dutiesRepository from "../db/dutiesDB.js";
import { validate } from "../middleware/validate.js";

import {
	dutySchema,
	getDutySchema,
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

export default dutiesRouter;
