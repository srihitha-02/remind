const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// Start notification scheduler
const { startNotificationScheduler } = require('./services/notificationService');

// Sync database and start server
sequelize.sync({ alter: true })
    .then(() => {
        console.log('PostgreSQL connected and tables synced');
        startNotificationScheduler();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });
