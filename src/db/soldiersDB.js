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
	const { limitations, rankValue, rankName, page, limit, ...rest } = filter;

	const mongoFilter = {
		...rest,
		...(limitations !== undefined
			? { limitations: { $all: limitations } }
			: {}),
		...(rankValue !== undefined ? { "rank.value": rankValue } : {}),
		...(rankName !== undefined ? { "rank.name": rankName } : {}),
	};

	return soldiersCollection()
		.find(mongoFilter)
		.skip((page - 1) * limit)
		.limit(limit)
		.toArray();
}

export async function deleteById(id) {
	return soldiersCollection().deleteOne({ _id: id });
}

export async function updateById(id, updateProperties) {
	updateProperties.updatedAt = new Date();
	return soldiersCollection().updateOne(
		{ _id: id },
		{ $set: updateProperties },
	);
}

export async function updateLimitationsById(id, limitations) {
	return soldiersCollection().updateOne(
		{ _id: id },
		{
			$addToSet: { limitations: { $each: limitations } },
			$set: { updatedAt: new Date() },
		},
	);
}
