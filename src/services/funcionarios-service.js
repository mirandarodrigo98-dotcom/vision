// const fetch = require('node-fetch'); // Native in Node 20+

const CONFIG = {
    url: 'http://192.168.11.2:9001',
    token: 'ctWMyxZeZbkrH4cWCMqWPB0EX0ynm3CjYEocPadmU1v8v4Vv1YusFnFS8kILAKbt'
};

class FuncionariosService {
    /**
     * Busca funcionários de uma empresa usando a consulta personalizada 'FuncionariosVision'
     * @param {string|number} empresaCodigo - Código da empresa
     * @returns {Promise<Array>} Lista de funcionários mapeada
     */
    async getFuncionarios(empresaCodigo) {
        const routine = 'FuncionariosVision';
        const endpoint = `${CONFIG.url}/TnWebDMProcesso/ProcessoExecutar`;
        
        // Autenticação e Nome da Rotina via URL
        const paramsUrl = new URLSearchParams({
            _AActionName: routine,
            TokenApi: CONFIG.token,
            _AsEcho: 'JSON'
        });

        // Parâmetros do Processo via Body JSON
        // IMPORTANTE: O valor deve ser string para evitar erro 500 (EVariantInvalidOpError)
        const body = { 
            "f.CodigoEmpresa": String(empresaCodigo) 
        };

        try {
            console.log(`[FuncionariosService] Buscando dados da empresa ${empresaCodigo}...`);
            
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
            
            // Verifica se retornou erro de negócio no JSON (ex: parâmetro inválido)
            if (json.Error || json.Erro) {
                throw new Error(`Erro de Negócio Questor: ${json.Error || json.Erro}`);
            }

            const rawData = this._extractGridData(json);
            console.log(`[FuncionariosService] Encontrados ${rawData.length} registros.`);
            
            return this._mapFuncionarios(rawData);

        } catch (error) {
            console.error('[FuncionariosService] Erro:', error.message);
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
            console.warn('[FuncionariosService] Erro ao parsear estrutura do grid:', e.message);
        }
        return [];
    }

    /**
     * Mapeia os dados brutos para o formato desejado
     */
    _mapFuncionarios(data) {
        return data.map(f => {
            // Clean HTML entities from strings (e.g. &nbsp -> space)
            const cleanFunc = (str) => typeof str === 'string' ? str.replace(/&nbsp/g, ' ') : str;
            
            return {
                ...f,
                NOMEFUNC: cleanFunc(f.NOMEFUNC),
                // Mapeamento solicitado: 1=Masculino, 2=Feminino
                SexoDescricao: this._mapSexo(f.SEXO)
            };
        });
    }

    _mapSexo(codigo) {
        if (codigo == 1) return 'Masculino';
        if (codigo == 2) return 'Feminino';
        return 'Outro'; // Ou manter o valor original se preferir
    }
}

module.exports = new FuncionariosService();
