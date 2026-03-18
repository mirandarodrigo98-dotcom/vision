'use server';

import { executeQuestorProcess } from './questor-syn';

export async function fetchVacationControlFromQuestor(companyCode: string) {
    if (!companyCode) {
        return { success: false, error: 'Código da empresa é obrigatório.' };
    }

    try {
        const body = {
            "F.CODIGOEMPRESA": String(companyCode)
        };

        const result = await executeQuestorProcess('PeriodoAquisitivo', body);

        if (result.error) {
            return { success: false, error: result.error };
        }

        return { 
            success: true, 
            data: result.data || [], 
            companyCode 
        };
    } catch (error: any) {
        console.error('Error fetching vacation control:', error);
        return { success: false, error: 'Erro ao buscar controle de férias no Questor' };
    }
}
