import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from './environment.validation';

const baseEnvironment = {
  APP_SECRET: 'a-secure-application-secret-of-32-characters',
  DATABASE_URL: 'postgresql://docmost:password@localhost:5432/docmost',
  REDIS_URL: 'redis://localhost:6379',
};

describe('source code environment validation', () => {
  it('requires a source code URL', () => {
    const environment = plainToInstance(EnvironmentVariables, baseEnvironment);
    const errors = validateSync(environment);

    expect(errors.some((error) => error.property === 'SOURCE_CODE_URL')).toBe(
      true,
    );
  });

  it('accepts an exact source URL and revision', () => {
    const environment = plainToInstance(EnvironmentVariables, {
      ...baseEnvironment,
      SOURCE_CODE_URL:
        'https://github.com/example/docmost-nect-patch/tree/0123456789abcdef',
      SOURCE_CODE_REVISION: '0123456789abcdef',
    });
    const errors = validateSync(environment);

    expect(errors.find((error) => error.property === 'SOURCE_CODE_URL')).toBe(
      undefined,
    );
    expect(
      errors.find((error) => error.property === 'SOURCE_CODE_REVISION'),
    ).toBe(undefined);
  });
});
