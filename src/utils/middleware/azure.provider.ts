/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  BlobServiceClient,
  BlockBlobClient,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AzureProviderService {
  constructor(private readonly configService: ConfigService) {}
  private containerName: string;

  private getBlobServiceInstance() {
    const account = 'zrodrive';
    const accountKey = process.env.AZURE_BLOB_KEY;
    const sharedKeyCredential = new StorageSharedKeyCredential(
      account,
      accountKey ?? '',
    );
    const blobClientService = new BlobServiceClient(
      `https://${account}.blob.core.windows.net`,
      sharedKeyCredential,
    );
    return blobClientService;
  }

  private getBlobClient(imageName: string): BlockBlobClient {
    const blobService = this.getBlobServiceInstance();
    const containerName = this.containerName;
    const containerClient = blobService.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(imageName);

    return blockBlobClient;
  }

  public async uploadFile(file: Express.Multer.File, containerName: string) {
    this.containerName = containerName;
    const extension = file.originalname.split('.').pop();
    const file_name = uuidv4() + '.' + extension;
    const blockBlobClient = this.getBlobClient(file_name);
    const fileUrl = blockBlobClient.url;
    await blockBlobClient.uploadData(file.buffer);

    return fileUrl;
  }

  public async deleteFileByUrl(fileUrl: string): Promise<void> {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const containerName = pathParts[1];
    const blobName = pathParts.slice(2).join('/');

    this.containerName = containerName;
    const blockBlobClient = this.getBlobClient(blobName);
    await blockBlobClient.delete();
  }
}
