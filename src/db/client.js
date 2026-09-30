import { MongoClient } from "mongodb";
import config from "../config.js";

let client;
let db;

export async function connectClient() {
	client = new MongoClient(config.mongoURI);
	await client.connect();

	return client;
}

export const getClient = async () => {
	if (!client) client = await connectClient();
	return client;
};

export const getDb = () => {
	if (!db) db = client.db(config.db);
	return db;
};

export const closeDb = async () => {
	if (client) {
		await client.close();
		client = undefined;
		db = undefined;
	}
};
