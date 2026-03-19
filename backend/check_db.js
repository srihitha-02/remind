const sequelize = require('./config/db');
const Task = require('./models/Task');
const User = require('./models/User');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const users = await User.findAll();
        console.log('Users:', users.map(u => ({ id: u.id, email: u.email })));

        const tasks = await Task.findAll();
        console.log('Total Tasks:', tasks.length);
        console.log('Tasks:', tasks.map(t => ({ id: t.id, userId: t.userId, title: t.title, date: t.date })));

    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

check();
