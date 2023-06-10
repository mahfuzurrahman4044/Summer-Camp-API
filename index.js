const express = require('express')
const app = express()
const cors = require("cors")
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.83ramik.mongodb.net/?retryWrites=true&w=majority`;
// console.log(process.env.DB_User, process.env.DB_Pass);

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const classesCollection = client.db("summer-camp").collection("classes");
        const instructorsCollection = client.db("summer-camp").collection("instructors");
        const selectedClassCollection = client.db("summer-camp").collection("selectedClass");

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        app.get("/classes", async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result);
        })

        app.get("/instructors", async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
        })

        app.post("/selectedClass", async (req, res) => {
            const items = req.body;
            // console.log(items);
            const result = await selectedClassCollection.insertOne(items);
            res.send(result);
        })

        app.get("/selectedClass", async (req, res) => {
            const result = await selectedClassCollection.find().toArray();
            res.send(result);
        })

        app.get("/uniqueClass/:email", async (req, res) => {
            const result = await selectedClassCollection.find({ email: req.params.email }).toArray();
            res.send(result)
        })

        // app.get('/selectedClass', async (req, res) => {
        //     const email = req.query.email;

        //     if (!email) {
        //         res.send([]);
        //     }

        //     const query = { email: email };
        //     const result = await selectedClassCollection.find(query).toArray();
        //     res.send(result);
        // });

        app.delete("/selectedClass/:id", async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const result = await selectedClassCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        })

        app.put("/selectedClass/:id", async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) }

            const paidClass = {
                $set: {
                    paymentStatus: "Paid"
                }
            }
            const result = await selectedClassCollection.updateOne(filter, paidClass);
            res.send(result);
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Summer Camp')
})

app.listen(port, () => {
    console.log(`Summer Camp is running on port ${port}`)
})

