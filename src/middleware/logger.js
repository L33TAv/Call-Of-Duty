import { pino } from "pino";
import config from "../config.js";

const logger  = pino({ level: config.logLevel });
const loggerMiddelware  = (req, res, next) => {
	res.on("finish", () => {
		if (res.statusCode < 400) {
			logger.info({url:req.originalUrl,method:req.method,status:res.statusCode},
				`Request was successful.`,
			);
		}
	});

	next();

	return;
};

export { logger, loggerMiddelware  };
