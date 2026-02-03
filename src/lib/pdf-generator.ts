import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Helper functions for time calculation
const calculateMinutes = (time: string) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const calculateDailyMinutes = (day: any) => {
    if (!day.active) return 0;
    let m1 = 0;
    if (day.start && day.breakStart) {
        const start = calculateMinutes(day.start);
        const end = calculateMinutes(day.breakStart);
        if (end > start) m1 = end - start;
    }
    let m2 = 0;
    if (day.breakEnd && day.end) {
        const start = calculateMinutes(day.breakEnd);
        const end = calculateMinutes(day.end);
        if (end > start) m2 = end - start;
    }
    return m1 + m2;
};

const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
};

export async function generateAdmissionPDF(data: any): Promise<Buffer> {
    const doc = new jsPDF();
    const changes = data.changes || []; // Array of field keys that changed

    // Helper to style cell if changed
    const getCell = (label: string, value: string, keys: string[]) => {
        const isChanged = keys.some(k => changes.includes(k));
        if (isChanged) {
            return [
                { content: label, styles: { fillColor: [255, 255, 224] } }, // Light yellow background
                { content: value, styles: { fillColor: [255, 255, 224], fontStyle: 'bold', textColor: [220, 38, 38] } } // Red text
            ];
        }
        return [label, value];
    };

    // Title
    doc.setFontSize(18);
    doc.text('Relatório de Admissão', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Protocolo: ${data.protocol_number || 'N/A'}`, 14, 30);
    doc.text(`Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 36);

    // Employee Info
    doc.setFontSize(14);
    doc.text('Dados do Funcionário', 14, 48);

    const employeeData = [
        getCell('Nome Completo', data.employee_full_name, ['employee_full_name']),
        getCell('CPF', data.cpf || '-', ['cpf']),
        getCell('Data de Nascimento', data.birth_date ? format(new Date(data.birth_date), 'dd/MM/yyyy') : '-', ['birth_date']),
    ];

    autoTable(doc, {
        startY: 52,
        head: [['Campo', 'Valor']],
        body: employeeData as any,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    });

    // Job Info
    let finalY = (doc as any).lastAutoTable.finalY;
    doc.text('Dados da Vaga', 14, finalY + 15);

    const jobData = [
        getCell('Função / Cargo', data.job_role, ['job_role']),
        getCell('Tipo de Contrato', data.contract_type || '-', ['contract_type']),
        getCell('Data de Admissão', data.admission_date ? format(new Date(data.admission_date), 'dd/MM/yyyy') : '', ['admission_date']),
        getCell('Salário', `R$ ${data.salary}`, ['salary_cents']),
        getCell('Contrato de Experiência', `${data.experience_days_1} + ${data.experience_days_2} dias`, ['trial1_days', 'trial2_days']),
    ];

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Campo', 'Valor']],
        body: jobData as any,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    });

    // Working Hours (Schedule)
    if (data.working_hours) {
        finalY = (doc as any).lastAutoTable.finalY;
        doc.text('Jornada de Trabalho', 14, finalY + 15);

        const isScheduleChanged = changes.includes('work_schedule');
        const cellStyle = isScheduleChanged ? { fillColor: [255, 255, 224] } : {};
        const textStyle = isScheduleChanged ? { textColor: [220, 38, 38], fontStyle: 'bold' } : {};
        // Combine styles for row content
        const rowStyles = isScheduleChanged ? { fillColor: [255, 255, 224], textColor: [220, 38, 38], fontStyle: 'bold' } : {};

        let scheduleBody = [];
        let isJson = false;
        let formattedTotalWeekly = '';

        try {
            if (data.working_hours.trim().startsWith('[')) {
                const schedule = JSON.parse(data.working_hours);
                
                scheduleBody = schedule
                    .filter((day: any) => day.active || day.isDSR || day.isFolga || day.isCPS)
                    .map((day: any) => {
                        // Apply styles to each cell if schedule changed
                        const applyStyle = (content: any) => isScheduleChanged ? { content, styles: textStyle } : content;
                        
                        if (day.isDSR) {
                            return [
                                applyStyle(day.day), 
                                { content: 'DSR - Descanso Semanal Remunerado', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic', textColor: [0, 0, 0], ...(isScheduleChanged ? { fillColor: [255, 255, 224] } : {}) } }
                            ];
                        }
                        if (day.isFolga) {
                            return [
                                applyStyle(day.day),
                                { content: 'Folga Concedida', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic', textColor: [100, 100, 100], ...(isScheduleChanged ? { fillColor: [255, 255, 224] } : {}) } }
                            ];
                        }
                        if (day.isCPS) {
                            return [
                                applyStyle(day.day),
                                { content: 'CPS - Compensado', colSpan: 5, styles: { halign: 'center', fontStyle: 'italic', textColor: [234, 88, 12], ...(isScheduleChanged ? { fillColor: [255, 255, 224] } : {}) } }
                            ];
                        }
                        return [
                            applyStyle(day.day),
                            applyStyle(day.start),
                            applyStyle(day.breakStart),
                            applyStyle(day.breakEnd),
                            applyStyle(day.end),
                            applyStyle(formatMinutes(calculateDailyMinutes(day)))
                        ];
                    });

                // Calculate total weekly minutes
                const totalWeeklyMinutes = schedule
                    .filter((day: any) => day.active)
                    .reduce((acc: number, day: any) => acc + calculateDailyMinutes(day), 0);
                
                formattedTotalWeekly = formatMinutes(totalWeeklyMinutes);
                
                isJson = true;
            } else {
                // Fallback for old string format
                const parts = data.working_hours.split(';').map((p: string) => p.trim()).filter((p: string) => p);
                scheduleBody = parts.map((part: string) => {
                    return [isScheduleChanged ? { content: part, styles: textStyle } : part];
                });
            }
        } catch (e) {
            console.error('Error parsing schedule:', e);
            scheduleBody = [[isScheduleChanged ? { content: data.working_hours, styles: textStyle } : data.working_hours]];
        }

        if (isJson) {
            autoTable(doc, {
                startY: finalY + 20,
                head: [['Dia', 'Entrada', 'Saída Almoço', 'Volta Almoço', 'Saída', 'Total']],
                body: scheduleBody as any,
                foot: [['', '', '', '', 'Total Semanal:', formattedTotalWeekly]],
                theme: 'grid',
                headStyles: { fillColor: [66, 66, 66] },
                footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
                bodyStyles: cellStyle as any, // Apply background to all body cells if changed
            });
        } else {
            // Simple list for old format
             autoTable(doc, {
                startY: finalY + 20,
                head: [['Descrição da Jornada']],
                body: scheduleBody,
                theme: 'grid',
                headStyles: { fillColor: [66, 66, 66] },
                bodyStyles: cellStyle as any,
            });
        }
    }

    // Benefits & Observations
    finalY = (doc as any).lastAutoTable.finalY;
    doc.text('Benefícios e Observações', 14, finalY + 15);

    const benefitsData = [
        getCell('Vale Transporte', data.has_vt ? 'Sim' : 'Não', ['has_vt']),
        ...(data.has_vt ? [
            getCell('VT Tarifa', data.vt_tarifa_brl ? `R$ ${data.vt_tarifa_brl}` : '-', ['vt_tarifa_cents']),
            getCell('VT Linha', data.vt_linha || '-', ['vt_linha']),
            getCell('VT Qtd/Dia', data.vt_qtd_por_dia ? data.vt_qtd_por_dia.toString() : '-', ['vt_qtd_por_dia'])
        ] : []),
        getCell('Adiantamento Salarial', data.has_adv ? 'Sim' : 'Não', ['has_adv']),
        ...(data.has_adv ? [
            getCell('Dia do Adiantamento', data.adv_day ? data.adv_day.toString() : '-', ['adv_day']),
            getCell('Periodicidade', data.adv_periodicity || '-', ['adv_periodicity'])
        ] : []),
        getCell('Observações', data.general_observations || '-', ['general_observations']),
    ];

    autoTable(doc, {
        startY: finalY + 20,
        head: [['Campo', 'Valor']],
        body: benefitsData as any,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    });

    return Buffer.from(doc.output('arraybuffer'));
}

export async function generateVacationPDF(data: any): Promise<Buffer> {
    const doc = new jsPDF();
    const changes = data.changes || []; 

    const getCell = (label: string, value: string, keys: string[]) => {
        const isChanged = keys.some(k => changes.includes(k));
        if (isChanged) {
            return [
                { content: label, styles: { fillColor: [255, 255, 224] } }, 
                { content: value, styles: { fillColor: [255, 255, 224], fontStyle: 'bold', textColor: [220, 38, 38] } } 
            ];
        }
        return [label, value];
    };

    doc.setFontSize(18);
    doc.text('Solicitação de Férias', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Empresa: ${data.company_name || 'N/A'}`, 14, 30);
    doc.text(`Funcionário: ${data.employee_name || 'N/A'}`, 14, 36);
    doc.text(`Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 42);

    const vacationData = [
        getCell('Data Inicial', data.start_date ? format(new Date(data.start_date), 'dd/MM/yyyy') : '-', ['start_date']),
        getCell('Dias de Férias', data.days_count?.toString() || '0', ['days_count']),
        getCell('Dias de Abono', data.allowance_days?.toString() || '0', ['allowance_days']),
        getCell('Data de Retorno', data.return_date ? format(new Date(data.return_date), 'dd/MM/yyyy') : '-', ['return_date']),
        getCell('Observações', data.observations || '-', ['observations']),
    ];

    autoTable(doc, {
        startY: 50,
        head: [['Campo', 'Valor']],
        body: vacationData as any,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    });

    return Buffer.from(doc.output('arraybuffer'));
}

export async function generateDismissalPDF(data: any): Promise<Buffer> {
    const doc = new jsPDF();
    const changes = data.changes || []; 

    const getCell = (label: string, value: string, keys: string[]) => {
        const isChanged = keys.some(k => changes.includes(k));
        if (isChanged) {
            return [
                { content: label, styles: { fillColor: [255, 255, 224] } }, 
                { content: value, styles: { fillColor: [255, 255, 224], fontStyle: 'bold', textColor: [220, 38, 38] } } 
            ];
        }
        return [label, value];
    };

    doc.setFontSize(18);
    doc.text('Solicitação de Rescisão', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Empresa: ${data.company_name || 'N/A'}`, 14, 30);
    doc.text(`Funcionário: ${data.employee_name || 'N/A'}`, 14, 36);
    doc.text(`Protocolo: ${data.protocol_number || 'N/A'}`, 14, 42);
    doc.text(`Data de Geração: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 48);

    const dismissalData = [
        getCell('Data de Desligamento', data.dismissal_date ? format(new Date(data.dismissal_date), 'dd/MM/yyyy') : '-', ['dismissal_date']),
        getCell('Tipo de Aviso', data.notice_type || '-', ['notice_type']),
        getCell('Causa da Demissão', data.reason || '-', ['reason']),
        getCell('Observações', data.observations || '-', ['observations']),
    ];

    autoTable(doc, {
        startY: 56,
        head: [['Campo', 'Valor']],
        body: dismissalData as any,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
    });

    return Buffer.from(doc.output('arraybuffer'));
}
