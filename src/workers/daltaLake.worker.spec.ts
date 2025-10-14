// Mock dependencies before importing the worker
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};
jest.mock('@nestjs/common', () => ({
  Logger: jest.fn(() => mockLogger),
}));

const mockPrisma = {
  connectivity_ping_checks: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const mockTableClient = {
  createTable: jest.fn().mockResolvedValue(undefined),
  submitTransaction: jest.fn(),
};
jest.mock('@azure/data-tables', () => ({
  TableClient: {
    fromConnectionString: jest.fn(() => mockTableClient),
  },
}));

const mockParentPort = {
  postMessage: jest.fn(),
};
jest.mock('worker_threads', () => ({
  parentPort: mockParentPort,
  workerData: { jobName: 'Test Job' },
}));

describe('DeltaLakeWorker', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AZURE_STORAGE_CONNECTION_STRING: 'test-connection-string',
      AZURE_TABLE_NAME: 'test-table',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const runWorker = async () => {
    // Use jest.isolateModules to re-import the worker for each test,
    // which will execute its IIFE block.
    await jest.isolateModulesAsync(async () => {
      await import('./daltaLake.worker');
    });
  };

  it('should throw an error if environment variables are not set', async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    delete process.env.AZURE_TABLE_NAME;

    await runWorker();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in DeltaLakeWorker:',
      expect.any(Error),
    );
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({
      status: 'failed',
      error: 'Azure Storage connection string or table name is not configured.',
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it('should do nothing if there are no records to move', async () => {
    mockPrisma.connectivity_ping_checks.findMany.mockResolvedValue([]);

    await runWorker();

    expect(mockTableClient.createTable).toHaveBeenCalled();
    expect(mockPrisma.connectivity_ping_checks.findMany).toHaveBeenCalledTimes(
      1,
    );
    expect(mockTableClient.submitTransaction).not.toHaveBeenCalled();
    expect(
      mockPrisma.connectivity_ping_checks.deleteMany,
    ).not.toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith('Total records moved: 0');
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({
      status: 'completed',
      data: 'Total records moved: 0',
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it('should move records from Prisma to Azure Table Storage and delete them', async () => {
    const records = [
      { id: 1, data: 'record1' },
      { id: 2, data: 'record2' },
    ];
    mockPrisma.connectivity_ping_checks.findMany
      .mockResolvedValueOnce(records)
      .mockResolvedValueOnce([]); // For the second loop iteration

    mockTableClient.submitTransaction.mockResolvedValue({
      subResponses: [
        { status: 204, rowKey: '1' },
        { status: 204, rowKey: '2' },
      ],
    });

    mockPrisma.connectivity_ping_checks.deleteMany.mockResolvedValue({
      count: 2,
    });

    await runWorker();

    expect(mockTableClient.createTable).toHaveBeenCalled();
    expect(mockPrisma.connectivity_ping_checks.findMany).toHaveBeenCalledTimes(
      2,
    );
    expect(mockTableClient.submitTransaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.connectivity_ping_checks.deleteMany).toHaveBeenCalledWith(
      {
        where: { id: { in: [1, 2] } },
      },
    );
    expect(mockLogger.log).toHaveBeenCalledWith('Total records moved: 2');
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({
      status: 'completed',
      data: 'Total records moved: 2',
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it('should handle errors during transaction submission', async () => {
    const records = [{ id: 1, data: 'record1' }];
    mockPrisma.connectivity_ping_checks.findMany.mockResolvedValueOnce(records);

    const submissionError = new Error('Submission failed');
    mockTableClient.submitTransaction.mockRejectedValue(submissionError);

    await runWorker();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error uploading to Azure Table Storage :',
      submissionError,
    );
    expect(
      mockPrisma.connectivity_ping_checks.deleteMany,
    ).not.toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith('Total records moved: 0');
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({
      status: 'completed',
      data: 'Total records moved: 0',
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });
});
