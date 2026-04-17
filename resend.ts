import db from './src/lib/db';
import { sendAdmissionNotification } from './src/lib/emails/notifications';
import { generateAdmissionPDF } from './src/lib/pdf-generator';
import { format } from 'date-fns';

async function run() {
  try {
    const query = `
      SELECT a.id, a.admission_date, u.name as user_name, u.email as user_email, c.razao_social as company_name, c.cnpj, a.employee_full_name, a.company_id, a.created_at
      FROM admission_requests a 
      JOIN users u ON a.created_by_user_id = u.id 
      JOIN client_companies c ON a.company_id = c.id 
      WHERE u.name ILIKE '%LEONARDO%' AND a.employee_full_name ILIKE '%ROBERTA%'
      ORDER BY a.created_at DESC LIMIT 1
    `;
    const res = await db.query(query, []);
    const adm = res.rows[0];

    if (!adm) {
      console.log('No admission found for Leonardo');
      return;
    }

    console.log('Found admission:', adm.employee_full_name, 'for company', adm.company_name);

    // Get full admission details for PDF
    const fullAdm = (await db.query('SELECT * FROM admission_requests WHERE id = $1', [adm.id])).rows[0];
    
    const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://vision.nzdcontabilidade.com.br';
    const downloadLink = `${domain}/api/download/admission-zip/${adm.id}`;

    const admissionDateFormatted = adm.admission_date ? format(new Date(adm.admission_date), 'dd/MM/yyyy') : 'Não informada';

    console.log('Generating PDF...');
    const pdfBuffer = await generateAdmissionPDF(fullAdm, adm.company_name);

    console.log('Sending email...');
    const emailRes = await sendAdmissionNotification('NEW', {
        companyName: adm.company_name,
        cnpj: adm.cnpj,
        userName: adm.user_name,
        employeeName: adm.employee_full_name,
        admissionDate: admissionDateFormatted,
        downloadLink: downloadLink,
        pdfBuffer: pdfBuffer,
        senderEmail: adm.user_email
    });

    console.log('Email sent successfully!', emailRes);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

run();