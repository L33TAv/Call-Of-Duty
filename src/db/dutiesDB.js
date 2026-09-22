import { ObjectId } from "mongodb";
import { getDb } from "./client.js";

export const dutiesCollection = () => {
	return getDb().collection("duties");
};

export async function insertOne(duty) {
	duty.soldiers = [];
	duty.status = "unscheduled";
	duty.statusHistory = [{ status: "unscheduled", date: new Date() }];
	duty.createdAt = new Date();
	duty.updatedAt = new Date();
	return dutiesCollection().insertOne(duty);
}

