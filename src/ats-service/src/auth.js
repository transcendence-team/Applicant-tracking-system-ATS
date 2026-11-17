import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ApiError } from './errors.js';

const claims = z.object({
  sub: z.uuid(),
  role: z.enum(['ROLE_APPLICANT', 'ROLE_HR', 'ROLE_ADMIN']),
  exp: z.number(),
});

export function authenticateJwt(secret) {
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('JWT_SECRET must contain at least 32 UTF-8 bytes.');
  }
  // Spring JJWT chooses the HMAC algorithm from the signing key length.
  const bytes = Buffer.byteLength(secret, 'utf8');
  const algorithm = bytes >= 64 ? 'HS512' : bytes >= 48 ? 'HS384' : 'HS256';
  return (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? '');
    if (!match) return next(new ApiError(401, 'UNAUTHORIZED', 'A Bearer token is required.'));
    try {
      req.user = claims.parse(jwt.verify(match[1], secret, { algorithms: [algorithm] }));
      next();
    } catch {
      next(new ApiError(401, 'INVALID_TOKEN', 'Token is invalid or expired.'));
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'Insufficient permissions.'));
    }
    next();
  };
}
