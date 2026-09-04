import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateDiscordRegistrationConfigDto } from './discord-registration.dto';

describe('CreateDiscordRegistrationConfigDto', () => {
  const validConfig = {
    label: 'Approved members',
    guildId: '123456789012345678',
    roleIds: ['223456789012345678', '323456789012345678'],
    roleMatchMode: 'any',
  };

  function validate(overrides: Record<string, unknown> = {}) {
    return validateSync(
      plainToInstance(CreateDiscordRegistrationConfigDto, {
        ...validConfig,
        ...overrides,
      }),
    );
  }

  it.each(['any', 'all'])('accepts the %s role match mode', (roleMatchMode) => {
    expect(validate({ roleMatchMode })).toHaveLength(0);
  });

  it('rejects duplicate role IDs', () => {
    expect(
      validate({
        roleIds: ['223456789012345678', '223456789012345678'],
      }).some((error) => error.property === 'roleIds'),
    ).toBe(true);
  });

  it('rejects more than ten role IDs', () => {
    const roleIds = Array.from(
      { length: 11 },
      (_, index) => `12345678901234567${index}`,
    );

    expect(
      validate({ roleIds }).some((error) => error.property === 'roleIds'),
    ).toBe(true);
  });

  it('rejects unsupported match modes', () => {
    expect(
      validate({ roleMatchMode: 'none' }).some(
        (error) => error.property === 'roleMatchMode',
      ),
    ).toBe(true);
  });
});
