export const NATIONAL_HOLIDAYS = [
    '01-01', // Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência do Brasil
    '10-12', // Nossa Senhora Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '12-25', // Natal
];

// Feriados móveis (Carnaval e Corpus Christi) precisam ser calculados ou adicionados manualmente por ano.
// Para simplificar, vou adicionar as datas de 2025 e 2026.
export const MOBILE_HOLIDAYS = [
    '2025-03-03', // Carnaval
    '2025-03-04', // Carnaval
    '2025-04-18', // Paixão de Cristo
    '2025-06-19', // Corpus Christi
    '2026-02-16', // Carnaval
    '2026-02-17', // Carnaval
    '2026-04-03', // Paixão de Cristo
    '2026-06-04', // Corpus Christi
];

export function isHoliday(date: Date): boolean {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${month}-${day}`;
    const fullDate = `${year}-${month}-${day}`;

    return NATIONAL_HOLIDAYS.includes(formattedDate) || MOBILE_HOLIDAYS.includes(fullDate);
}

export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
}

export function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

export function getNextBusinessDay(date: Date): Date {
    const current = new Date(date);
    while (isWeekend(current) || isHoliday(current)) {
        current.setDate(current.getDate() + 1);
    }
    return current;
}

export function calculateReturnDate(startDateStr: string, days: number): Date {
    // "Data Retorno Férias: Será resultado da data inical das férias + dias de férias."
    // Ex: Início 01/01, 30 dias -> Férias de 01/01 a 30/01. Retorno 31/01.
    // Então adicionamos os dias à data inicial para achar a data de retorno TEÓRICA.
    
    // ATENÇÃO: Se eu tiro 1 dia de férias começando dia 01, eu volto dia 02.
    // Então Data Retorno = Data Inicial + Dias.
    
    // Parse da data string (yyyy-mm-dd) para evitar problemas de timezone
    const [year, month, day] = startDateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    
    const theoreticalReturnDate = addDays(start, days);
    
    // "Se cair em um sábado, domingo ou feriado, retorna no próximo dia útil."
    return getNextBusinessDay(theoreticalReturnDate);
}
