import express from "express";
import { pino } from "pino";
import config from "./config.js";

const logger = pino({level:config.logLevel});

import * as z from "zod";

const RANK_NAMES = {
	0 : "private",
	1 : "corporal",
	2 : "sergeant",
	3 : "lieutenant",
	4 : "captain",
	5 : "major",
	6 : "colonel",
}

const soliderSchema = z.object({
	_id : z.string().regex(/^\d+$/, {message: "the id must contain only numbers."}).length(7),
	name :  z.string().min(3).max(50),
	rankValue : z.number().gte(0).lte(6).optional(),
	rankName : z.string().optional(),
	limitations: z.array(z.string()).optional(),
}).strict().refine((data) =>{
	const rankValue = data["rankValue"];
	const rankName = data["rankName"];
	
	if ((rankValue !== null && rankValue !== undefined) && (rankName !== null && rankName !== undefined))
		return RANK_NAMES[rankValue] === rankName;
	else if (rankName !== null && rankName !== undefined)
		return Object.values(RANK_NAMES).includes(rankName);
	return true
},{
	error:"rankName or rankValue doesn't match the requirements."
});

function createApp(client) {
	const app = express();

	app.get("/health", (_req, res) => {
		res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (req, res) => {
		try {
			await client.db("admin").command({ ping: 1 });
			res.status(200).json({ status: "ok" });
		} catch (err) {
			logger.error(`error with ${req.path} get request.\n`, err);
			res.status(500).json({ status: "error", message: err.message });
		}
	});

	return app;
}

export default createApp;
