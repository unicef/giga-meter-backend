import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { Prisma } from '@prisma/client';
import { GetFeatureFlagsQueryDto } from './dto/get-feature-flags.dto';
import { ResolveContext, FeatureFlagScope } from './feature-flag.types';

@Injectable()
export class FeatureFlagService {
    constructor(private prisma: PrismaService) { }

    async findAll(query: GetFeatureFlagsQueryDto) {
        const { limit, page, search } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.FeatureFlagWhereInput = search
            ? {
                OR: [
                    { key: { contains: search, mode: 'insensitive' } },
                    { name: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};

        const data = await this.prisma.featureFlag.findMany({
            where,
            skip,
            take: Number(limit),
            include: {
                overrides: true,
            },
            orderBy: { created_at: 'desc' }
        });

        const total = await this.prisma.featureFlag.count({ where });

        return {
            data,
            meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
            message: 'Successfully retrieved feature flags',
            status: 200
        };
    }

    async findOne(id: string) {
        const flag = await this.prisma.featureFlag.findUnique({
            where: { id },
            include: { overrides: true },
        });
        if (!flag) throw new NotFoundException('Feature flag not found');
        return flag;
    }

    async create(data: CreateFeatureFlagDto) {
        const exists = await this.prisma.featureFlag.findUnique({ where: { key: data.key } });
        if (exists) throw new ConflictException('Feature flag with this key already exists');

        const flag = await this.prisma.featureFlag.create({
            data,
        });
        return { data: flag, message: 'Feature flag created successfully', status: 201 };
    }

    async update(id: string, data: UpdateFeatureFlagDto) {
        await this.findOne(id);
        const flag = await this.prisma.featureFlag.update({
            where: { id },
            data,
        });
        return { data: flag, message: 'Feature flag updated successfully', status: 200 };
    }

    async remove(id: string) {
        await this.findOne(id);
        await this.prisma.featureFlag.delete({
            where: { id },
        });
        return { data: null, message: 'Feature flag deleted successfully', status: 200 };
    }

    async addOverride(featureFlagId: string, data: CreateOverrideDto) {
        await this.findOne(featureFlagId);

        // Check if unique constraint would be violated
        const existing = await this.prisma.featureFlagOverride.findUnique({
            where: {
                feature_flag_id_scope_scope_id: {
                    feature_flag_id: featureFlagId,
                    scope: data.scope,
                    scope_id: data.scope_id,
                },
            },
        });

        if (existing) {
            throw new ConflictException(`An override for this scope and ID already exists`);
        }

        const override = await this.prisma.featureFlagOverride.create({
            data: {
                ...data,
                feature_flag_id: featureFlagId,
            },
        });
        return { data: override, message: 'Override added successfully', status: 201 };
    }

    async removeOverride(id: string, overrideId: string) {
        const override = await this.prisma.featureFlagOverride.findUnique({
            where: { id: overrideId },
        });
        if (!override || override.feature_flag_id !== id) {
            throw new NotFoundException('Override not found');
        }

        await this.prisma.featureFlagOverride.delete({
            where: { id: overrideId },
        });
        return { data: null, message: 'Override removed successfully', status: 200 };
    }

    async isEnabled(key: string, context: ResolveContext = {}): Promise<boolean> {
        const flag = await this.prisma.featureFlag.findUnique({
            where: { key },
            include: { overrides: true },
        });

        if (!flag) return false;

        // 1. School Override
        if (context.gigaIdSchool) {
            const schoolOverride = flag.overrides.find(
                (o) => o.scope === FeatureFlagScope.SCHOOL && o.scope_id === context.gigaIdSchool
            );
            if (schoolOverride) {
                return schoolOverride.enabled;
            }
        }

        // 2. Country Override
        if (context.countryCode) {
            const countryOverride = flag.overrides.find(
                (o) => o.scope === FeatureFlagScope.COUNTRY && o.scope_id === context.countryCode
            );
            if (countryOverride) {
                return countryOverride.enabled;
            }
        }

        // 3. Global Default
        // For now we don't process PERCENTAGE flag logic, falling back to enabled boolean.
        return flag.enabled;
    }

    async resolveAll(context: ResolveContext = {}): Promise<Record<string, boolean>> {
        const flags = await this.prisma.featureFlag.findMany({
            include: { overrides: true },
        });

        const result: Record<string, boolean> = {};

        for (const flag of flags) {
            let isFlagEnabled = flag.enabled;

            // Overrides
            const schoolOverride = context.gigaIdSchool
                ? flag.overrides.find((o) => o.scope === FeatureFlagScope.SCHOOL && o.scope_id === context.gigaIdSchool)
                : undefined;

            const countryOverride = context.countryCode
                ? flag.overrides.find((o) => o.scope === FeatureFlagScope.COUNTRY && o.scope_id === context.countryCode)
                : undefined;

            if (schoolOverride) {
                isFlagEnabled = schoolOverride.enabled;
            } else if (countryOverride) {
                isFlagEnabled = countryOverride.enabled;
            }

            result[flag.key] = isFlagEnabled;
        }

        return result;
    }
}
