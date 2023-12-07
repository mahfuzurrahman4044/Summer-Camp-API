const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.Payment_Secreat_Key);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.Access_Token_Secreat, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.83ramik.mongodb.net/?retryWrites=true&w=majority`;
// console.log(process.env.DB_User, process.env.DB_Pass, process.env.Access_Token_Secreat);

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const classesCollection = client.db("summer-camp").collection("classes");
    const instructorsCollection = client
      .db("summer-camp")
      .collection("instructors");
    const selectedClassCollection = client
      .db("summer-camp")
      .collection("selectedClass");
    const usersCollection = client.db("summer-camp").collection("users");
    const paymentsCollection = client.db("summer-camp").collection("payments");

    app.post("/jwt", (req, res) => {
      //   console.log(req.body);
      const token = jwt.sign(req.body, process.env.Access_Token_Secreat, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ error: true });
      }
      next();
    };

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    app.post("/insertClass", async (req, res) => {
      const insertedClass = req.body;
      // console.log(insertedClass);
      const result = classesCollection.insertOne(insertedClass);
      res.send(result);
    });

    app.get("/classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.get("/classes/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await classesCollection
          .find({ instructorEmail: email })
          .toArray();
        res.json(result);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.put("/classes/approved/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const find = await classesCollection.findOne({ _id: new ObjectId(id) });
      const update = {
        $set: { status: "Approved" },
      };
      const result = await classesCollection.updateOne(find, update);
      res.send(result);
    });

    app.put("/classes/deny/:id", async (req, res) => {
      const id = req.params.id;
      //   console.log(id);
      const find = await classesCollection.findOne({ _id: new ObjectId(id) });
      const update = {
        $set: { status: "Deny" },
      };
      const result = await classesCollection.updateOne(find, update);
      res.send(result);
    });

    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    app.get("/selectedInstructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      // console.log(email);

      if (!req.decoded || req.decoded.email !== email) {
        res.send({ instructor: false });
        return;
      }

      const user = await usersCollection.findOne({ email: email });
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.post("/selectedClass", async (req, res) => {
      const items = req.body;
      // console.log(items);
      const result = await selectedClassCollection.insertOne(items);
      res.send(result);
    });

    app.get("/selectedClass", verifyJWT, async (req, res) => {
      const result = await selectedClassCollection.find().toArray();
      res.send(result);
    });

    app.get("/uniqueClass/:email", verifyJWT, async (req, res) => {
      if (!req.params.email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;

      if (req.params.email !== decodedEmail) {
        return res.status(403).send({ error: true });
      }

      const result = await selectedClassCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
    });

    app.delete("/selectedClass/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const result = await selectedClassCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      //   console.log(user);

      const existingUser = await usersCollection.findOne({ email: user.email });
      //   console.log(existingUser);
      if (existingUser) {
        return res.send({ message: "User already exist" });
      }

      const result = await usersCollection.insertOne(user);
      //   console.log(result);
      res.send(result);
    });

    app.get("/allUsers", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/allUsers/:id", async (req, res) => {
      // console.log(req.params.id);
      const filter = { _id: new ObjectId(req.params.id) };
      const update = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, update);
      res.send(result);
    });

    app.put("/allUsers/:id", async (req, res) => {
      // console.log(req.params.id);

      const filter = { _id: new ObjectId(req.params.id) };
      const update = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, update);
      res.send(result);
    });

    app.get("/allUsers/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      // console.log(email);

      if (!req.decoded || req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const user = await usersCollection.findOne({ email: email });
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const price = req.body.price;
      const amount = price * 100;
      console.log(price, amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);

      const query = {
        _id: { $in: payment.classesId.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await selectedClassCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      const result = await paymentsCollection.find({ user: email }).toArray();
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Summer Camp");
});

app.listen(port, () => {
  console.log(`Summer Camp is running on port ${port}`);
});
