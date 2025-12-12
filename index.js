const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const purchasedCollection = db.collection('purchased');

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

    app.get('/models/:id', async (req, res) => {
      const id = req.params.id;
      const query = new ObjectId(id);
      const result = await modelsCollection.findOne(query);
      res.send(result);
    })

    app.post('/models', async (req, res) => {
      const newModel = req.body;
      const result = await modelsCollection.insertOne(newModel);
      res.send(result);
    })

    app.patch('/models/:id', async (req, res) => {
      const id = req.params.id;
      const query = new ObjectId(id);
      const result = await modelsCollection.updateOne({ _id: query }, { $inc: { purchased: 1 } });
      res.send(result);
    })

    app.patch('/update-model/:id', async (req, res) => {
      const id = req.params.id;
      const updatedModel = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updatedModel.name,
          framework: updatedModel.framework,
          useCase: updatedModel.useCase,
          dataset: updatedModel.dataset,
          description: updatedModel.description,
          image: updatedModel.image,
        }
      }
      const result = await modelsCollection.updateOne(query, update);
      res.send(result);
    })


    // purchase related APIs
    app.get('/purchased', async (req, res) => {
      const cursor = purchasedCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/purchased/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      const query = { modelId: new ObjectId(id), purchasedBy: email };
      const result = await purchasedCollection.findOne(query);
      res.send(result);
    })

    app.post('/purchased', async (req, res) => {
      const newPurchased = req.body;
      newPurchased.modelId = new ObjectId(newPurchased.modelId);
      const result = await purchasedCollection.insertOne(newPurchased);
      res.send(result);
    })


    // models + purchased collection joined API
    app.get('/models-purchased-joined', async (req, res) => {
      const pipeline = [
        {
          $lookup: {
            from: 'models',
            localField: "modelId",
            foreignField: "_id",
            as: "modelDetails"
          }
        },
        { $unwind: '$modelDetails' }
      ]

      const cursor = purchasedCollection.aggregate(pipeline);
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete("/models/:id", async (req, res) => {
      const session = client.startSession();
      const id = req.params.id;
      const queryForModelsCollection = { _id: new ObjectId(id) };
      const queryForPurchasedCollection = { modelId: new ObjectId(id) };

      try {
        const result = await session.withTransaction(async () => {
          const resultForModelsCollection = await modelsCollection.deleteOne(queryForModelsCollection, { session });
          const resultForPurchasedCollection = await purchasedCollection.deleteOne(queryForPurchasedCollection, { session });

          return {
            modelsDeletedCount: resultForModelsCollection.deletedCount,
            purchasedDeletedCount: resultForPurchasedCollection.deletedCount,
          }
        })

        res.send({ success: true, message: "The model is deleted from both models and purchased collection", ...result });
      }
      catch (error) {
        console.log(error);
        res.send({ success: false, message: "Delete failed" });
      }
      finally {
        await session.endSession();
      }
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