import express from 'express';

const app = express();

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

export default app;