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
        const usersCollection = client.db("summer-camp").collection("users");

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

        // app.put("/selectedClass/:id", async (req, res) => {
        //     const id = req.params.id;
        //     console.log(id);
        //     const filter = { _id: new ObjectId(id) }

        //     const paidClass = {
        //         $set: {
        //             paymentStatus: "Paid"
        //         }
        //     }
        //     const result = await selectedClassCollection.updateOne(filter, paidClass);
        //     res.send(result);
        // })

        app.put("/selectedClass/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            // Get the current selected class document
            const selectedClass = await selectedClassCollection.findOne(filter);
            if (!selectedClass) {
                res.status(404).send({ message: "Selected class not found" });
                return;
            }

            // Check if the payment status is already "Paid"
            if (selectedClass.paymentStatus === "Paid") {
                res.send({ message: "Payment is already confirmed" });
                return;
            }

            const updatedClass = {
                $set: {
                    paymentStatus: "Paid"
                }
            };
            const updateResult = await selectedClassCollection.updateOne(filter, updatedClass);

            // If the update is successful, reduce the availableClasses count by 1
            if (updateResult.modifiedCount === 1) {
                const classId = selectedClass.classId;
                const classFilter = { _id: new ObjectId(classId) };

                // Decrement the availableClasses count by 1
                const decrementResult = await classesCollection.updateOne(classFilter, { $inc: { availableClasses: -1 } });

                if (decrementResult.modifiedCount === 1) {
                    res.send({ message: "Payment confirmed and available class count reduced" });
                } else {
                    res.send({ message: "Payment confirmed, but failed to update the available class count" });
                }
            } else {
                res.send({ message: "Failed to update payment confirmation" });
            }
        });

        app.post("/users", async (req, res) => {
            const user = req.body;
            // console.log(user);

            const existingUser = usersCollection.findOne({ email: user.email });
            if (existingUser) {
                return res.send({ message: "User already exist" })
            }
            const result = await usersCollection.insertOne(user);
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

