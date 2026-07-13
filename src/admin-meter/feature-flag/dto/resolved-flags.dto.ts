import { ApiProperty } from '@nestjs/swagger';

export class ResolvedFlagsDto {
    @ApiProperty({
        description: 'Map of feature flag keys to their resolved boolean status',
        type: 'object',
        additionalProperties: { type: 'boolean' },
    })
    flags: Record<string, boolean>;
}
