export default function connectSoldiersCollection(mongoClient) {
	const collection = mongoClient.db("users").collection("soldiers");

	return {
		async insertOne(soldier) {
			return collection.insertOne(soldier);
		},
		async findById(id) {
			return collection.findOne({ _id: id });
		},
		async find(limitation = {}) {
			return collection.find(limitation).toArray();
		},
		async deleteById(idObject) {
			return collection.deleteOne(idObject);
		},
	};
}
