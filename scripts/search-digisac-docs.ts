async function searchDigisacDocs() {
    try {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch("https://raw.githubusercontent.com/douglara/digisac-api-docs/master/README.md");
        const text = await res.text();
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            if (line.toLowerCase().includes('base64')) {
                console.log(`--- Match at line ${i} ---`);
                console.log(lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 10)).join('\n'));
            }
        });
    } catch (e) {
        console.log("No fetch or error", e);
    }
}
searchDigisacDocs();
