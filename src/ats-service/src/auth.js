import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ApiError } from './errors.js';

const claims = z.object({
  sub: z.uuid(),
  role: z.enum(['ROLE_APPLICANT', 'ROLE_HR', 'ROLE_ADMIN']),
  exp: z.number(),
});

function formatPublicKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.trim()) {
    throw new Error('JWT_PUBLIC_KEY is required.');
  }
  const trimmed = rawKey.trim();
  return trimmed.includes('BEGIN PUBLIC KEY')
    ? trimmed
    : `-----BEGIN PUBLIC KEY-----\n${trimmed}\n-----END PUBLIC KEY-----`;
}

export function authenticateJwt(jwtPublicKey) {
  const publicKey = formatPublicKey(jwtPublicKey);
  return (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? '');
    if (!match) return next(new ApiError(401, 'UNAUTHORIZED', 'A Bearer token is required.'));
    try {
      req.user = claims.parse(jwt.verify(match[1], publicKey, { algorithms: ['RS256'] }));
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
