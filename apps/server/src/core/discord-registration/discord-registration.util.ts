export type DiscordRegistrationRule = {
  id: string;
  guildId: string;
  roleId: string;
};

export function findMatchingDiscordRegistrationRule(
  guildId: string,
  memberRoleIds: string[],
  rules: DiscordRegistrationRule[],
): DiscordRegistrationRule | null {
  const roles = new Set(memberRoleIds);
  return (
    rules.find((rule) => rule.guildId === guildId && roles.has(rule.roleId)) ??
    null
  );
}
