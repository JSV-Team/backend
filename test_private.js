const fetch = require('node-fetch'); // we can also just use native fetch if Node 18+

async function testPrivateChat() {
    try {
        const res = await fetch('http://localhost:3001/api/chat/private', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 2, partnerId: 1 })
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Response:', text);
    } catch (err) {
        console.error('Error:', err);
    }
}

testPrivateChat();
