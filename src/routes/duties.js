import express from "express";
import { pino } from "pino";
import * as z from "zod";
import config from "../config.js";

import connectDutiesCollection from "../db/dutiesDB.js";

import {
	dutyScehma,
	GeoJsonPointSchema,
	getDutySchema,
} from "../schemas/duties.js";

const logger = pino({ level: config.logLevel });

function createDutiesRouter(client) {
	const router = express.Router();

	router.post("/", async (req, res) => {
		let validatedDuty = dutyScehma.parse(req.body);

		if (new Date(validatedDuty.startTime) < new Date()) {
			throw new Error("start time must be in the future");
		}

		validatedDuty = {
			...validatedDuty,
			soldiers: [],
			status: "unscheduled",
			statusHistory: ["unscheduled", new Date()],
		};

		const dutyCollection = connectDutiesCollection(client);

		await dutyCollection.insertOne(validatedDuty);

		logger.info(`request for ${req.path} post endpoint was successful.`);

		return res.status(201).json({
			message: `duty was added successfully, \n${JSON.stringify(validatedDuty)}`,
		});
	});

	router.get("/", async (req, res) => {
		const validatedSearch = getDutySchema.parse({ ...req.query });

		const dutyCollection = connectDutiesCollection(client);

		const dutiesFound = await dutyCollection.find(validatedSearch);

		return res.status(200).json(dutiesFound);
	});

	return router;
}
export default createDutiesRouter;
