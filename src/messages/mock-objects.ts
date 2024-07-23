// NOTE: mockMessagesModel objects are the ones fetched from database and mockMessagesDto objects are the ones mapped which are returned from service

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
