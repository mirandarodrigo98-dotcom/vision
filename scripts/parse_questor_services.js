const fs = require('fs');

try {
    const rawData = fs.readFileSync('questor_info_dump.json', 'utf8');
    const parsedData = JSON.parse(rawData);
    
    // The 'text' property contains the actual JSON string
    if (parsedData.text) {
        const innerJson = JSON.parse(parsedData.text);
        
        console.log('--- Services Found ---');
        if (innerJson.InfoServicos) {
            const services = Object.keys(innerJson.InfoServicos);
            services.forEach(service => {
                console.log(`Service: ${service}`);
                // detailed info?
                // console.log(innerJson.InfoServicos[service]);
            });
        } else {
            console.log('No InfoServicos found in inner JSON.');
        }
    } else {
        console.log('No text property found in dump.');
    }

} catch (e) {
    console.error('Error parsing dump:', e);
}