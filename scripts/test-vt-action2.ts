import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function testVT() {
    try {
        const { createTransportVoucher } = await import('../src/app/actions/transport-vouchers');
        const { default: db } = await import('../src/lib/db');
        
        console.log("Mocking auth...");
        const auth = await import('../src/lib/auth');
        (auth as any).getSession = async () => {
            return {
                user_id: 'c878f141-a67e-49b8-b4b1-9b6f12345678',
                role: 'client_user',
                email: 'test@example.com'
            };
        };

        const companyRes = await db.query(`SELECT id FROM client_companies WHERE cnpj = '49932356000152' OR cnpj = '49.932.356/0001-52' LIMIT 1`);
        if (companyRes.rowCount === 0) {
            console.log("Company not found!");
            return;
        }
        const companyId = companyRes.rows[0].id;
        
        const empRes = await db.query(`SELECT id FROM employees WHERE company_id = $1 LIMIT 1`, [companyId]);
        if (empRes.rowCount === 0) {
            console.log("No employees found for company!");
            return;
        }
        const empId = empRes.rows[0].id;

        console.log("Creating VT...");
        const res = await createTransportVoucher({
            company_id: companyId,
            reference_month: 5,
            reference_year: 2026,
            notes: 'Test Action',
            employees: [
                {
                    employee_id: empId,
                    quantity: 10,
                    value: 5.50,
                    total: 55.00,
                    line: "Linha X",
                    observation: null
                }
            ]
        }, false);
        console.log("Action Result:", res);
    } catch(err) {
        console.error("Action Error:", err);
    } finally {
        process.exit(0);
    }
}
testVT();