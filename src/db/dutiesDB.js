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

export async function find(filter = {}) {
	const mongoFilter = { ...filter };

	if (mongoFilter.constraints)
		mongoFilter.constraints = { $all: mongoFilter.constraints };

	return dutiesCollection().find(mongoFilter).toArray();
}

export async function findById(id = {}) {
	return dutiesCollection().findOne({ _id: new ObjectId(id) });
}

export async function deleteById(id) {
	return dutiesCollection().deleteOne({ _id: new ObjectId(id) });
}

export async function updateById(id, updatedProperties) {
	updatedProperties.updatedAt = new Date();

	return dutiesCollection().updateOne(
		{ _id: new ObjectId(id) },
		{ $set: updatedProperties },
	);
}
