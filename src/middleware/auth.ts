import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = 'mysecretkey123'; 

export interface AuthRequest extends Request {
  user?: { role: string };
}

// JWT authentication token 
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Token missing' });
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as { role: string };
    req.user = { role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid token' });
  }
};

// Role-based authorization 
export const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    next();
  };
};

// Utility to generate JWT tokens for testing
export const generateToken = (role: 'reader' | 'editor') => {
  return jwt.sign({ role }, SECRET_KEY, { expiresIn: '1h' });
};