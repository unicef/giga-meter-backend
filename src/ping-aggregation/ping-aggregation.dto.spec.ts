import {
  GetRawPingsQueryDto,
  GetRawPingsResponseDto,
} from './ping-aggregation.dto';

describe('PingAggregationDto', () => {
  it('should be defined', () => {
    expect(new GetRawPingsQueryDto()).toBeDefined();
    expect(new GetRawPingsResponseDto()).toBeDefined();
  });
});
