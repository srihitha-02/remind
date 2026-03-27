const sequelize = require('./config/db');
const Task = require('./models/Task');
const fs = require('fs');

async function dump() {
    try {
        await sequelize.authenticate();
        const tasks = await Task.findAll();
        fs.writeFileSync('tasks_dump.txt', JSON.stringify(tasks, null, 2));
    } catch (error) {
        fs.writeFileSync('tasks_dump.txt', 'Error: ' + error.message);
    } finally {
        await sequelize.close();
    }
}
dump();
