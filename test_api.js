const http = require('http');

http.get('http://localhost:3001/api/posts/3', (res) => {
    let data = '';
    console.log('Status:', res.statusCode);
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Data:', data);
        process.exit(0);
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
