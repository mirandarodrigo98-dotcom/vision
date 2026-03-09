import fetch from 'node-fetch';
// AbortController is global in modern Node

// Monitor Questor nWeb Connectivity
// Usage: npx tsx src/scripts/monitor-questor.ts

const BASE_URL = 'http://hcs08305ayy.sn.mynetname.net:9001';
const CHECK_INTERVAL = 30000; // 30 seconds
const TIMEOUT = 10000; // 10 seconds

async function checkStatus() {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const url = `${BASE_URL}/TnInfo`;
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT);
        
        const start = Date.now();
        const response = await fetch(url, { 
            method: 'GET',
            headers: { 'Connection': 'close' },
            signal: controller.signal 
        });
        clearTimeout(timeout);
        const duration = Date.now() - start;
        
        if (response.status === 200) {
            const text = await response.text();
            if (text.length > 0) {
                console.log(`[${timestamp}] ✅ ONLINE! /TnInfo responding in ${duration}ms (Length: ${text.length})`);
                console.log('--- SERVER IS BACK UP ---');
                return true;
            } else {
                console.log(`[${timestamp}] ⚠️ 200 OK but Empty Body (${duration}ms)`);
            }
        } else {
            console.log(`[${timestamp}] ❌ Error: Status ${response.status} (${duration}ms)`);
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log(`[${timestamp}] ⏳ HANGING (Timeout > ${TIMEOUT}ms) - Server likely stuck on DB connection`);
        } else {
            console.log(`[${timestamp}] ❌ Connection Failed: ${error.message}`);
        }
    }
    return false;
}

async function startMonitor() {
    console.log(`--- Questor Monitor Started ---`);
    console.log(`Target: ${BASE_URL}`);
    console.log(`Interval: ${CHECK_INTERVAL/1000}s | Timeout: ${TIMEOUT/1000}s`);
    
    // Initial check
    await checkStatus();
    
    // Loop
    setInterval(checkStatus, CHECK_INTERVAL);
}

startMonitor();
