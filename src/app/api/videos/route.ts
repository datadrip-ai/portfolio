/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API route for serving video metadata, including thumbnails, WebM previews, duration, creation time, and EXIF data.
 * Scans ./videos for videos and ./thumbnails/preview for thumbnails/previews.
 * Includes robust error handling and logging.
 *
 * @module app/api/videos
 * @requires next/server
 * @requires fs/promises
 * @requires path
 * @requires @/lib/logger
 * @requires @/lib/exifUtils
 */
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

interface Video {
  id: string;
  name: string;
  path: string;
  url: string;
  fileType: string;
  thumbnail: string;
  preview: string;
  duration: number; // Seconds
  createdAt: string; // ISO datetime
  exifMetadata: Record<string, any>;
}

interface Paths {
  VIDEO_DIR: string;
  VIDEO_DIR_PREVIEW: string;
  NEXT_PUBLIC_THUMBNAIL_URL_PREFIX: string;
  NEXT_PUBLIC_CORS_ORIGIN: string;
  NEXT_PUBLIC_VIDEOS_URL_PREFIX: string;
}

async function fetchConfig(): Promise<Paths> {
  return {
    VIDEO_DIR: './public/videos',
    VIDEO_DIR_PREVIEW: './public/thumbnails/preview',
    NEXT_PUBLIC_THUMBNAIL_URL_PREFIX: '',
    NEXT_PUBLIC_CORS_ORIGIN: '*',
    NEXT_PUBLIC_VIDEOS_URL_PREFIX: '/videos',
  };
}

async function resolvePath(filePath: string, baseDir: string): Promise<string | undefined> {
  const fullPath = path.join(process.cwd(), baseDir, filePath);
  try {
    await fs.access(fullPath);
    logger.info(`\x1b[32mResolved path: ${fullPath}\x1b[0m`);
    return fullPath;
  } catch (error) {
    logger.warn(`\x1b[33mFile not found: ${fullPath}: ${error.message}\x1b[0m`);
    return undefined;
  }
}

async function scanDirectory(dir: string): Promise<string[]> {
  try {
    const files: string[] = [];
    const entries = await fs.readdir(path.join(process.cwd(), dir), { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        files.push(...await scanDirectory(fullPath));
      } else if (entry.name.toLowerCase().match(/\.(mp4|webm)$/)) {
        files.push(fullPath);
      }
    }
    logger.info(`\x1b[32mScanned ${files.length} video files in ${dir}\x1b[0m`);
    return files;
  } catch (error) {
    logger.error(`\x1b[31mFailed to scan directory ${dir}: ${error.message}\x1b[0m`);
    return [];
  }
}

export async function GET() {
  try {
    const paths = await fetchConfig();
    const videoDir = path.join(process.cwd(), paths.VIDEO_DIR);
    const previewDir = path.join(process.cwd(), paths.VIDEO_DIR_PREVIEW);
    await fs.mkdir(previewDir, { recursive: true });
    logger.info(`\x1b[32mEnsured directory exists: ${previewDir}\x1b[0m`);

    const videoFiles = await scanDirectory(paths.VIDEO_DIR);
    if (!videoFiles.length) {
      logger.warn(`\x1b[33mNo videos found in ${videoDir}\x1b[0m`);
      return NextResponse.json({ videos: [], error: 'No videos found' }, { status: 404 });
    }

    const videos: Video[] = await Promise.all(
      videoFiles.map(async (relativePath) => {
        const videoId = path.basename(relativePath, path.extname(relativePath));
        const previewFileName = `${videoId}.webm`;
        const previewPath = await resolvePath(previewFileName, paths.VIDEO_DIR_PREVIEW);
        const thumbPath = await resolvePath(`${videoId}_thumb.jpg`, paths.VIDEO_DIR_PREVIEW);
        const videoPath = path.join(videoDir, path.basename(relativePath));

        let thumbnail = `/thumbnails/preview/default.jpg`;
        let preview = `/thumbnails/preview/default.webm`;
        if (previewPath && thumbPath) {
          preview = `/thumbnails/preview/${previewFileName}`;
          thumbnail = `/thumbnails/preview/${videoId}_thumb.jpg`;
          logger.info(`\x1b[32mThumbnail set for ${videoId}: ${thumbnail}\x1b[0m`);
          logger.info(`\x1b[32mWebM preview set for ${videoId}: ${preview}\x1b[0m`);
        } else {
          logger.warn(`\x1b[33mNo WebM preview or thumbnail found for ${videoId}, using default\x1b[0m`);
        }

        // eslint-disable-next-line prefer-const
        let duration = 0;
        let createdAt = new Date().toISOString();

        try {
          const stats = await fs.stat(videoPath);
          createdAt = stats.birthtime.toISOString();
        } catch (error) {
          logger.warn(`\x1b[33mFailed to get stats for ${videoPath}: ${error.message}\x1b[0m`);
        }

                return {
          id: videoId,
          name: videoId,
          path: `/videos/${videoId}.${path.extname(relativePath).slice(1).toLowerCase()}`,
          url: `/videos/${videoId}.${path.extname(relativePath).slice(1).toLowerCase()}`,
          fileType: path.extname(relativePath).slice(1).toLowerCase(),
          thumbnail,
          preview,
          duration,
          createdAt,
        };
      }),
    );

    logger.info(`\x1b[32mProcessed ${videos.length} videos successfully\x1b[0m`);
    return NextResponse.json(
      videos.sort((a, b) => a.name.localeCompare(b.name)),
      {
        headers: {
          'Access-Control-Allow-Origin': paths.NEXT_PUBLIC_CORS_ORIGIN,
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
  } catch (error) {
    logger.error(`\x1b[31mInternal server error: ${error.message}\x1b[0m`);
    return NextResponse.json(
      { videos: [], error: 'Internal server error', details: error.message },
      { status: 500 },
    );
  }
}