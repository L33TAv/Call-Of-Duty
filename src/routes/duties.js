import express from "express";
import { pino } from "pino";
import * as z from "zod";
import config from "../config.js";

import connectDutiesCollection from "../dutiesDB.js";

const logger = pino({level:config.logLevel});

const GeoJsonPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z
        .array(z.number())
        .min(2)
        .max(3)
        .refine(([lon, lat]) => lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90, {
        message: "Invalid coordinates: Longitude (-180 to 180), Latitude (-90 to 90)",
    }),
});

const dutyScehma = z.object({
    name:z.string().min(3).max(50),
    location:GeoJsonPointSchema,
    startTime: z.string().datetime(),
    endTime:z.string().datetime(),
    value:z.number().positive(),
    minRank:z.number().min(0).max(6).optional(),
    maxRank:z.number().min(0).max(6).optional(),
}).strict().refine(data => data.startTime < data.endTime,
    {message: "End time must be after the start time",
    path: ["endTime"],})

function createDutiesRouter(client){
    const router = express.Router();

    router.post("/", async (req,res) => {
        try{
            let validatedDuty = dutyScehma.parse(req.body)

            if (new Date(validatedDuty.startTime) < new Date()){
                throw new Error("start time must be in the future")
            }

            validatedDuty = {
                ...validatedDuty,
                soldiers: [],
                status: "unscheduled",
                statusHistory : ["unscheduled",new Date()]
            };

            const dutyCollection = connectDutiesCollection(client);

            await dutyCollection.insertOne(validatedDuty);

            logger.info(`request for ${req.path} post endpoint was successful.`);

			return res.status(201).json({
				message: `duty was added successfully, \n${JSON.stringify(validatedDuty)}`,
			});

        }catch(err){
            logger.error(`error with ${req.path} post request.\n`, err);
            if (err instanceof z.ZodError) {
                return res.status(400).json({
                    status: "error",
                    message: `there was a validation problem. \n${err.message}`,
                });
            }
            return res
                .status(400)
                .json({ status: "error", message: `there was a problem. \n${err}` });
        }
    });

    return router;
}
export default createDutiesRouter;