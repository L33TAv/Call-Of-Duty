import { MongoClient } from "mongodb";
import createApp from "./app.js";
import config from "./config.js";
import { pinoLogger } from "./middleware/logger.js";

const client = new MongoClient(config.mongoURI);

const PORT = config.port;

async function start() {
	try {
		await client.connect();

		const app = createApp(client);

		const server = app.listen(PORT, () => {
			pinoLogger.info(`Server is running on port ${PORT}`);
		});

		process.on("SIGTERM", () => shutdown("SIGTERM", server));
		process.on("SIGINT", () => shutdown("SIGINT", server));
	} catch (err) {
		pinoLogger.error("Failed to start server:", err);
		process.exit(1);
	}
}

async function shutdown(signal, server) {
	try {
		pinoLogger.info(`${signal} received. Shutting down gracefully...`);

		await new Promise((resolve, reject) => {
			server.close((err) => {
				if (err) return reject(err);
				pinoLogger.info("HTTP server closed");
				resolve();
			});
		});

		await client.close();
		pinoLogger.info("MongoDB connection closed");

		process.exit(0);
	} catch (err) {
		pinoLogger.error("Error during shutdown:", err);
		process.exit(1);
	}
}

start();
