export default function soldiersRepository(mongoClient) {
	const collection = mongoClient.db("call-of-duty").collection("soldiers");

	return {
		async insertOne(soldier) {
			soldier.createdAt = new Date();
			soldier.updatedAt = new Date();
			return collection.insertOne(soldier);
		},
	};
}
