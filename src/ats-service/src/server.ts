import 'dotenv/config';
import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import cors from "cors";
import { verifyToken, AuthRequest } from './middleware/verifyToken.js';
import { jobsRouter } from './jobs.js';
const app = express();

app.use(express.json());
app.use(cors());
app.use('/api/ats/jobs', jobsRouter);

// Public Route: Health Check
app.get('/api/ats/health', (req: Request, res: Response) => {
    res.json({ status: 'ATS Core API is running!' });
});

// Protected Route: Tests your JWT Middleware
app.get('/api/ats/protected-test', verifyToken, (req: AuthRequest, res: Response) => {
    res.json({ 
        message: 'Gateway passed! Token verified successfully.', 
        user_uuid: req.user?.sub,
        role: req.user?.role
    });
});

const handleError: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
        res.status(error.status).json({ error: 'INVALID_BODY', message: error.type === 'entity.too.large'
            ? 'Request body is too large.'
            : 'Request body must be valid JSON.' });
        return;
    }
    console.error('ATS request failed:', error);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
};

app.use(handleError);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => {
    console.log(`ATS Core API listening on port ${PORT}`);
});
