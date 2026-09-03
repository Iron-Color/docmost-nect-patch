import { findMatchingDiscordRegistrationRule } from './discord-registration.util';

describe('findMatchingDiscordRegistrationRule', () => {
  const rules = [
    { id: 'one', guildId: 'guild-a', roleId: 'role-a' },
    { id: 'two', guildId: 'guild-b', roleId: 'role-b' },
  ];

  it('accepts a rule only when both server and role match', () => {
    expect(
      findMatchingDiscordRegistrationRule(
        'guild-b',
        ['other', 'role-b'],
        rules,
      ),
    ).toEqual(rules[1]);
  });

  it('rejects a role from a different server', () => {
    expect(
      findMatchingDiscordRegistrationRule('guild-a', ['role-b'], rules),
    ).toBeNull();
  });

  it('rejects a member without an allowed role', () => {
    expect(
      findMatchingDiscordRegistrationRule('guild-a', ['other'], rules),
    ).toBeNull();
  });
});
