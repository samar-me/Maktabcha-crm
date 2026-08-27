// Full diagnostic test of the production AI endpoint
const BASE = 'https://maktabcha-crm.vercel.app';
const ENDPOINT = `${BASE}/api/curriculum/ai-parse`;

console.log('=== PRODUCTION AI ENDPOINT DIAGNOSTIC ===\n');

async function testEndpoint(label, body) {
  const start = Date.now();
  console.log(`[${label}] Sending request...`);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const elapsed = Date.now() - start;
    console.log(`[${label}] Status: ${res.status}, Time: ${elapsed}ms`);
    
    const data = await res.json();
    if (data.success) {
      console.log(`[${label}] ✅ SUCCESS! Items: ${data.data?.items?.length}`);
      data.data?.items?.slice(0, 3).forEach(i => console.log(`  - ${i.orderNumber}. ${i.title}`));
    } else {
      console.log(`[${label}] ❌ FAIL: ${data.error}`);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    console.log(`[${label}] 💥 NETWORK ERROR after ${elapsed}ms: ${err.message}`);
  }
  console.log('');
}

// Test 1: Wrong method (GET)
try {
  const r = await fetch(ENDPOINT, { method: 'GET' });
  console.log(`[GET Test] Status: ${r.status} (should be 405 or 404)\n`);
} catch(e) {
  console.log(`[GET Test] ERROR: ${e.message}\n`);
}

// Test 2: Short text (should be fast)
await testEndpoint('SHORT TEXT', {
  type: 'parse-text',
  text: '1. HTML\n2. CSS\n3. JavaScript\n4. React'
});

// Test 3: Empty text (should return 400)
await testEndpoint('EMPTY TEXT', {
  type: 'parse-text', 
  text: ''
});

// Test 4: Wrong type
await testEndpoint('WRONG TYPE', {
  type: 'invalid',
  text: 'hello'
});

console.log('=== DIAGNOSTIC COMPLETE ===');
