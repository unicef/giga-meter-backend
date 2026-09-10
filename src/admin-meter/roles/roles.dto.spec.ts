import { CreateOrUpdateRoleDto } from './roles.dto';

describe('CreateOrUpdateRoleDto', () => {
  it('should be defined', () => {
    expect(new CreateOrUpdateRoleDto()).toBeDefined();
  });
});
