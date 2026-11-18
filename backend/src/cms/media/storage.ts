import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { AppConfig } from '../../config/app-config.service';

export interface StoredFile {
  url: string;
  key: string;
  storage: 'local' | 'cloudinary';
}

export interface IncomingFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/** Detects the real image type from magic bytes (the client-sent MIME type is not trusted). */
export function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

/** Storage driver abstraction: local disk in development, Cloudinary in production. */
@Injectable()
export class MediaStorage {
  private readonly logger = new Logger(MediaStorage.name);

  constructor(private readonly config: AppConfig) {
    if (this.driver === 'cloudinary') {
      cloudinary.config({
        cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
        api_key: config.get('CLOUDINARY_API_KEY'),
        api_secret: config.get('CLOUDINARY_API_SECRET'),
        secure: true,
      });
    }
  }

  /** `url` means uploads are disabled (e.g. Cloudinary not configured in production). */
  get driver(): 'local' | 'cloudinary' | 'url' {
    const d = this.config.get('MEDIA_DRIVER');
    if (d === 'cloudinary' && !this.config.get('CLOUDINARY_CLOUD_NAME')) return 'url';
    return d;
  }

  async save(file: IncomingFile, mime: string, siteId: string): Promise<StoredFile> {
    if (this.driver === 'cloudinary') {
      const result = await new Promise<{ secure_url: string; public_id: string }>((res, rej) => {
        cloudinary.uploader
          .upload_stream({ folder: `pif-admin/${siteId}`, resource_type: 'image' }, (err, out) =>
            err || !out ? rej(err ?? new Error('Upload failed')) : res(out),
          )
          .end(file.buffer);
      });
      return { url: result.secure_url, key: result.public_id, storage: 'cloudinary' };
    }
    const dir = resolve(this.config.get('UPLOAD_DIR'), siteId);
    await mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${EXT[mime]}`;
    await writeFile(join(dir, name), file.buffer);
    return { url: `/uploads/${siteId}/${name}`, key: `${siteId}/${name}`, storage: 'local' };
  }

  async remove(storage: string, key: string | null): Promise<void> {
    if (!key) return;
    try {
      if (storage === 'cloudinary') await cloudinary.uploader.destroy(key);
      if (storage === 'local') {
        const root = resolve(this.config.get('UPLOAD_DIR'));
        const path = resolve(root, key);
        if (path.startsWith(root)) await unlink(path);
      }
    } catch (err) {
      this.logger.warn({ err: (err as Error).message, key }, 'Could not delete stored file');
    }
  }
}
