import { getDb } from "./client.js";

export const soldiersCollection = () => {
	return getDb().collection("soldiers");
};

export async function insertOne(soldier) {
	soldier.createdAt = new Date();
	soldier.updatedAt = new Date();
	return soldiersCollection().insertOne(soldier);
}

export async function findById(idObject) {
	return soldiersCollection().findOne(idObject);
}
export async function find(filter = {}) {
	return soldiersCollection().find(filter).toArray();
}
export async function deleteById(idObject) {
	return soldiersCollection().deleteOne(idObject);
}
export async function updateById(idObject, newSoldier) {
	return soldiersCollection().updateOne(idObject, { $set: newSoldier });
}
export async function updateLimitationsById(idObject, limitations, updatedAt) {
	return soldiersCollection().updateOne(idObject, {
		$addToSet: { limitations: { $each: limitations.limitations } },
		$set: updatedAt,
	});
}
