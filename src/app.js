import express from "express";
import { pino } from "pino";
import config from "./config.js";

const logger = pino(config.logLevel);

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
			res.status(500).json({ status: "error", message: `error - : ${err}` });
		}
	});

	return app;
}

export default createApp;
