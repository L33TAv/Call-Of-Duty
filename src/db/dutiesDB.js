export default function connectDutiesCollection(mongoClient) {
	const collection = mongoClient.db("users").collection("duties");

	return {
		async insertOne(duty) {
			return collection.insertOne(duty);
		},
		async find(filter = {}) {
			return collection.find(filter).toArray();
		},
		async findById(filter = {}) {
			return collection.findOne(filter);
		},
		async deleteById(idObject) {
			return collection.deleteOne(idObject);
		},
	};
}
