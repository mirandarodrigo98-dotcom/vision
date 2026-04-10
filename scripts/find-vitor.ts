import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\r/g, '');
    }
  });
}

async function resendVitor() {
    const { default: db } = await import('../src/lib/db');
    const { getDigisacConfig, sendDigisacMessage } = await import('../src/app/actions/integrations/digisac');
    const { sendEmail } = await import('../src/lib/email/resend');
    const { getR2DownloadLink } = await import('../src/lib/r2');
    
    try {
        const declaration = await db.prepare(`SELECT * FROM ir_declarations WHERE name ILIKE '%VITOR%SALES%'`).get();
        if (!declaration) {
            console.log("Contribuinte não encontrado");
            return;
        }
        
        const files = await db.prepare(`
            SELECT * FROM ir_files WHERE declaration_id = $1
        `).all(declaration.id);
        
        console.log(`Buscando ${files.length} arquivos do R2...`);
        
        const uploadedFiles = [];
        for (const f of files) {
            let link = f.file_url;
            if (!link.startsWith('http')) {
                link = process.env.R2_PUBLIC_DOMAIN 
                    ? `${process.env.R2_PUBLIC_DOMAIN}/${f.file_key}`
                    : await getR2DownloadLink(f.file_key);
            }
            
            console.log(`Baixando: ${link}`);
            const resp = await fetch(link);
            if (resp.ok) {
                const buffer = Buffer.from(await resp.arrayBuffer());
                uploadedFiles.push({
                    fileName: f.file_name,
                    base64: buffer.toString('base64'),
                    mimeType: 'application/pdf'
                });
            } else {
                console.log("Erro ao baixar:", resp.status);
            }
        }
        
        const contactName = declaration.name;
        const year = declaration.year;
        
        const textMessage = `_*Essa é uma mensagem automática. Não é necessário responder*_

Olá *${contactName}*
Estamos enviando a sua declaração de Imposto de Renda Exercício *${year}* que foi transmitida com sucesso.
A partir de agora passamos a monitorar o processamento junto à Receita Federal.
Caso seja necessário faremos contato.
Em caso de dúvidas entre em contato com a nossa Central de Atendimento através do número (24) 3026-5648 ou 3337-4865.

Atenciosamente
*NZD Contabilidade*
_Departamento Tributário_`;

        console.log("Enviando WhatsApp...");
        const config = await getDigisacConfig();
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          await sendDigisacMessage({
            number: declaration.phone,
            serviceId: config.connection_phone,
            contactName: contactName,
            body: null,
            base64File: `data:${file.mimeType};base64,${file.base64}`,
            fileName: file.fileName
          });
        }
        
        await sendDigisacMessage({
          number: declaration.phone,
          serviceId: config.connection_phone,
          body: textMessage
        });
        
        console.log("Enviando Email...");
        const attachments = uploadedFiles.map(f => ({
            filename: f.fileName,
            content: Buffer.from(f.base64, 'base64'),
            contentType: f.mimeType
        }));
        
        const htmlMessage = textMessage.replace(/\n/g, '<br/>').replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        await sendEmail({
            to: declaration.email,
            subject: `Declaração de Imposto de Renda Transmitida - Exercício ${year}`,
            html: htmlMessage,
            category: 'irpf_transmissao',
            attachments
        });

        console.log("Feito!");
    } catch (e) {
        console.error("Erro:", e);
    }
}

resendVitor().then(() => process.exit(0));