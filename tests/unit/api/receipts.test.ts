/**
 * Receipt Scanner API Unit Tests
 *
 * Tests for:
 * - POST /api/receipts/scan
 */

jest.mock('@/utils/auth', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('next/headers', () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}));

import { POST } from '@/app/api/receipts/scan/route';
import { auth } from '@/utils/auth';

const mockGetSession = auth.api.getSession as unknown as jest.Mock;

describe('Receipt Scanner API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/receipts/scan', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValueOnce(null);

      const req = new Request('http://localhost:3000/api/receipts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'base64data' }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when multipart form data has no image or file', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'user_1', name: 'Test User' },
      });

      const formData = new FormData();
      const req = new Request('http://localhost:3000/api/receipts/scan', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('No image file provided');
    });

    it('parses multipart form data with image successfully', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'user_1', name: 'Test User' },
      });

      const formData = new FormData();
      const dummyBlob = new Blob(['dummy image content'], {
        type: 'image/jpeg',
      });
      formData.append('image', dummyBlob, 'trader_joes_groceries.jpg');

      const req = new Request('http://localhost:3000/api/receipts/scan', {
        method: 'POST',
        body: formData,
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.category).toBe('groceries');
      expect(data.data.totalAmount).toBeGreaterThan(0);
      expect(Array.isArray(data.data.lineItems)).toBe(true);
      expect(data.data.lineItems.length).toBeGreaterThan(0);
    });

    it('parses JSON body with image hint successfully for transportation', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'user_1', name: 'Test User' },
      });

      const req = new Request('http://localhost:3000/api/receipts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: 'fake-base64-string',
          fileName: 'uber_ride_receipt.png',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.category).toBe('transportation');
      expect(data.data.totalAmount).toBe(32.8);
      expect(data.data.merchant).toContain('Uber');
    });

    it('parses restaurant receipt and returns line items with tax', async () => {
      mockGetSession.mockResolvedValueOnce({
        user: { id: 'user_1', name: 'Test User' },
      });

      const req = new Request('http://localhost:3000/api/receipts/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: 'fake-base64-string',
          fileName: 'dinner_restaurant.jpg',
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.category).toBe('food');
      expect(data.data.lineItems.length).toBeGreaterThan(0);
      expect(typeof data.data.tax).toBe('number');
    });
  });
});
