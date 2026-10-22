import { firstValueFrom, of } from 'rxjs';
import {
  Category,
  CategoryConfigType,
  GIGA_METER_APP_ALLOWED_APIS,
  GIGA_METER_APP_RESPONSE_FILTERS,
} from './category.config';
import { CategoryConfigProvider } from './category-config.provider';
import { CategoryResponseInterceptor } from './category.interceptor';

const providerWithRows = (rows: Partial<CategoryConfigType>[]) =>
  new CategoryConfigProvider({ findAll: async () => rows } as any);

// An empty table: the provider falls back to the static configuration.
const staticProvider = () => providerWithRows([]);

const row = (name: string, extra: Partial<CategoryConfigType> = {}) => ({
  name,
  isDefault: false,
  allowedAPIs: [],
  notAllowedAPIs: [],
  responseFilters: {},
  allowedCountries: [],
  swagger: { visible: true },
  ...extra,
});

describe('GIGA_METER_APP category', () => {
  describe('is owned by code', () => {
    const appConfig = async (provider: CategoryConfigProvider) => {
      await provider.initialize();
      return provider.getCategoryConfig('giga_meter_app');
    };

    it('exists when category_config is empty', async () => {
      const config = await appConfig(staticProvider());
      expect(config.allowedAPIs).toEqual(GIGA_METER_APP_ALLOWED_APIS);
    });

    it('exists when category_config has other rows, which stay as they are', async () => {
      const provider = providerWithRows([
        row('PUBLIC', { isDefault: true }),
        row('GIGA_METER'),
      ]);
      const config = await appConfig(provider);

      expect(config.allowedAPIs).toEqual(GIGA_METER_APP_ALLOWED_APIS);
      expect(config.responseFilters).toEqual(GIGA_METER_APP_RESPONSE_FILTERS);
      expect(await provider.getCategories()).toEqual([
        'PUBLIC',
        'GIGA_METER',
        Category.GIGA_METER_APP,
      ]);
      expect(await provider.getDefaultCategory()).toBe('PUBLIC');
    });

    it('ignores a category_config row with the same name', async () => {
      const provider = providerWithRows([
        row('PUBLIC', { isDefault: true }),
        row('giga_meter_app', { isDefault: true }),
      ]);
      const config = await appConfig(provider);

      expect(config.allowedAPIs).toEqual(GIGA_METER_APP_ALLOWED_APIS);
      expect(await provider.hasApiAccess(config, '/api/v1/measurements', 'GET')).toBe(false);
      expect(await provider.getDefaultCategory()).toBe('PUBLIC');
    });

    it('does not let a lone row of its own replace the static categories', async () => {
      const provider = providerWithRows([row('GIGA_METER_APP')]);
      await provider.initialize();

      expect(await provider.getCategoryConfig('giga_meter')).toBeDefined();
      expect(await provider.getDefaultCategory()).toBe(Category.PUBLIC);
    });
  });

  describe('route access', () => {
    let provider: CategoryConfigProvider;
    let canCall: (method: string, path: string) => Promise<boolean>;

    beforeAll(async () => {
      provider = staticProvider();
      await provider.initialize();
      // The guard looks the category up by the lowercased apiCategory code.
      const config = await provider.getCategoryConfig('giga_meter_app');
      canCall = (method, path) => provider.hasApiAccess(config, path, method);
    });

    // Every call some released app version makes (v1.0.0 to v2.0.4).
    it.each([
      ['GET', '/api/v1/dailycheckapp_countries/BR'],
      ['POST', '/api/v1/dailycheckapp_schools'],
      ['PUT', '/api/v1/dailycheckapp_schools/deactivate'],
      ['GET', '/api/v1/dailycheckapp_schools/0b2c7d5e-giga-id'],
      ['GET', '/api/v1/dailycheckapp_schools/features_flags'],
      ['GET', '/api/v1/dailycheckapp_schools/checkExistingInstallation/HW-123'],
      ['GET', '/api/v1/dailycheckapp_schools/checkDeviceStatus/HW-123/giga-1'],
      ['GET', '/api/v1/dailycheckapp_data_fix/giga-1'],
      ['POST', '/api/v1/flagged_dailycheckapp_schools'],
      ['GET', '/api/v1/schools/country_code_school_id/BR/42'],
      ['GET', '/api/v1/schools/features_flags/giga-1'],
      ['POST', '/api/v1/measurements'],
      ['POST', '/api/v1/measurements/multiple'],
      ['POST', '/api/v1/connectivity/giga-1'],
      ['GET', '/api/v1/ip-metadata'],
      ['GET', '/api/v1/ip-metadata/203.0.113.7'],
      ['POST', '/api/v1/geolocation/geolocate'],
    ])('allows %s %s', async (method, path) => {
      expect(await canCall(method, path)).toBe(true);
    });

    it.each([
      ['GET', '/api/v1/measurements'],
      ['GET', '/api/v1/measurements/v2'],
      ['GET', '/api/v1/measurements/failed'],
      ['GET', '/api/v1/measurements/123'],
      ['GET', '/api/v1/measurements/school_id/42'],
      ['GET', '/api/v1/dailycheckapp_schools'],
      ['GET', '/api/v1/dailycheckapp_schools/'],
      ['GET', '/api/v1/dailycheckapp_schools/id/1'],
      ['GET', '/api/v1/dailycheckapp_schools/country_id/BR'],
      ['GET', '/api/v1/dailycheckapp_schools/checkNotify/user-1'],
      ['GET', '/api/v1/dailycheckapp_schools/giga-1/connectivity'],
      ['GET', '/api/v1/connectivity'],
      ['GET', '/api/v1/flagged_dailycheckapp_schools'],
      ['GET', '/api/v1/public/measurements'],
      ['GET', '/api/v1/ip-metadata/debug-ip/extra'],
      ['GET', '/api/v1/admin/schools'],
      ['PUT', '/api/v1/admin/blockSchools'],
      ['PUT', '/api/v1/admin/notifySchools'],
      ['POST', '/api/v1/dailycheckapp_countries'],
      ['DELETE', '/api/v1/dailycheckapp_countries/BR'],
      ['PUT', '/api/v1/schools/features_flags/giga-1'],
      ['GET', '/api/v1/ping-aggregation/sync'],
      ['GET', '/api/v1/ping-aggregation/raw-ping-records'],
      ['GET', '/api/v1/category-config'],
      ['GET', '/api/v1/messages'],
    ])('denies %s %s', async (method, path) => {
      expect(await canCall(method, path)).toBe(false);
    });
  });

  describe('school lookup by giga id', () => {
    it('returns only whether the school has registrations', async () => {
      const provider = staticProvider();
      await provider.initialize();
      const interceptor = new CategoryResponseInterceptor(provider);
      const request = {
        category: Category.GIGA_METER_APP.toLowerCase(),
        route: { path: '/api/v1/dailycheckapp_schools/:giga_id_school' },
      };
      const response = {
        success: true,
        data: [
          {
            id: '1',
            giga_id_school: 'giga-1',
            user_id: 'user-1',
            device_hardware_id: 'HW-123',
            mac_address: '00:11:22:33:44:55',
            ip_address: '203.0.113.7',
            windows_username: 'teacher',
          },
        ],
      };

      const result = await (await firstValueFrom(
        interceptor.intercept(
          { switchToHttp: () => ({ getRequest: () => request }) } as any,
          { handle: () => of(response) },
        ),
      ));

      expect(result.data).toEqual([{ id: '1', giga_id_school: 'giga-1' }]);
    });
  });
});
