import { pino } from "pino";
import config from "../config.js";

const pinoLogger = pino({ level: config.logLevel });
const logger = (req, res, next) => {
	res.on("finish", () => {
		if (res.statusCode < 400) {
			pinoLogger.info(
				`request for ${req.originalUrl} ${req.method} endpoint was successful.`,
			);
		}
	});

	next();

	return;
};

export { logger, pinoLogger };
