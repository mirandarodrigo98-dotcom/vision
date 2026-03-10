// const fetch = require('node-fetch'); // Native in Node 20+

const CONFIG = {
    url: 'http://192.168.11.2:9001',
    token: 'ctWMyxZeZbkrH4cWCMqWPB0EX0ynm3CjYEocPadmU1v8v4Vv1YusFnFS8kILAKbt'
};

class EmpresasService {
    /**
     * Busca empresas usando a consulta personalizada 'EmpresasVision'
     * @returns {Promise<Array>} Lista de empresas mapeada
     */
    async getEmpresas() {
        const routine = 'EmpresasVision';
        const endpoint = `${CONFIG.url}/TnWebDMProcesso/ProcessoExecutar`;
        
        // Autenticação e Nome da Rotina via URL
        const paramsUrl = new URLSearchParams({
            _AActionName: routine,
            TokenApi: CONFIG.token,
            _AsEcho: 'JSON'
        });

        // Parâmetros do Processo via Body JSON
        // Para empresas, assumimos que não há parâmetros obrigatórios para listar todas
        const body = {};

        try {
            console.log(`[EmpresasService] Buscando todas as empresas...`);
            
            const res = await fetch(`${endpoint}?${paramsUrl}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Erro na API Questor (${res.status}): ${text}`);
            }

            const json = await res.json();
            
            // Verifica se retornou erro de negócio no JSON
            if (json.Error || json.Erro) {
                throw new Error(`Erro de Negócio Questor: ${json.Error || json.Erro}`);
            }

            const rawData = this._extractGridData(json);
            console.log(`[EmpresasService] Encontradas ${rawData.length} empresas.`);
            
            return this._mapEmpresas(rawData);

        } catch (error) {
            console.error('[EmpresasService] Erro:', error.message);
            throw error;
        }
    }

    /**
     * Navega na estrutura complexa de resposta do Questor para encontrar o array de dados
     */
    _extractGridData(json) {
        try {
            // Estrutura típica: Widgets -> bottom/client -> Itens -> grids -> data
            const widgets = json.Widgets || {};
            const areas = [...(widgets.bottom || []), ...(widgets.client || [])];
            
            for (const area of areas) {
                if (area.Itens) {
                    for (const item of area.Itens) {
                        if (item.grids) {
                            for (const grid of item.grids) {
                                // O array de dados pode estar em 'data', 'Data', 'Items' ou 'items'
                                const data = grid.data || grid.Data || grid.Items || grid.items;
                                if (Array.isArray(data)) {
                                    return data;
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[EmpresasService] Erro ao parsear estrutura do grid:', e.message);
        }
        return [];
    }

    /**
     * Mapeia os dados brutos para o formato desejado
     */
    _mapEmpresas(data) {
        return data.map(e => {
            const clean = (str) => typeof str === 'string' ? str.replace(/&nbsp/g, ' ').trim() : str;
            
            // Mapeamento baseado nos campos prováveis retornados pela consulta EmpresasVision
            // Ajustar conforme o retorno real da API se necessário
            return {
                code: clean(e.CODIGOEMPRESA || e.code),
                nome: clean(e.NOMEFANTASIA || e.nome || e.NOMEEMPRESA),
                razao_social: clean(e.RAZAOSOCIAL || e.razao_social || e.NOMEEMPRESA),
                cnpj: clean(e.CNPJ || e.INSCRICAOFEDERAL),
                cidade: clean(e.NOMEMUNICIPIO || e.CIDADE),
                uf: clean(e.SIGLAESTADO || e.UF),
                status: (e.SITUACAO === 1 || e.SITUACAO === 'Ativa') ? 'active' : 'inactive' // Ajustar lógica de status se necessário
            };
        });
    }
}

module.exports = new EmpresasService();
