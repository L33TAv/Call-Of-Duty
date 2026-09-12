const config = {
	port: process.env.PORT || 3000,
	logLevel:
		process.env.NODE_ENV === "test"
			? "silent"
			: process.env.LOG_LEVEL || "info",
	mongoURI: process.env.MONGO_URI,
	db: process.env.DB,
};

export default config;
