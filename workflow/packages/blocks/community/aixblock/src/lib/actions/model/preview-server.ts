import path from 'path';
import { Request, Response } from 'express';

// Define the safe base directory where preview files are stored.
// This directory must be controlled and not user-writable.
const SAFE_PREVIEW_DIR = path.resolve(__dirname, '../../../../../safe-preview-files');

/**
 * Validates that the requested file path is within the SAFE_PREVIEW_DIR.
 * Prevents path traversal attacks (e.g., ../../etc/passwd).
 */
function isValidPreviewPath(filePath: string): boolean {
  if (typeof filePath !== 'string') return false;
  const resolved = path.resolve(SAFE_PREVIEW_DIR, filePath);
  // Ensure the resolved path starts with SAFE_PREVIEW_DIR + path.sep to prevent directory escape
  return resolved.startsWith(SAFE_PREVIEW_DIR + path.sep);
}

/**
 * Serves a preview file securely.
 * Only files inside SAFE_PREVIEW_DIR with allowed extensions are served.
 */
export async function servePreviewFile(req: Request, res: Response): Promise<void> {
  const { file: tempFile } = req.query;

  // Validate presence and type of 'file' parameter
  if (!tempFile || typeof tempFile !== 'string') {
    return res.status(400).send('Missing or invalid "file" parameter');
  }

  // Block path traversal attempts
  if (!isValidPreviewPath(tempFile)) {
    return res.status(400).send('Invalid file path');
  }

  const resolvedPath = path.resolve(SAFE_PREVIEW_DIR, tempFile);

  // Allow only safe file extensions to prevent execution of malicious content
  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt'];
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return res.status(400).send('File type not allowed');
  }

  try {
    await res.sendFile(resolvedPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).send('File not found');
    }
    return res.status(500).send('Internal server error');
  }
}
