import { executeQuestorProcess } from './questor-syn';

export async function fetchZenEventsFromQuestor(companyCode: string) {
    try {
        const body = {
            "z.CodigoEmpresa": String(companyCode)
        };

        const result = await executeQuestorProcess('EventosZen', body);

        if (result.error) {
            return { success: false, error: result.error };
        }

        const events = result.data || [];
        return { success: true, data: events };
    } catch (error: any) {
        console.error('Error fetching Zen events from Questor:', error);
        return { success: false, error: error.message || 'Erro desconhecido ao buscar eventos.' };
    }
}