export type DiscordRegistrationRule = {
  id: string;
  guildId: string;
  roleIds: string[];
  roleMatchMode: 'any' | 'all';
};

export function findMatchingDiscordRegistrationRule(
  guildId: string,
  memberRoleIds: string[],
  rules: DiscordRegistrationRule[],
): DiscordRegistrationRule | null {
  const roles = new Set(memberRoleIds);
  return (
    rules.find((rule) => {
      if (rule.guildId !== guildId) {
        return false;
      }

      return rule.roleMatchMode === 'all'
        ? rule.roleIds.every((roleId) => roles.has(roleId))
        : rule.roleIds.some((roleId) => roles.has(roleId));
    }) ?? null
  );
}
