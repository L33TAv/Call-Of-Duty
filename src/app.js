import express from "express";
import { pino } from "pino";
import config from "./config.js";
import createSoldierRouter from "./routes/soldiers.js";
import connectSoldiersCollection from "./soldiersDB.js";

const logger = pino({level:config.logLevel});

function createApp(client) {
	const app = express();
	const soldierRoute = createSoldierRouter(client);

	app.use(express.json());

	app.use("/soldiers", soldierRoute);

	app.get("/health", (_req, res) => {
		return res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (req, res) => {
		try {
			await client.db("admin").command({ ping: 1 });
			return res.status(200).json({ status: "ok" });
		} catch (err) {
			logger.error(`error with ${req.path} get request.\n`, err);
			res.status(500).json({ status: "error", message: err.message });
		}
	});

	return app;
}

export default createApp;
