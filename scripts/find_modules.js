const fs = require('fs');

try {
    const data = fs.readFileSync('questor_menus_dump.json', 'utf8');
    // Remove o wrapper inicial do output do fetchWithLog se houver (mas parece que eu salvei só o JSON puro)
    // O arquivo começa com "[..."
    
    // Tenta parsear.
    let json;
    try {
        json = JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse JSON");
        throw e;
    }

    console.log("JSON Type:", Array.isArray(json) ? "Array" : typeof json);
    if (!Array.isArray(json)) {
        console.log("Keys:", Object.keys(json));
        if (json.text) {
            try {
                json = JSON.parse(json.text);
                console.log("Parsed JSON from 'text' property. Type:", Array.isArray(json) ? "Array" : typeof json);
            } catch (e) {
                console.error("Failed to parse 'text' property as JSON");
            }
        }
    }

    function findModules(items, term) {
        if (!Array.isArray(items)) return [];
        let results = [];
        for (const item of items) {
            if (item.Text && item.Text.toLowerCase().includes(term.toLowerCase())) {
                if (item.Name) {
                    results.push({ Text: item.Text, Name: item.Name });
                }
            }
            if (item.Childs && Array.isArray(item.Childs)) {
                results = results.concat(findModules(item.Childs, term));
            }
        }
        return results;
    }

    const funcionarios = findModules(json, 'funcion');
    const empregados = findModules(json, 'empregad');
    const pessoas = findModules(json, 'pessoa');

    console.log('--- Módulos Relacionados a Funcionários ---');
    console.log(funcionarios);
    console.log('\n--- Módulos Relacionados a Empregados ---');
    console.log(empregados);
    console.log('\n--- Módulos Relacionados a Pessoas ---');
    console.log(pessoas);

} catch (e) {
    console.error('Erro:', e);
}
