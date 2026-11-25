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
	const { name, page, limit, sortBy, sortOrder, ...mongoFilter } = {
		...filter,
	};

	if (mongoFilter.constraints)
		mongoFilter.constraints = { $all: mongoFilter.constraints };

	const filteredName = name?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

	if (filteredName) {
		mongoFilter.name = { $regex: filteredName, $options: "i" };
	}

	const sort = {};

	if (sortBy) {
		sort[sortBy] = sortOrder === "desc" ? -1 : 1;
	}

	if (sortBy !== "_id") {
		sort._id = 1;
	}

	return dutiesCollection()
		.find(mongoFilter, { collation: { locale: "en", strength: 2 } })
		.sort(sort)
		.skip((page - 1) * limit)
		.limit(limit)
		.toArray();
}

export async function findById(id) {
	return dutiesCollection().findOne({ _id: new ObjectId(id) });
}

export async function deleteById(id) {
	return dutiesCollection().deleteOne({
		_id: new ObjectId(id),
		status: { $ne: "scheduled" },
	});
}

export async function updateById(id, updatedProperties) {
	updatedProperties.updatedAt = new Date();

	return dutiesCollection().findOneAndUpdate(
		{ _id: new ObjectId(id), status: { $ne: "scheduled" } },
		{ $set: updatedProperties },
		{ returnDocument: "after" },
	);
}
