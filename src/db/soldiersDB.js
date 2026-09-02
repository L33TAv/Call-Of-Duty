import { getDb } from "./client.js";

export const soldiersCollection = () => {
	return getDb().collection("soldiers");
};

export async function insertOne(soldier) {
	soldier.createdAt = new Date();
	soldier.updatedAt = new Date();

	return soldiersCollection().insertOne(soldier);
}

export async function findById(id) {
	return soldiersCollection().findOne({ _id: id });
}

export async function find(filter = {}) {
	return soldiersCollection().find(filter).toArray();
}

export async function deleteById(id) {
	return soldiersCollection().deleteOne({ _id: id });
}

export async function updateById(id, newSoldier) {
	newSoldier.updatedAt = new Date();
	return soldiersCollection().updateOne({ _id: id }, { $set: newSoldier });
}

export async function updateLimitationsById(id, limitations) {
	return soldiersCollection().updateOne(
		{ _id: id },
		{
			$addToSet: { limitations: { $each: limitations.limitations } },
			$set: { updatedAt: new Date() },
		},
	);
}
