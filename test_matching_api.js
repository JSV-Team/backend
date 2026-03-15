// Comprehensive API Test for Matching Feature
const http = require('http');

const BASE = 'http://localhost:3001';

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    let passed = 0, failed = 0;

    function check(name, condition) {
        if (condition) { console.log(`  [PASS] ${name}`); passed++; }
        else { console.log(`  [FAIL] ${name}`); failed++; }
    }

    // === 8.1 Enable Matching ===
    console.log('\n--- 8.1 Enable Matching ---');
    let r = await request('POST', '/api/match/enable', { userId: 1 });
    check('Returns 200', r.status === 200);
    check('Success message', r.body.message && r.body.message.includes('b\u1EADt'));

    // Idempotency
    r = await request('POST', '/api/match/enable', { userId: 1 });
    check('Idempotent (no error on 2nd call)', r.status === 200);

    // === 8.2 Disable Matching ===
    console.log('\n--- 8.2 Disable Matching ---');
    r = await request('POST', '/api/match/disable', { userId: 1 });
    check('Returns 200', r.status === 200);
    check('Success message', r.body.message && r.body.message.includes('t\u1EAFt'));

    // Idempotency
    r = await request('POST', '/api/match/disable', { userId: 1 });
    check('Idempotent (no error on 2nd call)', r.status === 200);

    // === 8.3 Get Status ===
    console.log('\n--- 8.3 Get Status ---');
    // First enable so we can check status
    await request('POST', '/api/match/enable', { userId: 1 });
    r = await request('GET', '/api/match/status?userId=1');
    check('Returns 200', r.status === 200);
    check('Has is_matching_enabled', r.body.is_matching_enabled !== undefined);
    check('Has last_matched_at field', 'last_matched_at' in r.body);
    check('Has is_in_active_match field', 'is_in_active_match' in r.body);

    // === 8.4 Find Match (matching disabled) ===
    console.log('\n--- 8.4 Find Match ---');
    await request('POST', '/api/match/disable', { userId: 1 });
    r = await request('POST', '/api/match/find', { userId: 1 });
    check('Matching disabled -> returns 400', r.status === 400);

    // Re-enable and try finding (no compatible users expected)
    await request('POST', '/api/match/enable', { userId: 1 });
    r = await request('POST', '/api/match/find', { userId: 1 });
    // Either 200 with null/message or 400 for online check
    check('Returns response (200 or 400)', r.status === 200 || r.status === 400);

    // === 8.9 Authentication Required ===
    console.log('\n--- 8.9 Authentication Required ---');
    r = await request('POST', '/api/match/enable', {});
    check('Enable without userId -> 401', r.status === 401);

    r = await request('GET', '/api/match/status');
    check('Status without userId -> 401', r.status === 401);

    r = await request('POST', '/api/match/find', {});
    check('Find without userId -> 401', r.status === 401);

    // === Summary ===
    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test error:', e); process.exit(1); });
