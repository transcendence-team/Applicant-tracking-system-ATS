import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Express Request interface to include our decoded user payload
export interface AuthRequest extends Request {
    user?: any;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    // 1. Extract the token from the Authorization header (Format: "Bearer <token>")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
        res.status(401).json({ error: 'Access Denied: No Token Provided' });
        return;
    }

    try {
        // 2. Verify the token using the exact same secret defined in Spring Boot's .env
        const verified = jwt.verify(token, process.env.JWT_SECRET as string);
        
        // 3. Attach the decoded payload (UUID, role) to the request object
        req.user = verified; 
        
        // 4. Token is valid, proceed to the route controller
        next(); 
    } catch (error) {
        res.status(403).json({ error: 'Invalid or Expired Token' });
    }
};