import { toBigInt } from './common.utils';

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
    giga_id_school: 'string',
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
    giga_id_school: 'string',
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
    giga_id_school: 'string',
    mac_address: 'string',
    os: 'string',
    app_version: 'string',
    created: 'string',
    network_information: null,
    ip_address: 'string',
    country_code: 'string',
    is_blocked: false,
    notify: false,
    created_at: new Date('2024-04-12T04:13:37.300Z'),
  },
  {
    id: toBigInt(2),
    user_id: 'test_id',
    giga_id_school: 'string',
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
