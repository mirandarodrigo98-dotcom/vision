export type EmployeeHistoryRequestType =
  | 'ALTERACAO_DADOS'
  | 'ALTERACAO_SALARIO'
  | 'ALTERACAO_CARGO'
  | 'ALTERACAO_ESCALA'
  | 'ALTERACAO_DEPENDENTES'
  | 'ALTERACAO_VALE_TRANSPORTE'
  | 'ALTERACAO_BENEFICIOS'
  | 'EXAMES_MEDICOS'
  | 'CAT';

export type EmployeeHistoryStatus =
  | 'SUBMITTED'
  | 'RECTIFIED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface EmployeeHistoryTypeConfig {
  value: EmployeeHistoryRequestType;
  label: string;
  shortLabel: string;
  description: string;
  currentLabel: string;
  requestedLabel: string;
  detailsLabel: string;
  effectiveDateLabel: string;
  attachmentLabel: string;
  attachmentHint?: string;
  attachmentRecommended?: boolean;
  attachmentRequired?: boolean;
  emailNewLabel: string;
  emailUpdateLabel: string;
  emailCompletedLabel: string;
}

export const EMPLOYEE_HISTORY_TYPES: EmployeeHistoryTypeConfig[] = [
  {
    value: 'ALTERACAO_DADOS',
    label: 'Alteração de Dados do Funcionário',
    shortLabel: 'Dados do Funcionário',
    description: 'Estado civil, nome de casado, endereço, contatos e demais dados cadastrais.',
    currentLabel: 'Dados atuais',
    requestedLabel: 'Dados que devem ser alterados',
    detailsLabel: 'Detalhamento da alteração',
    effectiveDateLabel: 'Data para atualização',
    attachmentLabel: 'Documento de apoio',
    attachmentHint: 'Anexe comprovantes como certidão, RG, comprovante de endereço ou outro documento relacionado.',
    attachmentRecommended: true,
    emailNewLabel: 'alteração de dados do funcionário',
    emailUpdateLabel: 'retificação de alteração de dados do funcionário',
    emailCompletedLabel: 'alteração de dados do funcionário',
  },
  {
    value: 'ALTERACAO_SALARIO',
    label: 'Alteração de Salário',
    shortLabel: 'Salário',
    description: 'Solicitação para reajuste ou mudança de remuneração do colaborador.',
    currentLabel: 'Salário atual',
    requestedLabel: 'Novo salário / condição solicitada',
    detailsLabel: 'Detalhamento da alteração salarial',
    effectiveDateLabel: 'Data de vigência',
    attachmentLabel: 'Documento de apoio',
    attachmentHint: 'Anexe carta, acordo, convenção ou documento interno, se houver.',
    attachmentRecommended: true,
    emailNewLabel: 'alteração de salário',
    emailUpdateLabel: 'retificação de alteração de salário',
    emailCompletedLabel: 'alteração de salário',
  },
  {
    value: 'ALTERACAO_CARGO',
    label: 'Alteração de Cargos',
    shortLabel: 'Cargo',
    description: 'Mudança de cargo, função ou descrição principal do colaborador.',
    currentLabel: 'Cargo atual',
    requestedLabel: 'Novo cargo / função solicitada',
    detailsLabel: 'Detalhamento da alteração de cargo',
    effectiveDateLabel: 'Data de vigência',
    attachmentLabel: 'Documento de apoio',
    attachmentHint: 'Anexe documento interno, promoção aprovada ou descrição da nova função, se houver.',
    attachmentRecommended: true,
    emailNewLabel: 'alteração de cargo',
    emailUpdateLabel: 'retificação de alteração de cargo',
    emailCompletedLabel: 'alteração de cargo',
  },
  {
    value: 'ALTERACAO_ESCALA',
    label: 'Alteração de Escalas',
    shortLabel: 'Escala',
    description: 'Mudança de jornada, horário, turno ou escala de trabalho.',
    currentLabel: 'Escala atual',
    requestedLabel: 'Nova escala / jornada solicitada',
    detailsLabel: 'Detalhamento da alteração de escala',
    effectiveDateLabel: 'Data de vigência',
    attachmentLabel: 'Documento de apoio',
    attachmentHint: 'Anexe autorização, acordo ou cronograma da nova escala, se houver.',
    attachmentRecommended: true,
    emailNewLabel: 'alteração de escala',
    emailUpdateLabel: 'retificação de alteração de escala',
    emailCompletedLabel: 'alteração de escala',
  },
  {
    value: 'ALTERACAO_DEPENDENTES',
    label: 'Alteração de Dependentes',
    shortLabel: 'Dependentes',
    description: 'Inclusão, exclusão ou atualização de dependentes do colaborador.',
    currentLabel: 'Situação atual dos dependentes',
    requestedLabel: 'Inclusão / exclusão / ajuste solicitado',
    detailsLabel: 'Detalhamento dos dependentes',
    effectiveDateLabel: 'Data da alteração',
    attachmentLabel: 'Documento de apoio',
    attachmentHint: 'Anexe certidão, CPF, comprovantes ou documentação do dependente.',
    attachmentRecommended: true,
    emailNewLabel: 'alteração de dependentes',
    emailUpdateLabel: 'retificação de alteração de dependentes',
    emailCompletedLabel: 'alteração de dependentes',
  },
  {
    value: 'ALTERACAO_VALE_TRANSPORTE',
    label: 'Alteração de Vale Transporte',
    shortLabel: 'Vale Transporte',
    description: 'Inclusão, exclusão ou ajuste das informações de vale transporte.',
    currentLabel: 'Situação atual do vale transporte',
    requestedLabel: 'Inclusão / exclusão / ajuste solicitado',
    detailsLabel: 'Detalhamento do vale transporte',
    effectiveDateLabel: 'Data da alteração',
    attachmentLabel: 'Documento de apoio',
    attachmentHint: 'Anexe rota, linhas, cartões ou comprovantes relacionados, se houver.',
    attachmentRecommended: true,
    emailNewLabel: 'alteração de vale transporte',
    emailUpdateLabel: 'retificação de alteração de vale transporte',
    emailCompletedLabel: 'alteração de vale transporte',
  },
  {
    value: 'ALTERACAO_BENEFICIOS',
    label: 'Alteração de Benefícios',
    shortLabel: 'Benefícios',
    description: 'Inclusão, exclusão ou ajuste de benefícios como vale alimentação e refeição.',
    currentLabel: 'Benefícios atuais',
    requestedLabel: 'Inclusão / exclusão / ajuste solicitado',
    detailsLabel: 'Detalhamento dos benefícios',
    effectiveDateLabel: 'Data da alteração',
    attachmentLabel: 'Documento de apoio',
    attachmentHint: 'Anexe política interna, solicitação formal ou documento do benefício, se houver.',
    attachmentRecommended: true,
    emailNewLabel: 'alteração de benefícios',
    emailUpdateLabel: 'retificação de alteração de benefícios',
    emailCompletedLabel: 'alteração de benefícios',
  },
  {
    value: 'EXAMES_MEDICOS',
    label: 'Exames Médicos',
    shortLabel: 'Exames Médicos',
    description: 'Envio de atestados, ASO demissional, periódico ou demais documentos médicos ocupacionais.',
    currentLabel: 'Tipo / situação do exame',
    requestedLabel: 'Solicitação / documento enviado',
    detailsLabel: 'Detalhamento do exame ou atestado',
    effectiveDateLabel: 'Data do exame / atendimento',
    attachmentLabel: 'Documento médico',
    attachmentHint: 'Anexe atestado, ASO, laudo ou documento equivalente.',
    attachmentRequired: true,
    emailNewLabel: 'exame médico',
    emailUpdateLabel: 'retificação de exame médico',
    emailCompletedLabel: 'exame médico',
  },
  {
    value: 'CAT',
    label: 'CAT - Comunicado de Acidente de Trabalho',
    shortLabel: 'CAT',
    description: 'Comunicação de acidente de trabalho e envio de documentos da ocorrência.',
    currentLabel: 'Resumo da ocorrência',
    requestedLabel: 'Providência / registro solicitado',
    detailsLabel: 'Detalhamento do acidente de trabalho',
    effectiveDateLabel: 'Data da ocorrência',
    attachmentLabel: 'Documento da ocorrência',
    attachmentHint: 'Anexe atestado, boletim, laudo, CAT parcial ou qualquer documento relacionado.',
    attachmentRequired: true,
    emailNewLabel: 'comunicado de acidente de trabalho',
    emailUpdateLabel: 'retificação de comunicado de acidente de trabalho',
    emailCompletedLabel: 'comunicado de acidente de trabalho',
  },
];

export const EMPLOYEE_HISTORY_STATUS_LABELS: Record<EmployeeHistoryStatus, string> = {
  SUBMITTED: 'Solicitado',
  RECTIFIED: 'Retificado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export function getEmployeeHistoryTypeConfig(type: string) {
  return EMPLOYEE_HISTORY_TYPES.find((item) => item.value === type) || EMPLOYEE_HISTORY_TYPES[0];
}

export function getEmployeeHistoryStatusLabel(status: string) {
  return EMPLOYEE_HISTORY_STATUS_LABELS[status as EmployeeHistoryStatus] || status;
}

export function getEmployeeHistoryNotificationTitle(type: string, statusLabel: string) {
  const config = getEmployeeHistoryTypeConfig(type);
  return `Históricos - ${config.shortLabel} ${statusLabel}`;
}
