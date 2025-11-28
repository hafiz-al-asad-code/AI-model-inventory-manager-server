const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oquvsp8.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res) => {
  res.send('AI model inventory manager server is running');
})

async function run() {
  try {
    await client.connect();

    const db = client.db('AImodel_db');
    const modelsCollection = db.collection('models');

    // models related APIs
    app.get('/models', async (req, res) => {
      const cursor = modelsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/latest-models', async (req, res) => {
      const cursor = modelsCollection.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/models', async (req, res) => {
      const newModel = req.body;
      const result = await modelsCollection.insertOne(newModel);
      res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  finally {

  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`AI model inventory manager server is running on port: ${port}`);
})