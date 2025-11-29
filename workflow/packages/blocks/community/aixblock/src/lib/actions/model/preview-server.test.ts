import request from 'supertest';
import express from 'express';
import { servePreviewFile } from './preview-server';

// Set up a minimal Express app for testing
const app = express();
app.get('/preview', servePreviewFile);

describe('servePreviewFile', () => {
  it('should serve a valid file', async () => {
    const res = await request(app).get('/preview?file=test.png');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/(png|jpeg|gif|pdf|txt)/);
  });

  it('should reject missing file parameter', async () => {
    const res = await request(app).get('/preview');
    expect(res.status).toBe(400);
    expect(res.text).toContain('Missing or invalid');
  });

  it('should reject path traversal attempts', async () => {
    const maliciousPaths = [
      '../../../../etc/passwd',
      '../../../.env',
      'test.png/../../../.env',
      'nonexistent/../../package.json',
      'valid.png%2f..%2f..%2f..%2f..%2f..%2fetc%2fpasswd'
    ];

    for (const payload of maliciousPaths) {
      const res = await request(app).get(`/preview?file=${encodeURIComponent(payload)}`);
      expect(res.status).toBe(400);
      expect(res.text).toContain('Invalid file path');
    }
  });

  it('should reject disallowed file extensions', async () => {
    const res = await request(app).get('/preview?file=malicious.js');
    expect(res.status).toBe(400);
    expect(res.text).toContain('File type not allowed');
  });

  it('should return 404 for non-existent valid files', async () => {
    const res = await request(app).get('/preview?file=missing.pdf');
    expect(res.status).toBe(404);
    expect(res.text).toContain('File not found');
  });
});
