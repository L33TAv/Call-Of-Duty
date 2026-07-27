import express from "express";
import { getClient } from "./db/client.js";
import errorHandler from "./middleware/errorHandler.js";
import { logger, loggerMiddleware } from "./middleware/logger.js";
import { requestId } from "./middleware/requestId.js";
import soldiersRouter from "./routes/soldiers.js";

export function createApp() {
	const app = express();

	app.use(requestId);

	app.use((req, _res, next) => {
		req.log = logger.child({ reqId: req.id });
		next();
	});

	app.use(express.json());

	app.use(loggerMiddleware);

	app.use("/soldiers", soldiersRouter);

	app.use("/duties", dutyRoute);

	app.get("/health", (_req, res) => {
		return res.status(200).json({ status: "ok" });
	});

	app.get("/health/db", async (req, res) => {
		try {
			const client = await getClient();
			await client.db("admin").command({ ping: 1 });
			return res.status(200).json({ status: "ok" });
		} catch (err) {
			req.log.error(
				{ url: req.originalUrl, method: req.method, err },
				`An error occurred when checking db health.`,
			);
			res
				.status(500)
				.json({ status: "error", message: "Internal server error" });
		}
	});

	app.use(errorHandler);

	return app;
}
