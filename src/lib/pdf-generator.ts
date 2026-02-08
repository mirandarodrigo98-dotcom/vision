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

export async function generateEthnicRacialSelfDeclarationPDF(companyData: any): Promise<Buffer> {
    const doc = new jsPDF();
    const pageWidth = 210;
    const margin = 10;
    const maxWidth = pageWidth - (margin * 2);
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Termo de Autodeclaração Étnico-Racial', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Header
    let y = 40;
    let x = margin;
    
    // Line 1: À [Name] CNPJ sob o n.º [CNPJ]
    doc.text('À ', x, y);
    x += doc.getTextWidth('À ');
    
    doc.setFont('helvetica', 'bold');
    const name = (companyData.nome || '').toUpperCase();
    doc.text(name, x, y);
    x += doc.getTextWidth(name);
    
    doc.setFont('helvetica', 'normal');
    const cnpjPrefix = ' CNPJ sob o n.º ';
    doc.text(cnpjPrefix, x, y);
    x += doc.getTextWidth(cnpjPrefix);
    
    doc.setFont('helvetica', 'bold');
    const cnpj = companyData.cnpj || '';
    doc.text(cnpj, x, y);
    
    y += 7;
    x = margin;
    doc.setFont('helvetica', 'normal');

    // Address Line
    // Format Line 1: tipo logradouro numero complemento bairro
    // Format Line 2: cidade/estado - cep
    
    const addressLine1Parts = [
        companyData.address_type,
        companyData.address_street,
        companyData.address_number,
        companyData.address_complement ? `- ${companyData.address_complement}` : null,
        companyData.address_neighborhood ? `- ${companyData.address_neighborhood}` : null
    ].filter(Boolean);
    
    const addressLine1 = addressLine1Parts.join(' ');
    doc.text(addressLine1, margin, y, { maxWidth: maxWidth });
    
    // Calculate height of line 1 to know where to put line 2
    const dimLine1 = doc.getTextDimensions(addressLine1, { maxWidth: maxWidth });
    y += dimLine1.h + 5; // Add some spacing
    
    const addressLine2Parts = [
        (companyData.municipio && companyData.uf) ? `${companyData.municipio}/${companyData.uf}` : null,
        companyData.address_zip_code ? `- CEP: ${companyData.address_zip_code}` : null
    ].filter(Boolean);
    
    const addressLine2 = addressLine2Parts.join(' ');
    doc.text(addressLine2, margin, y, { maxWidth: maxWidth });
    
    y += 20;
    
    // Body
    // Line 1: Eu, _____________________________________________________________________________________
    const part1 = "Eu,";
    doc.text(part1, margin, y);
    const wPart1 = doc.getTextWidth(part1);
    doc.line(margin + wPart1 + 2, y + 1, pageWidth - margin, y + 1); // Line to end
    y += 10;
    
    // Line 2: inscrito(a) no CPF sob n.º ________________________________, ...
    const part2 = "inscrito(a) no CPF sob n.º ";
    doc.text(part2, margin, y);
    const wPart2 = doc.getTextWidth(part2);
    
    const cpfLineLength = 60;
    doc.line(margin + wPart2 + 2, y + 1, margin + wPart2 + 2 + cpfLineLength, y + 1);
    
    const startX = margin + wPart2 + 2 + cpfLineLength + 1;
    const fullText = ", autodeclaro para o fim específico de atender às disposições constantes na Lei n. 14.553 de 20 de abril de 2023*, que sou:";
    
    const availableWidth = pageWidth - margin - startX;
    const words = fullText.split(' ');
    let line1Text = "";
    let remainingTextIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = line1Text ? (line1Text + " " + word) : word;
        if (doc.getTextWidth(testLine) < availableWidth) {
            line1Text = testLine;
            remainingTextIndex = i + 1;
        } else {
            break;
        }
    }
    
    doc.text(line1Text, startX, y);
    
    y += 8;
    
    if (remainingTextIndex < words.length) {
        const restOfText = words.slice(remainingTextIndex).join(' ');
        const splitText = doc.splitTextToSize(restOfText, maxWidth);
        doc.text(splitText, margin, y);
        y += splitText.length * 7;
    }
    
    y += 5;
    
    // Checkboxes
    const options = [
        '( ) Branco (a)',
        '( ) Preto (a)',
        '( ) Pardo (a)',
        '( ) Amarelo (a)',
        '( ) Indígena'
    ];
    
    options.forEach(opt => {
        doc.text(opt, margin + 10, y);
        y += 7;
    });
    
    y += 10;
    
    // Disclaimer
    const disclaimer = `Estou ciente de que, o presente documento visa cumprir com as exigências legais vigentes, e em caso de falsidade ideológica, ficarei sujeito às sanções legais aplicáveis. Ainda, em razão da relação de emprego existente, autorizo expressamente o empregador acima qualificado a utilizar e replicar a informação acima por mim fornecida, em documentos e cadastros sejam internos ou externos, para fins de cumprimento de legislação e para regular o cadastro do vínculo empregatício.

Por ser verdade as informações acima, firmo o presente, para todos os fins de direito.`;

    doc.text(disclaimer, margin, y, { maxWidth: maxWidth, align: 'justify' });
    
    // Estimate height
    const dim = doc.getTextDimensions(disclaimer, { maxWidth: maxWidth });
    y += dim.h + 20;
    
    // Date and City
    const city = companyData.municipio || '______________________';
    const uf = companyData.uf || '__';
    
    const dateText = `${city}/${uf}, ________ de_______________________ de ___________.`;
    doc.text(dateText, margin, y);
    
    y += 30;
    
    // Signature
    doc.line(margin, y, margin + 80, y); // Line for signature
    y += 5;
    doc.text('Assinatura', margin, y);
    
    // Footer / Legal Note
    y = 270;
    doc.setFontSize(8);
    const footerText = `Lei nº 14.553, de 20 de abril de 2023: Altera os arts. 39 e 49 da Lei nº 12.288, de 20 de julho de 2010 (Estatuto da Igualdade Racial), para determinar procedimentos e critérios de coleta de informações relativas à distribuição dos segmentos étnicos e raciais no mercado de trabalho.`;
    
    doc.text(footerText, margin, y, { maxWidth: maxWidth, align: 'justify' });
    
    return Buffer.from(doc.output('arraybuffer'));
}
