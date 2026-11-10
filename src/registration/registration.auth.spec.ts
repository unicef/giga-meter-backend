import { IS_PUBLIC_KEY } from '../common/public.decorator';
import { RegistrationController } from './registration.controller';
import { RegistrationV2Controller } from './registration.v2.controller';

// These routes create, expose and deactivate device registrations. Like the
// v1 dailycheckapp_schools routes, they must go through the app key.
describe('registration routes require the app key', () => {
  it.each([
    [RegistrationV2Controller, 'createRegistration'],
    [RegistrationV2Controller, 'findExisting'],
    [RegistrationV2Controller, 'getStatus'],
    [RegistrationV2Controller, 'deactivate'],
    [RegistrationController, 'createRegistration'],
  ])('%p.%s is not public', (controller: any, method: string) => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, controller)).toBeUndefined();
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, controller.prototype[method]),
    ).toBeUndefined();
  });
});
