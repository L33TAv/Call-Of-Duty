const express = require("express");

const {MongoClient} = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);

const app = express();

const pino = require('pino');
const logger = pino();

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

async function start(){

  await client.connect();

  const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });

  server.on('close', async () => {
    await client.close();
    logger.info('server was closed');
  });

}

start();