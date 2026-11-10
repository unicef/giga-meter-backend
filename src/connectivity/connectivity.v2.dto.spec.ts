import { ValidationPipe } from '@nestjs/common';
import { CreateConnectivityV2Dto } from './connectivity.v2.dto';

// Same pipe options as ConnectivityV2Controller.
const pipe = new ValidationPipe({ whitelist: true, transform: true });
const transform = (body: unknown) =>
  pipe.transform(body, { type: 'body', metatype: CreateConnectivityV2Dto });

describe('CreateConnectivityV2Dto', () => {
  it('keeps every record field the app sends', async () => {
    const dto = await transform({
      facility_type: 'health',
      giga_id_health: 'HF-1',
      records: [
        {
          timestamp: '2026-10-14T10:00:00.000Z',
          isConnected: true,
          errorMessage: 'none',
          app_local_uuid: 'uuid-1',
          latency: 25,
        },
      ],
    });

    expect(dto.records[0]).toEqual({
      timestamp: new Date('2026-10-14T10:00:00.000Z'),
      isConnected: true,
      errorMessage: 'none',
      app_local_uuid: 'uuid-1',
      latency: 25,
    });
  });

  it('rejects a timestamp that is not a date', async () => {
    await expect(
      transform({
        facility_type: 'health',
        records: [{ timestamp: 'yesterday', isConnected: true, app_local_uuid: 'u' }],
      }),
    ).rejects.toThrow();
  });
});
