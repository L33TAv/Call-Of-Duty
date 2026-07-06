import config from "./config.js";

import express from "express";

import { pino } from "pino";

const logger = pino(config.logLevel);

function createApp(client) {
	const app = express();

	app.get("/health", (_req, res) => {
		res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (_req, res) => {
		try {
			await client.db("admin").command({ ping: 1 });
			res.status(200).json({ status: "ok" });
		} catch (err) {
			logger.error("error with /health/db get request.")
			res.status(500).json({ status: "error", message: `error - : ${err}` });
		}
	});

	return app;
}

export default createApp;
