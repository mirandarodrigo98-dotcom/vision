
import db from '@/lib/db';
import { generateAdmissionPDF } from '@/lib/pdf-generator';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('Searching for Paulo Rodrigues...');
    
    // Try to find the user
    const user = await db.prepare("SELECT * FROM admission_requests WHERE employee_full_name ILIKE $1").get('%Paulo Rodrigues%');
    
    if (!user) {
        console.error('User Paulo Rodrigues not found in admission_requests table.');
        process.exit(1);
    }
    
    console.log(`Found user: ${user.employee_full_name} (ID: ${user.id})`);
    
    // Simulate some changes for the rectification preview
    // The user wants to "validate", so seeing some fields highlighted is good.
    // I'll add 'changes' array to the user object.
    const data = {
        ...user,
        salary: user.salary_cents ? (user.salary_cents / 100).toFixed(2).replace('.', ',') : '0,00',
        vt_tarifa_brl: user.vt_tarifa_cents ? (user.vt_tarifa_cents / 100).toFixed(2).replace('.', ',') : '0,00',
        changes: ['job_role', 'salary_cents', 'address_street', 'address_number'] 
    };
    
    // Mock some values if they are missing or to show change
    // Note: The PDF generator uses the values in 'data' to display.
    // If I want to show a "changed" value, I just ensure the value is in 'data'.
    // The 'changes' array controls the highlighting.
    
    console.log('Generating PDF...');
    const pdfBuffer = await generateAdmissionPDF(data);
    
    const outputPath = path.join(process.cwd(), 'public', 'preview_paulo_rodrigues.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`PDF generated successfully at: ${outputPath}`);
}

main().catch(console.error);
