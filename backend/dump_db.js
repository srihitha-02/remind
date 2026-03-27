const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const sequelize = require('./config/db');
const Task = require('./models/Task');
const User = require('./models/User');
const fs = require('fs');

async function dump() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');

        const users = await User.findAll({ raw: true });
        const tasks = await Task.findAll({ raw: true });

        const data = {
            users: users.map(u => ({ id: u.id, email: u.email, name: u.name })),
            tasks: tasks.map(t => ({ id: t.id, userId: t.userId, title: t.title, date: t.date, createdAt: t.createdAt }))
        };

        fs.writeFileSync(path.join(__dirname, 'db_dump.json'), JSON.stringify(data, null, 2));
        console.log('Dumped to db_dump.json');
        console.log(`Total Users: ${users.length}`);
        console.log(`Total Tasks: ${tasks.length}`);

    } catch (error) {
        console.error('Error:', error);
        fs.writeFileSync(path.join(__dirname, 'db_error.txt'), error.stack);
    } finally {
        await sequelize.close();
    }
}

dump();
