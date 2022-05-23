const express = require('express');
const app = express();
const { MongoClient } = require('mongodb');
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
const port = process.env.PORT || 5000;



const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@cluster0.hn6ma.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });



async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}
async function run() {
    try {
        await client.connect();
        const database = client.db("mineryLight");
        const usersCollection = database.collection("users");
        const productsCollection = database.collection("products");
        const orderCollection = database.collection('orders')
        const reviewsCollection = database.collection('reviews')

        //POST API for adding product
        app.post('/products', async (req, res) => {
            const query = req.body;
            const product = await productsCollection.insertOne(query);
            res.json(product);
        });

        //GET API for showing data to the home
        app.get('/products', async (req, res) => {
            const query = parseInt(req.query?.quantity)
            const cursor = productsCollection.find({}).limit(query);
            const product = await cursor.toArray();
            res.json(product);
        });

        app.get('/allProducts', async (req, res) => {
            const query = parseInt(req.query)
            const cursor = productsCollection.find({});
            const product = await cursor.toArray();
            res.json(product);
        });

        //POST API for user data save to the database
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollection.insertOne(user)
            res.json(result)
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin })
        })

        app.put('/users', async (req, res) => {
            const user = req.body
            const filter = { email: user.email }
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result)
        });

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'You do not have access to make admin' })
            }
        });


        //----------------------------------Buy Now Related-----------------------------------------//
        //DELETE API for admin panel
        app.delete('/allProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.json(result)
        });

        app.delete('/manageOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        });

        app.put('/manageOrder/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: 'shipped'
                }
            };
            const result = await orderCollection.updateOne(filter, updateDoc, options);
            res.json(result);

        })

        app.get('/allProducts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.json(result);
        });

        app.put('/allProducts/:id', async (req, res) => {
            const id = req.params.id;
            const update = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...update
                },
            };
            const result = await productsCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.json(result)
        });

        app.get('/orders', async (req, res) => {
            const query = parseInt(req.query)
            const cursor = orderCollection.find({});
            const order = await cursor.toArray();
            res.json(order);
        });

        //---------------------------------------------User Own Order part----------------------------------//
        app.delete('/orders/:id/:uid', async (req, res) => {
            const id = req.params.id;
            const uid = req.params.uid;
            const query = { _id: ObjectId(id), uid: uid }
            const result = await orderCollection.deleteOne(query)
            res.json(result)
        });

        //----------------------------------------------Review part----------------------------------------//
        app.post('/reviews', async(req, res)=>{
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(result);
        });
        app.get('/reviews', async(req, res)=>{
            const cursor =reviewsCollection.find({});
            const result = await cursor.toArray();
            res.json(result);
        });


    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log('This port is running on', port)
})
