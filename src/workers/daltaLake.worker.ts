import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TableClient } from '@azure/data-tables';

// inside the thread do some thread work
import { parentPort, workerData } from 'worker_threads';

const logger = new Logger('DeltaLakeWorker');
const prisma = new PrismaClient();

async function backgroundWork(data: any) {
  logger.log(`Worker received job: ${data?.jobName}`);

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const tableName = process.env.AZURE_TABLE_NAME;

  if (!connectionString || !tableName) {
    throw new Error(
      'Azure Storage connection string or table name is not configured.',
    );
  }

  const tableClient = TableClient.fromConnectionString(
    connectionString,
    tableName,
  );
  // Create the table if it doesn't exist
  await tableClient.createTable();

  const BATCH_SIZE = 1000;
  let hasMoreRecords = true;
  let totalRecordsMoved = 0;

  while (hasMoreRecords) {
    const recordsToMove = await prisma.connectivity_ping_checks.findMany({
      take: BATCH_SIZE,
      where: {
        timestamp: {
          lt: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (recordsToMove.length === 0) {
      hasMoreRecords = false;
      break;
    }

    const transactions: any[] = [];
    for (const record of JSON.parse(JSON.stringify(recordsToMove))) {
      const entity = {
        partitionKey: 'connectivityPing', // Set the PartitionKey
        rowKey: record.id.toString(), // Set the RowKey
        // Spread the rest of the properties from the record
        ...record,
      };

      delete entity.id;

      // 2. Create the TableTransactionAction object
      transactions.push(['create', entity]);
    }

    try {
      const result = await tableClient.submitTransaction(transactions);

      logger.log(
        `Successfully backed up ${recordsToMove.length} records. Deleting from source.`,
      );

      const successfullySaved: number[] = result.subResponses
        .filter((el) => el.status < 400)
        .map((el) => parseInt(el.rowKey));
      const errorResponsesSaved: number[] = result.subResponses
        .filter((el) => el.status > 400)
        .map((el) => parseInt(el.rowKey));
      if (result.status > 400 || errorResponsesSaved.length > 0) {
        logger.error(
          `Error saving some records to Azure Table Storage: ${errorResponsesSaved.join(',')}`,
        );
      }
      if (successfullySaved.length > 0) {
        const deletedRecords = await prisma.connectivity_ping_checks.deleteMany(
          {
            where: {
              id: {
                in: successfullySaved,
              },
            },
          },
        );
        totalRecordsMoved += deletedRecords.count;
      }
    } catch (error) {
      logger.error('Error uploading to Azure Table Storage :', error);
      break;
    }
  }

  logger.log(`Total records moved: ${totalRecordsMoved}`);

  const result = {
    status: 'completed',
    data: `Total records moved: ${totalRecordsMoved}`,
  };
  return result;
}

(async () => {
  try {
    const result = await backgroundWork(workerData);
    parentPort.postMessage(result);
  } catch (error) {
    logger.error('Error in DeltaLakeWorker:', error);
    parentPort.postMessage({ status: 'failed', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
})();

export {};
