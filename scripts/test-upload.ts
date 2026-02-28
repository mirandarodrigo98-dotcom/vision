
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente explicitamente do .env.local
dotenv.config({ path: '.env.local' });

async function main() {
    // Importar dinamicamente para garantir que as variáveis de ambiente já estejam carregadas
    const { getPresignedUploadUrl } = await import('../src/lib/r2');
    
    console.log('Iniciando teste de upload...');
    
    const fileName = `test-upload-${Date.now()}.txt`;
    const fileContent = 'Este é um teste de upload para o R2 via script.';
    const fileType = 'text/plain';

    try {
        console.log(`Gerando URL pré-assinada para ${fileName}...`);
        const result = await getPresignedUploadUrl(fileName, fileType);
        
        console.log(`URL gerada: ${result.uploadUrl}`);
        console.log(`File Key: ${result.fileKey}`);

        console.log('Realizando upload via fetch...');
        // Node 18+ tem fetch nativo
        const response = await fetch(result.uploadUrl, {
            method: 'PUT',
            body: fileContent,
            headers: {
                'Content-Type': fileType
            }
        });

        if (response.ok) {
            console.log('Upload realizado com sucesso!');
        } else {
            console.error('Falha no upload:', response.status, response.statusText);
            const text = await response.text();
            console.error('Detalhes:', text);
        }

    } catch (error) {
        console.error('Erro durante o teste:', error);
    }
}

main();
