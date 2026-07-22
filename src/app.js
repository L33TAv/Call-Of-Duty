import express from "express";
import errorHandler from "./middleware/errorHandler.js";

import { logger, pinoLogger } from "./middleware/logger.js";
import createSoldierRouter from "./routes/soldiers.js";

function createApp(client) {
	const app = express();
	const soldierRoute = createSoldierRouter(client);

	app.use(express.json());

	app.use(logger);

	app.use("/soldiers", soldierRoute);

	app.get("/health", (_req, res) => {
		return res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (req, res) => {
		try {
			await client.db("admin").command({ ping: 1 });
			return res.status(200).json({ status: "ok" });
		} catch (err) {
			pinoLogger.error(
				`error with ${req.originalUrl} ${req.method} endpoint.\n`,
				err,
			);
			res.status(500).json({ status: "error", message: err.message });
		}
	});

	app.use(errorHandler);

	return app;
}

export default createApp;
