/**
 * Formata e extrai o nome de exibição ideal para um membro da família.
 * Dá preferência ao apelido / nome familiar configurado (ex: "Flávio", "Rafa", "Pai").
 * Se não houver apelido, extrai o primeiro nome de "name" (ex: "Flavio Dias Santiago" -> "Flavio").
 */
export const getMemberDisplayName = (member?: { name: string; nickname?: string | null } | null): string => {
  if (!member) return '';
  if (member.nickname && member.nickname.trim()) return member.nickname.trim();
  return member.name.trim().split(' ')[0];
};

/**
 * Retorna o primeiro nome a partir de uma string de nome completo.
 * Útil para fallbacks gerais onde só temos uma string avulsa de texto.
 */
export const getFirstName = (name?: string | null): string => {
  if (!name) return '';
  return name.trim().split(' ')[0] || '';
};
