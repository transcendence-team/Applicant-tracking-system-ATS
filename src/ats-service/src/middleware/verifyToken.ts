import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
    sub: string;
    email: string;
    role: 'ROLE_APPLICANT' | 'ROLE_HR' | 'ROLE_ADMIN';
    firstName?: string;
    lastName?: string;
    iat?: number;
    exp?: number;
}

// Extend the Express Request interface to include our decoded user payload
export interface AuthRequest extends Request {
    user?: JwtPayload;
}

function resolvePublicKey(rawKey: string | undefined): string {
    if (!rawKey) {
        throw new Error('JWT_PUBLIC_KEY is not configured');
    }
    const trimmed = rawKey.trim();
    if (trimmed.includes('BEGIN PUBLIC KEY')) {
        return trimmed.replace(/\\n/g, '\n');
    }
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.includes('BEGIN PUBLIC KEY')) {
        return decoded;
    }
    return `-----BEGIN PUBLIC KEY-----\n${trimmed}\n-----END PUBLIC KEY-----`;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // 1. Extract the token from the Authorization header (Format: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Access denied: No token provided',
        });
        return;
    }

    try {
        // 2. Verify the RS256 signature using only the RSA Public Key
        const publicKey = resolvePublicKey(process.env.JWT_PUBLIC_KEY);
        const verified = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
        
        // 3. Attach the decoded payload (UUID, role, name) to the request object
        req.user = verified; 
        
        // 4. Token is valid, proceed to the route controller
        next(); 
    } catch (error) {
        res.status(403).json({
            error: 'FORBIDDEN',
            message: 'Invalid or expired token',
        });
    }
};