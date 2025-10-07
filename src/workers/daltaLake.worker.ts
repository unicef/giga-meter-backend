import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { TableClient } from '@azure/data-tables';

import { randomUUID } from 'crypto';
// inside the thread do some thread work
import { parentPort, workerData } from 'worker_threads';

const logger = new Logger('DeltaLakeWorker');
const prisma = new PrismaClient();

//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function backgroundWorkOld(data: any) {
  logger.log(`Worker received job: ${data.jobName}`);

  // Example of using Prisma Client to access the database
  const schoolCount = await prisma.school.count();

  //insert 100 records random 7th months older in connectivity_ping_checks data. example data
  /**timestamp	is_connected	error_message	giga_id_school	app_local_uuid	browser_id	latency	created_at
2025-09-10 11:53:28.257+00	TRUE	NULL	5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05	8e7602fd-3129-47bd-841e-9257cc4ea9d4	4b47fc23-c962-465e-b1f6-7eb8ad810917	69.2	2025-09-16 09:43:59.124696+00
 */
  const recordsToInsert = 1000;
  const sevenMonthsAgo = new Date();
  sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
  const dataToInsert: Prisma.connectivity_ping_checksCreateManyInput[] =
    [] as any;

  for (let i = 0; i < recordsToInsert; i++) {
    const randomDate = new Date(
      sevenMonthsAgo.getTime() +
        Math.random() * (new Date().getTime() - sevenMonthsAgo.getTime()),
    );
    dataToInsert.push({
      timestamp: randomDate,
      isConnected: true,
      errorMessage: null,
      giga_id_school: '5ff8f4cc-9f74-3f48-8cb1-e68e063a7c05', // Example giga_id_school
      app_local_uuid: randomUUID(), // Generate a unique UUID for each record
      latency: parseFloat((Math.random() * 100).toFixed(2)), // Random latency
      created_at: new Date(),
      browserId: '4b47fc23-c962-465e-b1f6-7ebad810917', // Example browserId
    });
  }
  await prisma.connectivity_ping_checks.createMany({
    data: dataToInsert,
  });
  logger.log(`Inserted ${recordsToInsert} random connectivity ping checks.`);

  logger.log(`Found ${schoolCount} schools in the database.`);

  const result = {
    status: 'completed',
    data: `Processed ${
      data.jobName
    } at ${new Date().toISOString()}. School count: ${schoolCount}`,
  };
  return result;
}

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

      // Clean up any properties that aren't part of the final entity (like the original 'id')
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
        .filter((el) => el.status <= 400)
        .map((el) => parseInt(el.rowKey));
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
    // Ensure the Prisma Client disconnects when the worker is finished.
    await prisma.$disconnect();
  }
})();

export {};
