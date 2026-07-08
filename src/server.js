import { MongoClient } from "mongodb";
import { pino } from "pino";
import createApp from "./app.js";
import config from "./config.js";

const client = new MongoClient(config.mongoURI);

const PORT = config.port;

const logger = pino({level:config.logLevel});

async function start() {
	await client.connect();

	const app = createApp(client);

	const server = app.listen(PORT, () => {
		logger.info(`Server is running on port ${PORT}`);
	});

	server.on("close", async () => {
		await client.close();
		logger.info("server was closed");
	});
}

start();
