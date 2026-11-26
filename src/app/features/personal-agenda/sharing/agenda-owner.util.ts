const OWNER_COLORS = ['#7b5bd6', '#d04f79', '#00897b', '#ef6c00', '#3974cf', '#8d6e63', '#6b8e23'];

export function agendaOwnerLabel(email: string): string {
  return (email.split('@')[0] || '').slice(0, 5);
}

export function agendaOwnerColor(userId: string): string {
  const hash = [...userId].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) | 0, 0);
  return OWNER_COLORS[Math.abs(hash) % OWNER_COLORS.length];
}
