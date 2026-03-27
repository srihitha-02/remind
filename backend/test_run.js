const { execSync } = require('child_process');
try {
    let out = execSync('node server.js', { encoding: 'utf-8', stdio: 'pipe' });
    console.log(out);
} catch (e) {
    console.log("ERR:", e.message);
    console.log("STDOUT:", e.stdout);
    console.log("STDERR:", e.stderr);
}
