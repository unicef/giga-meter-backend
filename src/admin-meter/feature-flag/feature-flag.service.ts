import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateFeatureFlagDto,
  FeatureFlagListingDto,
  UpdateFeatureFlagDto,
} from './feature-flag.dto';
import { Prisma } from '@prisma/client';
import { serializeBigInt } from 'src/utility/utility';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class FeatureFlagService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateFeatureFlagDto, userId: number) {
    const { name, description } = createDto;
    const newFeatureFlag = await this.prisma.featureFlag.create({
      data: {
        name,
        description,
        is_active: false, // Flags are inactive by default
        last_modified_by_id: userId,
        created_by_id: userId,
      },
    });
    return newFeatureFlag;
  }

  async findAll(params: FeatureFlagListingDto) {
    const { page, limit, search, feature_id } = plainToInstance(
      FeatureFlagListingDto,
      params,
    );

    const where: Prisma.FeatureFlagWhereInput = {};
    if (feature_id) {
      where.id = feature_id;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.featureFlag.count({ where }),
      this.prisma.featureFlag.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    return {
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      data: serializeBigInt(data),
    };
  }

  async featureFlagUpdate(
    id: number,
    valuesDto: UpdateFeatureFlagDto,
    userId: number,
  ) {
    const inputData = plainToInstance(UpdateFeatureFlagDto, valuesDto);

    const featureFlag = await this.prisma.featureFlag.findUnique({
      where: { id },
    });

    if (!featureFlag) {
      throw new NotFoundException(`Feature flag with ID ${id} not found`);
    }

    const updatedFeatureFlag = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        ...inputData,
        last_modified_by_id: userId,
        updated_at: new Date(),
      },
    });

    return updatedFeatureFlag;
  }
}
