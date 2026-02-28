
const QUESTOR_INTERNAL_URL = 'http://192.168.11.2:9001';
const QUESTOR_EXTERNAL_URL = 'http://hcs08305ayy.sn.mynetname.net:9001';

async function fetchWithFallback(
  path: string, 
  options: RequestInit, 
  primaryBaseUrl: string
): Promise<Response> {
  const primaryUrl = `${primaryBaseUrl.replace(/\/$/, '')}${path}`;
  
  // Determine fallback URL
  let fallbackBaseUrl = '';
  if (primaryBaseUrl.includes('192.168')) {
    fallbackBaseUrl = QUESTOR_EXTERNAL_URL;
  } else if (primaryBaseUrl.includes('mynetname.net')) {
    fallbackBaseUrl = QUESTOR_INTERNAL_URL;
  }

  // If no fallback logic matches, just try primary
  if (!fallbackBaseUrl || fallbackBaseUrl === primaryBaseUrl) {
    return fetch(primaryUrl, options);
  }

  const fallbackUrl = `${fallbackBaseUrl.replace(/\/$/, '')}${path}`;

  console.log(`[Questor] Trying Primary URL: ${primaryUrl}`);

  try {
    // Try primary with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for primary
    
    const response = await fetch(primaryUrl, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    // Check if it's a connection error or timeout
    const isConnectionError = 
      error.name === 'AbortError' || 
      error.message?.includes('ECONNREFUSED') || 
      error.message?.includes('fetch failed');

    if (isConnectionError) {
      console.warn(`[Questor] Primary URL failed (${error.message}). Switching to Fallback: ${fallbackUrl}`);
      
      // Try fallback
      return fetch(fallbackUrl, options);
    }
    
    // If it's another error (e.g. strict SSL, etc that isn't connection/timeout), throw it
    throw error;
  }
}

// Test function
async function main() {
  const path = '/TnWebDMRelatorio/Executar'; // Endpoint valid
  // Or just root to test connectivity
  
  console.log('--- TEST 1: Primary is Internal (should fail if outside, succeed if inside) ---');
  try {
      const res = await fetchWithFallback(path, { method: 'GET' }, QUESTOR_INTERNAL_URL);
      console.log('Result:', res.status, res.statusText);
  } catch (e: any) {
      console.error('Final Error:', e.message);
  }

  console.log('\n--- TEST 2: Primary is External (should succeed if inside via NAT loopback or fail and fallback to internal) ---');
  try {
      const res = await fetchWithFallback(path, { method: 'GET' }, QUESTOR_EXTERNAL_URL);
      console.log('Result:', res.status, res.statusText);
  } catch (e: any) {
      console.error('Final Error:', e.message);
  }
}

main();
