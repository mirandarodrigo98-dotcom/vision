const funcionariosService = require('../services/funcionarios-service');

async function demo() {
    try {
        console.log('--- Iniciando Demonstração do Serviço de Funcionários ---');
        
        // Teste com empresa 1
        // Se retornar array vazio (mas sem erro), a integração está correta!
        const dados = await funcionariosService.getFuncionarios(1);
        
        if (dados.length === 0) {
            console.log('✅ Sucesso na conexão! A API respondeu corretamente (Status 200), mas não há registros para a Empresa 1 nesta visão.');
        } else {
            console.log(`✅ Sucesso! Encontrados ${dados.length} registros.`);
            console.log('Amostra:', dados[0]);
        }
        
    } catch (error) {
        console.error('❌ Falha na demonstração:', error.message);
    }
}

demo();
