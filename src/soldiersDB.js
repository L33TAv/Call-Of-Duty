export default function connectSoldiersCollection(mongoClient) {
	const collection = mongoClient.db("users").collection("soldiers");

	return {
		async insertOne(soldier) {
			return collection.insertOne(soldier);
		},
		async findById(idObject) {
			return collection.findOne(idObject);
		},
		async find(filter = {}) {
			return collection.find(filter).toArray();
		},
		async deleteById(idObject) {
			return collection.deleteOne(idObject);
		},
		async updateById(idObject, newSoldier) {
			return collection.updateOne(idObject, { $set: newSoldier });
		},
		async updateLimitationsById(idObject, limitations, updatedAt) {
			return collection.updateOne(idObject, {
				$addToSet: { limitations: { $each: limitations.limitations } },
				$set: updatedAt,
			});
		},
	};
}
