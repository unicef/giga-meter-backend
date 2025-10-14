import { Test, TestingModule } from '@nestjs/testing';
import { DeltaLakeScheduler } from './delta-lake.scheduler';
import { Worker } from 'worker_threads';

jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

describe('DeltaLakeService', () => {
  let service: DeltaLakeScheduler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeltaLakeScheduler],
    }).compile();

    service = module.get<DeltaLakeScheduler>(DeltaLakeScheduler);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('call heavy workloader', () => {
    service.offloadHeavyWork();
    expect(Worker).toHaveBeenCalled();
  });

  it('should set up listeners for worker events', () => {
    const mockOn = jest.fn();
    const mockWorkerInstance = { on: mockOn };
    (Worker as unknown as jest.Mock).mockImplementation(
      () => mockWorkerInstance,
    );

    service.offloadHeavyWork();

    expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('exit', expect.any(Function));
    expect(mockOn).toHaveBeenCalledTimes(3);
  });

  it('emit ON event in heavy workload', () => {
    const mockOn = jest.fn();
    const mockWorkerInstance: any = {
      on: (event: string, callback: (returnData: any) => void) => {
        if (event === 'message') {
          mockOn(event);
          callback('result');
        } else if (event === 'error') {
          mockOn(event);
          callback(new Error('error'));
        } else if (event === 'exit') {
          mockOn(event);
          callback(0);
        }
      },
    };
    (Worker as unknown as jest.Mock).mockImplementation(
      () => mockWorkerInstance,
    );

    service.offloadHeavyWork();
    expect(mockOn).toHaveBeenCalledWith('message');
    expect(mockOn).toHaveBeenCalledWith('error');
    expect(mockOn).toHaveBeenCalledWith('exit');
  });
});
