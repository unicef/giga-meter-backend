import { measurements, measurements_failed } from '@prisma/client';
import { toBigInt } from './common.utils';
import { MeasurementDto } from 'src/measurement/measurement.dto';
import { MetricsDto } from 'src/metrics/metrics.dto';

// NOTE: mock<>Model objects are the ones fetched from database and mock<>Dto objects are the ones mapped which are returned from service
export const mockMessagesModel = [
  {
    id: 1,
    created: new Date('2022-10-03T20:42:34.343Z'),
    modified: new Date('2022-10-03T20:42:34.343Z'),
    firstname: 'Aditya',
    lastname: 'Acharya',
    school_id: '123456',
    email: 'aditya@unicef.org',
    message: 'test message',
    created_at: null,
  },
  {
    id: 2,
    created: new Date('2024-10-03T20:42:34.343Z'),
    modified: new Date('2024-10-03T20:42:34.343Z'),
    firstname: 'Aditya',
    lastname: 'Acharya',
    school_id: '654321',
    email: 'aditya@unicef.org',
    message: '2nd test message',
    created_at: null,
  },
];

export const mockMessagesDto = [
  {
    id: '1',
    created_date: '2022-10-03T20:42:34.343Z',
    modified_date: '2022-10-03T20:42:34.343Z',
    firstname: 'Aditya',
    lastname: 'Acharya',
    school_id: '123456',
    email: 'aditya@unicef.org',
    message: 'test message',
    created_at: null,
  },
  {
    id: '2',
    created_date: '2024-10-03T20:42:34.343Z',
    modified_date: '2024-10-03T20:42:34.343Z',
    firstname: 'Aditya',
    lastname: 'Acharya',
    school_id: '654321',
    email: 'aditya@unicef.org',
    message: '2nd test message',
    created_at: null,
  },
];

export const mockAdminSchoolDto = [
  {
    id: 1,
    user_id: 'test_id1',
    giga_id_school: 'gigaid1',
    mac_address: 'string',
    os: 'string',
    app_version: 'string',
    created: 'string',
    network_information: null,
    ip_address: 'string',
    country_code: 'string',
    is_blocked: false,
    created_at: new Date('2024-04-12T04:13:37.300Z'),
  },
  {
    id: 2,
    user_id: 'test_id',
    giga_id_school: 'gigaid2',
    mac_address: 'string',
    os: 'string',
    app_version: 'string',
    created: 'string',
    network_information: null,
    ip_address: 'string',
    country_code: 'string',
    is_blocked: true,
    created_at: new Date('2024-04-12T04:14:03.650Z'),
  },
];

export const mockSchoolDto = [
  {
    id: '1',
    user_id: 'test_id1',
    giga_id_school: 'gigaid1',
    mac_address: 'string',
    os: 'string',
    app_version: 'string',
    created: 'string',
    network_information: null,
    ip_address: 'string',
    country_code: 'string',
    is_blocked: false,
    created_at: new Date('2024-04-12T04:13:37.300Z'),
  },
  {
    id: '2',
    user_id: 'test_id',
    giga_id_school: 'gigaid2',
    mac_address: 'string',
    os: 'string',
    app_version: 'string',
    created: 'string',
    network_information: null,
    ip_address: 'string',
    country_code: 'string',
    is_blocked: true,
    created_at: new Date('2024-04-12T04:14:03.650Z'),
  },
];

export const mockSchoolModel = [
  {
    id: toBigInt(1),
    user_id: 'test_id1',
    giga_id_school: 'gigaid1',
    mac_address: 'string',
    os: 'string',
    app_version: 'string',
    created: 'string',
    network_information: null,
    ip_address: 'string',
    country_code: 'string',
    is_blocked: false,
    notify: true,
    created_at: new Date('2024-04-12T04:13:37.300Z'),
  },
  {
    id: toBigInt(2),
    user_id: 'test_id',
    giga_id_school: 'gigaid2',
    mac_address: 'string',
    os: 'string',
    app_version: 'string',
    created: 'string',
    network_information: null,
    ip_address: 'string',
    country_code: 'string',
    is_blocked: true,
    notify: false,
    created_at: new Date('2024-04-12T04:14:03.650Z'),
  },
];

export const mockFeatureFlagsDto = {
  feature_flag: true,
  feature_flag_2: false,
};

export const mockSchoolMasterModel = {
  id: toBigInt(1),
  name: 'school1',
  created: new Date('2024-04-12T04:13:37.300Z'),
  modified: new Date('2024-04-12T04:13:37.300Z'),
  country_code: 'IN',
  timezone: 'UTC',
  geopoint: 'ab',
  gps_confidence: 1,
  altitude: 2,
  address: '',
  postal_code: '11',
  email: 'test',
  education_level: 'aa',
  environment: '',
  school_type: 'test',
  country_id: 1,
  location_id: 1,
  admin_1_name: '',
  admin_2_name: '',
  admin_3_name: '',
  admin_4_name: '',
  external_id: '11',
  name_lower: 'ss',
  education_level_regional: '',
  last_weekly_status_id: 1,
  feature_flags: mockFeatureFlagsDto,
  giga_id_school: 'gigaid1',
  created_at: new Date('2024-04-12T04:13:37.300Z'),
};

export const mockSchoolMasterDto = [
  {
    id: 1,
    school_id: '11',
    code: '',
    name: 'school1',
    country_id: 1,
    country: 'IN',
    location_id: 1,
    address: '',
    email: 'test',
    postal_code: '11',
    education_level: 'aa',
    environment: '',
    admin_1_name: '',
    admin_2_name: '',
    admin_3_name: '',
    admin_4_name: '',
    giga_id_school: 'gigaid1',
  },
];

export const mockFlaggedSchoolDto = [
  {
    id: '1',
    detected_country: 'us',
    selected_country: 'in',
    school_id: '234234',
    giga_id_school: 'sfsdf',
    created: '2024-01-16PM02:50:45+05:30',
    created_at: null,
  },
  {
    id: '2',
    detected_country: 'in',
    selected_country: 'us',
    school_id: '212121',
    giga_id_school: 'sdfer3r34',
    created: '2024-01-16AM09:19:15+00:00',
    created_at: null,
  },
];

export const mockFlaggedSchoolModel = [
  {
    id: toBigInt(1),
    detected_country: 'us',
    selected_country: 'in',
    school_id: '234234',
    giga_id_school: 'sfsdf',
    created: '2024-01-16PM02:50:45+05:30',
    created_at: null,
  },
  {
    id: toBigInt(2),
    detected_country: 'in',
    selected_country: 'us',
    school_id: '212121',
    giga_id_school: 'sdfer3r34',
    created: '2024-01-16AM09:19:15+00:00',
    created_at: null,
  },
];

export const mockMeasurementDto = [
  {
    id: '1',
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    UUID: 'ndt-rzmq5_1678933405_0000000000324160',
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '233',
    DeviceType: 'windows',
    Notes: '',
    ClientInfo: {
      IP: '0',
      ASN: 'AS919',
      ISP: ' JSC Kazakhtelecom',
      City: 'Taldykorgan',
      Region: 'Jetisu Region',
      Country: 'KZ',
      Hostname: '0.megaline.telecom.kz',
      Latitude: 45.0156,
      Timezone: 'Asia/Almaty',
      Longitude: 78.3739,
    },
    DataDownloaded: 277,
    DataUploaded: 277,
    DataUsage: 277,
    ServerInfo: {
      URL: 'https://ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org:7123',
      City: 'New Delhi',
      FQDN: 'ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org',
      IPv4: '0',
      IPv6: '0',
      Site: 'del01',
      Label: 'New Delhi',
      Metro: 'del',
      Country: 'IN',
    },
    annotation: null,
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    Results: null,
    giga_id_school: null,
    country_code: 'KZ',
    ip_address: null,
    app_version: null,
    source: 'MLab',
    created_at: null,
  },
  {
    id: '2',
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    UUID: 'ndt-rzmq5_1678933405_0000000000324160',
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    DeviceType: 'windows',
    Notes: '',
    ClientInfo: {
      IP: '0',
      ASN: 'AS919',
      ISP: ' JSC Kazakhtelecom',
      City: 'Taldykorgan',
      Region: 'Jetisu Region',
      Country: 'KZ',
      Hostname: '0.megaline.telecom.kz',
      Latitude: 45.0156,
      Timezone: 'Asia/Almaty',
      Longitude: 78.3739,
    },
    DataDownloaded: 277,
    DataUploaded: 277,
    DataUsage: 277,
    ServerInfo: {
      URL: 'https://ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org:7123',
      City: 'New Delhi',
      FQDN: 'ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org',
      IPv4: '0',
      IPv6: '0',
      Site: 'del01',
      Label: 'New Delhi',
      Metro: 'del',
      Country: 'IN',
    },
    annotation: null,
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    Results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
  },
  {
    id: '3',
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    UUID: 'ndt-rzmq5_1678933405_0000000000324160',
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    DeviceType: 'windows',
    Notes: '',
    ClientInfo: {
      IP: '0',
      ASN: 'AS919',
      ISP: ' JSC Kazakhtelecom',
      City: 'Taldykorgan',
      Region: 'Jetisu Region',
      Country: 'KZ',
      Hostname: '0.megaline.telecom.kz',
      Latitude: 45.0156,
      Timezone: 'Asia/Almaty',
      Longitude: 78.3739,
    },
    ServerInfo: {
      URL: 'https://ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org:7123',
      City: 'New Delhi',
      FQDN: 'ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org',
      IPv4: '0',
      IPv6: '0',
      Site: 'del01',
      Label: 'New Delhi',
      Metro: 'del',
      Country: 'IN',
    },
    annotation: null,
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    Results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
  },
];

export const mockMeasurementFailedDto = [
  {
    id: '1',
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    UUID: 'ndt-rzmq5_1678933405_0000000000324160',
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '233',
    DeviceType: 'windows',
    Notes: '',
    ClientInfo: {
      IP: '0',
      ASN: 'AS919',
      ISP: ' JSC Kazakhtelecom',
      City: 'Taldykorgan',
      Region: 'Jetisu Region',
      Country: 'KZ',
      Hostname: '0.megaline.telecom.kz',
      Latitude: 45.0156,
      Timezone: 'Asia/Almaty',
      Longitude: 78.3739,
    },
    DataDownloaded: 277,
    DataUploaded: 277,
    DataUsage: 277,
    ServerInfo: {
      URL: 'https://ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org:7123',
      City: 'New Delhi',
      FQDN: 'ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org',
      IPv4: '0',
      IPv6: '0',
      Site: 'del01',
      Label: 'New Delhi',
      Metro: 'del',
      Country: 'IN',
    },
    annotation: null,
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    Results: null,
    giga_id_school: null,
    country_code: 'KZ',
    ip_address: null,
    app_version: null,
    source: 'MLab',
    created_at: null,
    reason: 'PCDC school does not exist',
  },
  {
    id: '2',
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    UUID: 'ndt-rzmq5_1678933405_0000000000324160',
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    DeviceType: 'windows',
    Notes: '',
    ClientInfo: {
      IP: '0',
      ASN: 'AS919',
      ISP: ' JSC Kazakhtelecom',
      City: 'Taldykorgan',
      Region: 'Jetisu Region',
      Country: 'KZ',
      Hostname: '0.megaline.telecom.kz',
      Latitude: 45.0156,
      Timezone: 'Asia/Almaty',
      Longitude: 78.3739,
    },
    DataDownloaded: 277,
    DataUploaded: 277,
    DataUsage: 277,
    ServerInfo: {
      URL: 'https://ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org:7123',
      City: 'New Delhi',
      FQDN: 'ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org',
      IPv4: '0',
      IPv6: '0',
      Site: 'del01',
      Label: 'New Delhi',
      Metro: 'del',
      Country: 'IN',
    },
    annotation: null,
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    Results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
    reason: 'Wrong country code',
  },
  {
    id: '3',
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    UUID: 'ndt-rzmq5_1678933405_0000000000324160',
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    DeviceType: 'windows',
    Notes: '',
    ClientInfo: {
      IP: '0',
      ASN: 'AS919',
      ISP: ' JSC Kazakhtelecom',
      City: 'Taldykorgan',
      Region: 'Jetisu Region',
      Country: 'KZ',
      Hostname: '0.megaline.telecom.kz',
      Latitude: 45.0156,
      Timezone: 'Asia/Almaty',
      Longitude: 78.3739,
    },
    ServerInfo: {
      URL: 'https://ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org:7123',
      City: 'New Delhi',
      FQDN: 'ndt-iupui-mlab1-del01.mlab-oti.measurement-lab.org',
      IPv4: '0',
      IPv6: '0',
      Site: 'del01',
      Label: 'New Delhi',
      Metro: 'del',
      Country: 'IN',
    },
    annotation: null,
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    Results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
    reason: 'Wrong country code',
  },
];

export const mockMeasurementV2Dto = [
  {
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '233',
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    giga_id_school: null,
    country_code: 'KZ',
    ip_address: null,
    app_version: null,
    source: 'MLab',
    created_at: null,
  },
  {
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
  },
  {
    Timestamp: new Date('2024-12-31T18:05:16.365Z'),
    BrowserID: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    Download: 6935.637333333333,
    Upload: 11,
    Latency: 277,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
  },
];

export const mockMeasurementModel: measurements[] = [
  {
    id: toBigInt(1),
    timestamp: new Date('2024-12-31T18:05:16.365Z'),
    uuid: 'ndt-rzmq5_1678933405_0000000000324160',
    browser_id: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '233',
    device_type: 'windows',
    notes: '',
    client_info: mockMeasurementDto[0].ClientInfo,
    server_info: mockMeasurementDto[0].ServerInfo,
    annotation: null,
    download: 6935.637333333333,
    upload: 11,
    latency: toBigInt(277),
    data_uploaded: toBigInt(277),
    data_downloaded: toBigInt(277),
    data_usage: toBigInt(277),
    results: null,
    giga_id_school: null,
    country_code: 'KZ',
    ip_address: null,
    app_version: null,
    source: 'MLab',
    created_at: null,
  },
  {
    id: toBigInt(2),
    timestamp: new Date('2024-12-31T18:05:16.365Z'),
    uuid: 'ndt-rzmq5_1678933405_0000000000324160',
    browser_id: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    device_type: 'windows',
    notes: '',
    client_info: mockMeasurementDto[1].ClientInfo,
    server_info: mockMeasurementDto[1].ServerInfo,
    annotation: null,
    download: 6935.637333333333,
    upload: 11,
    latency: toBigInt(277),
    data_uploaded: toBigInt(277),
    data_downloaded: toBigInt(277),
    data_usage: toBigInt(277),
    results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
  },
  {
    id: toBigInt(3),
    timestamp: new Date('2024-12-31T18:05:16.365Z'),
    uuid: 'ndt-rzmq5_1678933405_0000000000324160',
    browser_id: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    device_type: 'windows',
    notes: '',
    client_info: mockMeasurementDto[2].ClientInfo,
    server_info: mockMeasurementDto[2].ServerInfo,
    annotation: null,
    download: 6935.637333333333,
    upload: 11,
    latency: toBigInt(277),
    data_uploaded: null,
    data_downloaded: null,
    data_usage: null,
    results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
  },
];

export const mockMeasurementFailedModel: measurements_failed[] = [
  {
    id: toBigInt(1),
    timestamp: new Date('2024-12-31T18:05:16.365Z'),
    uuid: 'ndt-rzmq5_1678933405_0000000000324160',
    browser_id: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '233',
    device_type: 'windows',
    notes: '',
    client_info: mockMeasurementDto[0].ClientInfo,
    server_info: mockMeasurementDto[0].ServerInfo,
    annotation: null,
    download: 6935.637333333333,
    upload: 11,
    latency: toBigInt(277),
    data_uploaded: toBigInt(277),
    data_downloaded: toBigInt(277),
    data_usage: toBigInt(277),
    results: null,
    giga_id_school: null,
    country_code: 'KZ',
    ip_address: null,
    app_version: null,
    source: 'MLab',
    created_at: null,
    reason: 'PCDC school does not exist',
  },
  {
    id: toBigInt(2),
    timestamp: new Date('2024-12-31T18:05:16.365Z'),
    uuid: 'ndt-rzmq5_1678933405_0000000000324160',
    browser_id: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    device_type: 'windows',
    notes: '',
    client_info: mockMeasurementDto[1].ClientInfo,
    server_info: mockMeasurementDto[1].ServerInfo,
    annotation: null,
    download: 6935.637333333333,
    upload: 11,
    latency: toBigInt(277),
    data_uploaded: toBigInt(277),
    data_downloaded: toBigInt(277),
    data_usage: toBigInt(277),
    results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
    reason: 'Wrong country code',
  },
  {
    id: toBigInt(3),
    timestamp: new Date('2024-12-31T18:05:16.365Z'),
    uuid: 'ndt-rzmq5_1678933405_0000000000324160',
    browser_id: '5b1fb97e-7dfa-404e-8148-70e96c22e03f',
    school_id: '123',
    device_type: 'windows',
    notes: '',
    client_info: mockMeasurementDto[2].ClientInfo,
    server_info: mockMeasurementDto[2].ServerInfo,
    annotation: null,
    download: 6935.637333333333,
    upload: 11,
    latency: toBigInt(277),
    data_uploaded: null,
    data_downloaded: null,
    data_usage: null,
    results: null,
    giga_id_school: 'b8e7d315-08f9-3665-9173-0d465744e4fe',
    country_code: 'KZ',
    ip_address: '0',
    app_version: '1.0.0',
    source: 'DailyCheckApp',
    created_at: null,
    reason: 'Wrong country code',
  },
];

export const mockCountryDto = [
  {
    id: '1',
    code: 'GB',
    code_iso3: 'GBR',
    name: 'Great Britain',
    country_id: '343',
    created_at: new Date('2024-12-31T18:05:16.365Z'),
  },
  {
    id: '2',
    code: 'IN',
    code_iso3: 'IND',
    name: 'India',
    country_id: '2323',
    created_at: new Date('2024-12-31T18:05:16.365Z'),
  },
];

export const mockCountryModel = [
  {
    id: toBigInt(1),
    code: 'GB',
    code_iso3: 'GBR',
    name: 'Great Britain',
    country_id: '343',
    created_at: new Date('2024-12-31T18:05:16.365Z'),
    created: '',
  },
  {
    id: toBigInt(2),
    code: 'IN',
    code_iso3: 'IND',
    name: 'India',
    country_id: '2323',
    created_at: new Date('2024-12-31T18:05:16.365Z'),
    created: '',
  },
];

export const mockMetricsDto: MetricsDto = {
  countries: 10,
  schools: 7000,
  measurements: 100000,
};
