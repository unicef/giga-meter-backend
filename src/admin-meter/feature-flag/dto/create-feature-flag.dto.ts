import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { FeatureFlagType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeatureFlagDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ enum: FeatureFlagType })
    @IsEnum(FeatureFlagType)
    flag_type: FeatureFlagType;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiPropertyOptional({ minimum: 0, maximum: 100 })
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    percentage?: number;
}
