import dotenv from "dotenv";

import { MongoClient } from "mongodb";

import { pino } from "pino";

import createApp from "./app.js";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

const PORT = process.env.PORT || 3000;

const logger = pino({
	level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.DEFAULT_PINO_LEVEL || 'info'), 
});

const app = createApp(client);

async function start() {
	await client.connect();

	const server = app.listen(PORT, () => {
		logger.info(`Server is running on port ${PORT}`);
	});

	server.on("close", async () => {
		await client.close();
		logger.info("server was closed");
	});
}

start();
