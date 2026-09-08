import { getDb } from "./client.js";

export const dutiesCollection = () => {
	return getDb().collection("duties");
};

export async function insertOne(duty) {
	duty.soldiers = [];
	duty.status = "unscheduled";
	duty.statusHistory = ["unscheduled", new Date()];
	duty.createdAt = new Date();
	duty.updatedAt = new Date();
	return dutiesCollection().insertOne(duty);
}

export async function find(filter = {}) {
	const mongoFilter = { ...filter };

	if (mongoFilter.constraints)
		mongoFilter.constraints = { $all: mongoFilter.constraints };

	if (mongoFilter.soldiers)
		mongoFilter.soldiers = { $all: mongoFilter.soldiers };

	return dutiesCollection().find(mongoFilter).toArray();
}

// export async function findById (filter = {}) {
// 		return collection.findOne(filter);
// 	}

// export async function deleteById (idObject) {
// 		return collection.deleteOne(idObject);
// 	}

// export async function updateById (idObject, newDuty) {
// 		return collection.updateOne(idObject, { $set: newDuty });
// 	}
