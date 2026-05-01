import { generateTransportVoucherPDF } from '../src/lib/pdf-generator';

async function test() {
    const vt = {
        company_name: 'NZD CONTABILIDADE LTDA',
        company_cnpj: '49.932.356/0001-52',
        reference_month: 5,
        reference_year: 2026,
        notes: 'Test note',
        employees: [
            {
                employee_code: '16',
                employee_name: 'CARLA CAROLINE MARINHO DIAS',
                employee_cpf: '159.393.207-32',
                quantity: 40,
                value: 3.80,
                total: 152.00,
                line: '',
                observation: ''
            }
        ]
    };
    try {
        const buffer = await generateTransportVoucherPDF(vt);
        console.log('PDF generated, size:', buffer.length);
    } catch (err) {
        console.error('Error:', err);
    }
}
test();