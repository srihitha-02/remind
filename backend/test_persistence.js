const sequelize = require('./config/db');
const Task = require('./models/Task');
const User = require('./models/User');

async function testPersistence() {
    try {
        await sequelize.authenticate();
        console.log('--- DB CONNECTION OK ---');

        const user = await User.findOne();
        if (!user) {
            console.log('No user found. Create one first.');
            return;
        }
        console.log(`Using user: ${user.email} (ID: ${user.id})`);

        const testTask = await Task.create({
            userId: user.id,
            title: 'Persistence Test Task ' + new Date().toISOString(),
            description: 'Testing if this task stays in DB',
            category: 'work',
            date: '2026-03-20',
            time: '14:00',
            completed: false
        });

        console.log('Task Created:', testTask.id);

        const found = await Task.findByPk(testTask.id);
        if (found) {
            console.log('Task Verified in DB immediately after creation.');
        } else {
            console.log('FAILED to verify task immediately.');
        }

        const allTasks = await Task.findAll({ where: { userId: user.id } });
        console.log(`Total tasks for user: ${allTasks.length}`);

    } catch (error) {
        console.error('DB ERROR:', error.message);
    } finally {
        await sequelize.close();
    }
}

testPersistence();
