export type QuestorZenCredentialSnapshot = {
  questor_zen_usuario?: string | null;
  questor_zen_senha?: string | null;
  questor_zen_token?: string | null;
};

export type QuestorZenCredentialChange = {
  field: 'questor_zen_usuario' | 'questor_zen_senha' | 'questor_zen_token';
  label: string;
  oldValue: string;
  newValue: string;
};

function normalizeNullableText(value: string | null | undefined, trim = true) {
  const text = value == null ? '' : String(value);
  const normalized = trim ? text.trim() : text;
  return normalized || null;
}

function maskToken(value: string | null | undefined) {
  const normalized = normalizeNullableText(value);
  if (!normalized) return 'Nao informado';
  if (normalized.length <= 8) return `${normalized.slice(0, 2)}***`;
  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`;
}

function describePasswordState(value: string | null | undefined) {
  const normalized = normalizeNullableText(value, false);
  return normalized ? 'Preenchida' : 'Nao informada';
}

function formatFieldValue(field: QuestorZenCredentialChange['field'], value: string | null | undefined) {
  if (field === 'questor_zen_senha') {
    return describePasswordState(value);
  }

  if (field === 'questor_zen_token') {
    return maskToken(value);
  }

  return normalizeNullableText(value) || 'Nao informado';
}

export function normalizeQuestorZenSnapshot(snapshot: QuestorZenCredentialSnapshot) {
  return {
    questor_zen_usuario: normalizeNullableText(snapshot.questor_zen_usuario),
    questor_zen_senha: normalizeNullableText(snapshot.questor_zen_senha, false),
    questor_zen_token: normalizeNullableText(snapshot.questor_zen_token),
  };
}

export function buildQuestorZenCredentialChanges(
  previous: QuestorZenCredentialSnapshot,
  current: QuestorZenCredentialSnapshot
): QuestorZenCredentialChange[] {
  const before = normalizeQuestorZenSnapshot(previous);
  const after = normalizeQuestorZenSnapshot(current);

  const fields: Array<{ field: QuestorZenCredentialChange['field']; label: string }> = [
    { field: 'questor_zen_usuario', label: 'Usuario Zen' },
    { field: 'questor_zen_senha', label: 'Senha Zen' },
    { field: 'questor_zen_token', label: 'Token Zen' },
  ];

  return fields
    .filter(({ field }) => before[field] !== after[field])
    .map(({ field, label }) => ({
      field,
      label,
      oldValue: formatFieldValue(field, before[field]),
      newValue: formatFieldValue(field, after[field]),
    }));
}
