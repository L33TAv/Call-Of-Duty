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
	const {
		name,
		limitations,
		rankValue,
		sortBy,
		sortOrder,
		rankName,
		page,
		limit,
		...rest
	} = filter;

	const filteredName = name?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	const mongoFilter = {
		...rest,
		...(filteredName !== undefined
			? { name: { $regex: filteredName, $options: "i" } }
			: {}),
		...(limitations !== undefined
			? { limitations: { $all: limitations } }
			: {}),
		...(rankValue !== undefined ? { "rank.value": rankValue } : {}),
		...(rankName !== undefined ? { "rank.name": rankName } : {}),
	};

	const sort = {};

	if (sortBy) {
		sort[sortBy] = sortOrder === "desc" ? -1 : 1;
	}

	if (sortBy !== "_id") {
		sort._id = 1;
	}

	return soldiersCollection()
		.find(mongoFilter, { collation: { locale: "en", strength: 2 } })
		.sort(sort)
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
