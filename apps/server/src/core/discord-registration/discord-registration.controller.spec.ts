import { ForbiddenException, HttpStatus } from '@nestjs/common';
import { DiscordRegistrationController } from './discord-registration.controller';

describe('DiscordRegistrationController callback', () => {
  const workspace = { hostname: 'docs', enforceMfa: false } as any;
  const reply = () => ({ redirect: jest.fn() }) as any;
  const createController = (handleCallback: jest.Mock) =>
    new DiscordRegistrationController(
      { handleCallback } as any,
      {} as any,
      {} as any,
      {} as any,
      { getUrl: () => 'https://docs.example.com' } as any,
    );

  it('uses an explicit 302 status when Discord authorization is denied', async () => {
    const controller = createController(jest.fn());
    const res = reply();

    await controller.callback(
      { state: 'state', error: 'access_denied' },
      workspace,
      res,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      'https://docs.example.com/register/discord?error=oauth_denied',
      HttpStatus.FOUND,
    );
  });

  it('uses an explicit 302 status after successful verification', async () => {
    const controller = createController(
      jest.fn().mockResolvedValue('registration-token'),
    );
    const res = reply();

    await controller.callback(
      { state: 'state', code: 'authorization-code' },
      workspace,
      res,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      'https://docs.example.com/register/discord#token=registration-token',
      HttpStatus.FOUND,
    );
  });

  it('uses an explicit 302 status when the Discord role is not allowed', async () => {
    const controller = createController(
      jest.fn().mockRejectedValue(new ForbiddenException()),
    );
    const res = reply();

    await controller.callback(
      { state: 'state', code: 'authorization-code' },
      workspace,
      res,
    );

    expect(res.redirect).toHaveBeenCalledWith(
      'https://docs.example.com/register/discord?error=not_eligible',
      HttpStatus.FOUND,
    );
  });
});
