import createSoldierRouter from "./routes/soldiers.js";
import express from "express";
import errorHandler from "./middleware/errorHandler.js";

import { logger, loggerMiddelware } from "./middleware/logger.js";


function createApp(client) {
	const app = express();
	const soldierRoute = createSoldierRouter(client);

	app.use(express.json());

	app.use(loggerMiddelware);

	app.use("/soldiers", soldierRoute);

	app.get("/health", (_req, res) => {
		return res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (req, res) => {
		try {
			await client.db("admin").command({ ping: 1 });
			return res.status(200).json({ status: "ok" });
		} catch (err) {
			logger.error({url:req.originalUrl, method:req.method},
				`Error the with request.`,
				err,
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
