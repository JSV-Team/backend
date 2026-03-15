// Quick module load test
try {
    require('./src/routes/index');
    console.log('[OK] routes/index');
} catch(e) { console.error('[FAIL] routes/index:', e.message); }

try {
    require('./src/controllers/match.controller');
    console.log('[OK] controllers/match.controller');
} catch(e) { console.error('[FAIL] controllers/match.controller:', e.message); }

try {
    require('./src/services/matching.service');
    console.log('[OK] services/matching.service');
} catch(e) { console.error('[FAIL] services/matching.service:', e.message); }

try {
    require('./src/models/match.model');
    console.log('[OK] models/match.model');
} catch(e) { console.error('[FAIL] models/match.model:', e.message); }

try {
    require('./src/models/user.model');
    console.log('[OK] models/user.model');
} catch(e) { console.error('[FAIL] models/user.model:', e.message); }

try {
    require('./src/models/matching.model');
    console.log('[OK] models/matching.model');
} catch(e) { console.error('[FAIL] models/matching.model:', e.message); }

try {
    const socketModule = require('./src/socket');
    console.log('[OK] socket.js - exports:', Object.keys(socketModule));
} catch(e) { console.error('[FAIL] socket.js:', e.message); }

console.log('\nDone.');
