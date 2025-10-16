import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { ParquetSchema, ParquetWriter } from 'parquetjs';
// inside the thread do some thread work
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parentPort, workerData } from 'worker_threads';

const logger = new Logger('DeltaLakeWorker');
const prisma = new PrismaClient();

async function backgroundWork(data: any) {
  logger.log(`Worker received job: ${data?.jobName}`);

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_TABLE_NAME;

  if (!connectionString || !containerName) {
    throw new Error(
      'Azure Storage connection string or blob container name is not configured.',
    );
  }
  try {
    const blobServiceClient = new BlobServiceClient(connectionString);
    const accountInfo = await blobServiceClient.getAccountInfo();
    console.log('✅ Connected successfully');
    console.log(accountInfo);

    const containerClient = blobServiceClient.getContainerClient(containerName);

    await containerClient.createIfNotExists();

    const BATCH_SIZE = 100;
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

      const blobName = `connectivity-pings-backup-${new Date().toISOString()}-${Math.random()}.parquet`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Define the Parquet schema based on your Prisma model
      const schema = new ParquetSchema({
        id: { type: 'INT64' },
        timestamp: { type: 'TIMESTAMP_MILLIS' },
        isConnected: { type: 'BOOLEAN' },
        errorMessage: { type: 'UTF8', optional: true },
        giga_id_school: { type: 'UTF8', optional: true },
        app_local_uuid: { type: 'UTF8', optional: true },
        browserId: { type: 'UTF8', optional: true },
        latency: { type: 'INT32', optional: true },
        created_at: { type: 'TIMESTAMP_MILLIS' },
      });

      const tempFilePath = path.join(
        os.tmpdir(),
        `backup-${Date.now()}.parquet`,
      );
      let data: Buffer;

      try {
        // Create a Parquet file on the local filesystem
        const writer = await ParquetWriter.openFile(schema, tempFilePath);
        for (const record of recordsToMove) {
          await writer.appendRow(record);
        }
        await writer.close();

        // Read the temporary file into a buffer for upload
        data = await fs.readFile(tempFilePath);

        const uploadResponse = await blockBlobClient.upload(data, data.length);

        if (!uploadResponse?.errorCode) {
          logger.log(
            `Successfully backed up ${recordsToMove.length} records to blob: ${blobName}. Deleting from source.`,
          );

          const idsToDelete = recordsToMove.map((r) => r.id);

          if (idsToDelete.length > 0) {
            const deletedRecords =
              await prisma.connectivity_ping_checks.deleteMany({
                where: {
                  id: { in: idsToDelete },
                },
              });
            totalRecordsMoved += deletedRecords.count;
          }
        }
      } catch (error) {
        logger.error(
          `Error uploading blob ${blobName} to Azure Blob Storage:`,
          error,
        );
        break;
      } finally {
        // Ensure the temporary file is deleted
        await fs
          .unlink(tempFilePath)
          .catch((err) =>
            logger.error(`Failed to delete temp file: ${tempFilePath}`, err),
          );
      }
    }

    logger.log(`Total records moved: ${totalRecordsMoved}`);

    const result = {
      status: 'completed',
      data: `Total records moved: ${totalRecordsMoved}`,
    };
    return result;
  } catch (error) {
    logger.error('Error in DeltaLakeWorker:', error);
    throw error;
  }
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
