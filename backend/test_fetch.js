const http = require('http');
const fs = require('fs');

http.get('http://localhost:5000/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => fs.writeFileSync('fetch_ok.txt', 'Response: ' + data));
}).on('error', (err) => {
    fs.writeFileSync('fetch_ok.txt', 'Error: ' + err.message);
});
