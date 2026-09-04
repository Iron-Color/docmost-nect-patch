import { findMatchingDiscordRegistrationRule } from './discord-registration.util';

describe('findMatchingDiscordRegistrationRule', () => {
  const rules = [
    {
      id: 'one',
      guildId: 'guild-a',
      roleIds: ['role-a', 'role-c'],
      roleMatchMode: 'any' as const,
    },
    {
      id: 'two',
      guildId: 'guild-b',
      roleIds: ['role-b', 'role-c'],
      roleMatchMode: 'all' as const,
    },
  ];

  it('accepts an OR rule when any configured role matches', () => {
    expect(
      findMatchingDiscordRegistrationRule('guild-a', ['role-c'], rules),
    ).toEqual(rules[0]);
  });

  it('accepts an AND rule only when every configured role matches', () => {
    expect(
      findMatchingDiscordRegistrationRule(
        'guild-b',
        ['role-c', 'other', 'role-b'],
        rules,
      ),
    ).toEqual(rules[1]);
  });

  it('rejects an AND rule when one configured role is missing', () => {
    expect(
      findMatchingDiscordRegistrationRule('guild-b', ['role-b'], rules),
    ).toBeNull();
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
