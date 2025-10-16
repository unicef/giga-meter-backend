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

const mockBlockBlobClient = {
  upload: jest.fn().mockResolvedValue({}),
};
const mockContainerClient = {
  createIfNotExists: jest.fn().mockResolvedValue(undefined),
  getBlockBlobClient: jest.fn(() => mockBlockBlobClient),
};
const mockBlobServiceClient = {
  getContainerClient: jest.fn(() => mockContainerClient),
};

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn(() => mockBlobServiceClient),
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
      AZURE_BLOB_CONTAINER_NAME: 'test-container',
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
    delete process.env.AZURE_BLOB_CONTAINER_NAME;

    await runWorker();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in DeltaLakeWorker:',
      expect.any(Error),
    );
    expect(mockParentPort.postMessage).toHaveBeenCalledWith({
      status: 'failed',
      error:
        'Azure Storage connection string or blob container name is not configured.',
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalled();
  });

  it('should do nothing if there are no records to move', async () => {
    mockPrisma.connectivity_ping_checks.findMany.mockResolvedValue([]);

    await runWorker();

    expect(mockContainerClient.createIfNotExists).toHaveBeenCalled();
    expect(mockPrisma.connectivity_ping_checks.findMany).toHaveBeenCalledTimes(
      1,
    );
    expect(mockBlockBlobClient.upload).not.toHaveBeenCalled();
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

  it('should move records from Prisma to Azure Blob Storage and delete them', async () => {
    const records = [
      { id: 1, data: 'record1' },
      { id: 2, data: 'record2' },
    ];
    mockPrisma.connectivity_ping_checks.findMany
      .mockResolvedValueOnce(records)
      .mockResolvedValueOnce([]); // For the second loop iteration

    mockPrisma.connectivity_ping_checks.deleteMany.mockResolvedValue({
      count: 2,
    });

    await runWorker();

    expect(mockContainerClient.createIfNotExists).toHaveBeenCalled();
    expect(mockPrisma.connectivity_ping_checks.findMany).toHaveBeenCalledTimes(
      2,
    );
    expect(mockBlockBlobClient.upload).toHaveBeenCalledTimes(1);
    expect(mockBlockBlobClient.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.any(Number),
    );
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

    const uploadError = new Error('Upload failed');
    mockBlockBlobClient.upload.mockRejectedValue(uploadError);

    await runWorker();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error uploading blob'),
      uploadError,
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
