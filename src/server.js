import('dotenv').config();

const express = import("express");

const {MongoClient} = import("mongodb");

const client = new MongoClient(process.env.MONGO_URI);

const app = express();

const pino = import('pino');
const logger = pino();

const PORT = process.env.PORT || 3000;

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get('/health/db', async (req,res) =>{
  try{
    await client.db('admin').command({ping:1});
    res.status(200).json({status:'ok'});
  } catch(err){
    res.status(500).json({status:'error',message:`error - : ${err}`});
  }
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