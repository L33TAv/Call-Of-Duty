import express from "express";
import { connectClient } from "./db/client.js";
import errorHandler from "./middleware/errorHandler.js";
import { logger, loggerMiddleware } from "./middleware/logger.js";
import createSoldierRouter from "./routes/soldiers.js";

function createApp() {
	const app = express();

	app.use(express.json());

	app.use(loggerMiddleware);

	app.use("/soldiers", createSoldierRouter());

	app.get("/health", (_req, res) => {
		return res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (req, res) => {
		try {
			const client = await connectClient();
			await client.db("admin").command({ ping: 1 });
			return res.status(200).json({ status: "ok" });
		} catch (err) {
			logger.error(
				{ url: req.originalUrl, method: req.method, err: err },
				`Error with the request.`,
			);
			res
				.status(500)
				.json({ status: "error", message: "Internal server error" });
		}
	});

	app.use(errorHandler);

	return app;
}

export default createApp;
