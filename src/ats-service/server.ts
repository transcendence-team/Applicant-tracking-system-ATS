import express, { Request, Response } from 'express';
import cors from 'cors';
import { verifyToken, AuthRequest } from './middleware/verifyToken';

const app = express();

app.use(express.json());
app.use(cors());

// Public Route: Health Check
app.get('/api/ats/health', (req: Request, res: Response) => {
    res.json({ status: 'ATS Core API is running!' });
});

// Protected Route: Tests your JWT Middleware
app.get('/api/ats/protected-test', verifyToken, (req: AuthRequest, res: Response) => {
    res.json({ 
        message: 'Gateway passed! Token verified successfully.', 
        user_uuid: req.user.sub,
        role: req.user.role
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ATS Core API listening on port ${PORT}`);
});