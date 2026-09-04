import { Transform, TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NoUrls } from '../../common/validators/no-urls.validator';

const discordSnowflake = /^\d{17,20}$/;

export class CreateDiscordRegistrationConfigDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @NoUrls()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  label: string;

  @IsString()
  @Matches(discordSnowflake, { message: 'Invalid Discord server ID' })
  guildId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(discordSnowflake, {
    each: true,
    message: 'Invalid Discord role ID',
  })
  roleIds: string[];

  @IsString()
  @IsIn(['any', 'all'])
  roleMatchMode: 'any' | 'all';
}

export class DeleteDiscordRegistrationConfigDto {
  @IsUUID()
  configId: string;
}

export class DiscordRegistrationTokenDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  token: string;
}

export class CompleteDiscordRegistrationDto extends DiscordRegistrationTokenDto {
  @MinLength(2)
  @MaxLength(60)
  @IsString()
  @NoUrls()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  name: string;

  @MinLength(8)
  @MaxLength(70)
  @IsString()
  password: string;
}

export class DiscordOAuthCallbackDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  state: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  error?: string;
}
