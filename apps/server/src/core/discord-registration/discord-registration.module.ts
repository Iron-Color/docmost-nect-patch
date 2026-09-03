import { Module } from '@nestjs/common';
import { DiscordRegistrationController } from './discord-registration.controller';
import { DiscordRegistrationService } from './discord-registration.service';

@Module({
  controllers: [DiscordRegistrationController],
  providers: [DiscordRegistrationService],
})
export class DiscordRegistrationModule {}
