import { MongoError } from "mongodb";
import { z } from "zod";
import { logger } from "./logger.js";

const errorHandler = (err, req, res, _next) => {
	logger.error(
		{ url: req.originalUrl, method: req.method, err: err },
		`Error with the request.`,
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
			message: `Validation error has occurred`,
			issues: z.prettifyError(err),
		});

	return res
		.status(500)
		.json({ status: "error", message: `Internal server error` });
};

export default errorHandler;
