import express from "express";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import config from "../config.js";

import connectDutiesCollection from "../db/dutiesDB.js";

import {
	dutyScehma,
	getDutySchema,
	objectIdSchema,
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

	router.get("/:id", async (req, res) => {
		objectIdSchema.parse({ _id: req.params.id });

		const validatedId = { _id: new ObjectId(req.params.id) };

		const dutyCollection = connectDutiesCollection(client);

		const dutyFound = await dutyCollection.findById(validatedId);

		if (dutyFound) {
			return res.status(200).json({
				message: `duty was found ${JSON.stringify(dutyFound)} `,
			});
		}

		return res
			.status(404)
			.json({ status: "error", message: "duty was not found." });
	});

	router.delete("/:id", async (req, res) => {
		objectIdSchema.parse({ _id: req.params.id });

		const validatedId = { _id: new ObjectId(req.params.id) };

		const dutyCollection = connectDutiesCollection(client);

		const dutyFound = await dutyCollection.findById(validatedId);

		if (dutyFound?.status === "scheduled")
			return res
				.status(404)
				.json({ status: "error", message: "scheduled duty can't be deleted" });

		const deleteResponse = await dutyCollection.deleteById(validatedId);

		if (!deleteResponse.deletedCount)
			return res
				.status(404)
				.json({ status: "error", message: "duty wasn't found." });

		return res.sendStatus(204);
	});

	return router;
}
export default createDutiesRouter;
