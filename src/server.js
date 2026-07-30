import { MongoClient } from "mongodb";
import createApp from "./app.js";
import config from "./config.js";
import { logger } from "./middleware/logger.js";

const client = new MongoClient(config.mongoURI);

const PORT = config.port;

async function start() {
		await client.connect();

		const app = createApp(client);

		const server = app.listen(PORT, () => {
			 logger.info(`Server is running on port ${PORT}`);
		});

	server.on("close", async () => {
		await client.close();
		logger.info("MongoDB connection closed");
	});
}

start();
