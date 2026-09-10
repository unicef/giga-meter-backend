import { IsEnum, IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { FeatureFlagScope } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOverrideDto {
    @ApiProperty({ enum: FeatureFlagScope })
    @IsEnum(FeatureFlagScope)
    scope: FeatureFlagScope;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scope_id: string;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}
