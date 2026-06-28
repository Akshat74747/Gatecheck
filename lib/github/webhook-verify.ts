import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify a GitHub webhook HMAC-SHA256 signature.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param rawBody - raw request body as a Buffer or string
 * @param signature - value of the x-hub-signature-256 header
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string | null | undefined,
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected =
    'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
