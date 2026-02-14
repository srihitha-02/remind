const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/remind-app', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected...');

        // Drop the collections
        const collections = ['users', 'tasks'];
        for (const col of collections) {
            try {
                await mongoose.connection.collection(col).drop();
                console.log(`${col} collection dropped!`);
            } catch (error) {
                if (error.code === 26) {
                    console.log(`${col} collection does not exist (already empty).`);
                } else {
                    console.error(`Error dropping ${col} collection:`, error);
                }
            }
        }

        process.exit();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

connectDB();
