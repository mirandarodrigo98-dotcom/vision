
// Usage: npx tsx src/scripts/monitor-questor.ts [--once]

// Config
const BASE_URL = 'http://192.168.11.2:9001'; // Internal URL
const CHECK_INTERVAL = 30000; // 30 seconds
const TIMEOUT = 10000; // 10 seconds

const runOnce = process.argv.includes('--once');

async function checkStatus() {
    const timestamp = new Date().toLocaleTimeString();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(`${BASE_URL}/TnInfo`, {
            method: 'GET',
            headers: { 'Connection': 'close' },
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
            console.log(`[${timestamp}] ✅ SUCCESS: Questor is reachable at ${BASE_URL}`);
            // Optionally check API content
            // const text = await response.text();
            // console.log(`[${timestamp}] ℹ️ Response length: ${text.length}`);
        } else {
            console.log(`[${timestamp}] ⚠️ WARNING: Questor returned status ${response.status} (${response.statusText})`);
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
             console.log(`[${timestamp}] ❌ FAILURE: Connection timed out after ${TIMEOUT/1000}s (Server Hang?)`);
        } else {
             console.log(`[${timestamp}] ❌ FAILURE: ${error.message}`);
        }
    }
}

async function startMonitor() {
    console.log(`--- Questor Internal Monitor Started ---`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`Interval: ${CHECK_INTERVAL/1000}s | Timeout: ${TIMEOUT/1000}s`);
    
    if (runOnce) {
        await checkStatus();
    } else {
        while (true) {
            await checkStatus();
            await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
        }
    }
}

startMonitor();
