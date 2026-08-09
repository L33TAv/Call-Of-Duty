import { MongoClient } from "mongodb";
import config from "../config.js";

let client;
let db;

export async function connectClient() {
	if (!client) {
		client = new MongoClient(config.mongoURI);
		await client.connect();
	}
	return client;
}

export const getDb = () => {
	if (!db) db = client.db(config.db);
	return db;
};
