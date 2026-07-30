export default function soldiersRepository(mongoClient) {
	const collection = mongoClient.db("call-of-duty").collection("soldiers");

	return {
		async insertOne(soldier) {
			soldier.createdAt = new Date();
			soldier.updatedAt = new Date();
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
	};
}
