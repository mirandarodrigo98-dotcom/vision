
import { generateAdmissionPDF } from '../src/lib/pdf-generator';
import fs from 'fs';
import path from 'path';

async function test() {
    const data = {
        protocol_number: '123456',
        employee_full_name: 'Test Employee',
        cpf: '123.456.789-00',
        birth_date: '1990-01-01',
        email: 'test@example.com',
        phone: '123456789',
        marital_status: 'single',
        gender: 'M',
        education_level: 'superior_completo',
        race_color: 'white',
        job_role: 'Developer',
        admission_date: '2023-01-01',
        salary_cents: 100000,
        contract_type: 'clt',
        trial1_days: 30,
        trial2_days: 30,
        work_schedule: '08:00 - 17:00',
        has_vt: 1,
        vt_tarifa_cents: 500,
        vt_linha: '123',
        vt_qtd_por_dia: 2,
        has_adv: 1,
        adv_day: 15,
        adv_periodicity: 'monthly',
        general_observations: 'None',
        changes: ['salary_cents', 'job_role']
    };

    try {
        console.log('Generating PDF...');
        const buffer = await generateAdmissionPDF(data);
        console.log('PDF generated successfully, size:', buffer.length);
        fs.writeFileSync('test_admission.pdf', buffer);
    } catch (e) {
        console.error('Error generating PDF:', e);
    }
}

test();
