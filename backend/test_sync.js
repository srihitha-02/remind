const sequelize = require('./config/db');

async function testSync() {
    console.log('Starting sync...');
    try {
        await sequelize.authenticate();
        console.log('Auth OK');
        await sequelize.sync({ alter: true });
        console.log('Sync OK');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
        console.log('Done');
    }
}
testSync();
