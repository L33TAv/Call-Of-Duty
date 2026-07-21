export default function connectDutiesCollection(mongoClient) {
	const collection = mongoClient.db("users").collection("duties");
	
    return {
		async insertOne(duty) {
			return collection.insertOne(duty);
		},
	};
}
