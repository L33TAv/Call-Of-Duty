import { createApp } from "./app.js";
import config from "./config.js";
import { closeDb, connectClient } from "./db/client.js";
import { logger } from "./middleware/logger.js";

const PORT = config.port;

async function start() {
	try {
		await connectClient();

		const app = createApp();

		const server = app.listen(PORT, () => {
			logger.info(`Server is running on port ${PORT}`);
		});

		process.on("SIGTERM", () => shutdown("SIGTERM", server));
		process.on("SIGINT", () => shutdown("SIGINT", server));
	} catch (err) {
		logger.error(err, "Failed to start server:");
		process.exit(1);
	}
}

async function shutdown(signal, server) {
	try {
		logger.info(`${signal} received. Shutting down gracefully...`);

		await new Promise((resolve, reject) => {
			server.close((err) => {
				if (err) return reject(err);
				logger.info("HTTP server closed");
				resolve();
			});
		});

		await closeDb();
		logger.info("MongoDB connection closed");

		process.exitCode = 0;
	} catch (err) {
		logger.error(err, "Error during shutdown:");
		process.exitCode = 1;
	}
}

start();
