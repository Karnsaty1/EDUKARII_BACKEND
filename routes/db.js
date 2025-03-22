const { MongoClient } = require('mongodb');
const userName = encodeURIComponent(process.env.MONGO_USERNAME);
const password = encodeURIComponent(process.env.MONGO_PASSCODE);
const db_name = process.env.MONGO_DB;

let db_1;

const connectDB = async () => {
    try {
        if (!db_1) {  // Avoid reconnecting
            const client = new MongoClient(process.env.MONGO_URL);
            await client.connect();
            db_1 = client.db(db_name);
            console.log('Connected to MongoDB 🌍!!!');
        }
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
    }
};

const getDb = (collectionName) => {
    if (!db_1) {
        throw new Error("Database not connected! Call connectDB first.");
    }
    return db_1.collection(collectionName);
};

module.exports = { connectDB, getDb };
