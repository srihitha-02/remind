const sequelize = require('./config/db');
const ActivityLog = require('./models/ActivityLog');
const fs = require('fs');

async function test() {
    let result = '';
    try {
        await sequelize.authenticate();
        result += 'Connected to DB.\n';
        const log = await ActivityLog.create({
            userId: 1,
            action: 'TEST_ACTION',
            details: { test: true },
            ipAddress: '127.0.0.1'
        });
        result += 'ActivityLog created: ' + log.id;
    } catch (err) {
        result += 'ACTIVITY LOG ERROR: ' + err.message + '\n' + err.stack;
    } finally {
        await sequelize.close();
        fs.writeFileSync('test_log_result.txt', result);
    }
}

test();
