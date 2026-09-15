import { GUARDS_METADATA } from '@nestjs/common/constants';
import { GeolocationController } from './geolocation.controller';
import { AuthGuard } from '../auth/auth.guard';
import { IS_PUBLIC_KEY } from '../common/public.decorator';

// The Google proxy is billed per call against a shared API key, so it must
// never be reachable without the same bearer token the measurement endpoints
// require. Guard against a `@Public()` decorator creeping back in.
describe('Geolocation authentication', () => {
  it('does not expose geolocate publicly', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, GeolocationController.prototype.geolocate),
    ).toBeUndefined();
  });

  it('protects geolocate with the AuthGuard', () => {
    const guards =
      Reflect.getMetadata(
        GUARDS_METADATA,
        GeolocationController.prototype.geolocate,
      ) ?? [];

    expect(guards).toContain(AuthGuard);
  });

  it('is not marked public at the controller level', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, GeolocationController),
    ).toBeUndefined();
  });
});
