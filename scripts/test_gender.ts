
import { generateAdmissionPDF } from '../src/lib/pdf-generator';
import fs from 'fs';

// Mock changes array if needed by getCell
const mockChanges = ['gender'];

async function testGenderScenarios() {
    const scenarios = [
        { val: 'M', desc: 'Sigla M' },
        { val: 'F', desc: 'Sigla F' },
        { val: 'Masculino', desc: 'Extenso Masculino' }, // Teste de robustez
        { val: '', desc: 'Vazio' },
        { val: null, desc: 'Nulo' },
        { val: undefined, desc: 'Undefined' }
    ];

    console.log('--- Iniciando Teste de Cenários de Gênero ---');

    for (const scenario of scenarios) {
        const data = {
            protocol_number: 'TEST-GENDER',
            employee_full_name: `Teste ${scenario.desc}`,
            cpf: '000.000.000-00',
            gender: scenario.val, // O ponto crucial
            changes: mockChanges // Forçar destaque para ver se afeta
        };

        try {
            console.log(`Gerando PDF para cenário: ${scenario.desc} (Valor: ${scenario.val})`);
            const buffer = await generateAdmissionPDF(data);
            const fileName = `test_gender_${scenario.desc.replace(/\s+/g, '_')}.pdf`;
            fs.writeFileSync(fileName, buffer);
            console.log(`Generated: ${fileName}`);
        } catch (e) {
            console.error(`Erro no cenário ${scenario.desc}:`, e);
        }
    }
}

testGenderScenarios();
