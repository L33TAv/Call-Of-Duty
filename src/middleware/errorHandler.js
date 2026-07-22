import { MongoError } from "mongodb";
import { z } from "zod";
import { pinoLogger } from "./logger.js";

const errorHandler = (err, req, res, _next) => {
	pinoLogger.error(
		`error with ${req.originalUrl}  ${req.method} endpoint.\n`,
		err,
	);

	if (err instanceof MongoError) {
		if (err.code === 11000) {
			return res
				.status(409)
				.json({ status: "error", message: "soldier already exists" });
		}

		return res.status(503).json({ status: "error", message: "database error" });
	}

	if (err instanceof z.ZodError)
		return res.status(400).json({
			status: "error",
			message: `there was a zod error with the information given \n${err}`,
		});
        
	return res
		.status(400)
		.json({ status: "error", message: `there was an error. \n${err}` });
};

export default errorHandler;
