import { Router } from 'express';
import { generateToken } from '../middleware/auth';

const router = Router();

// Simple login route to generate JWT token based on role
router.post('/login', (req, res) => {
  const { role } = req.body;
  if (role !== 'reader' && role !== 'editor') {
    return res.status(400).json({ code: 'INVALID_ROLE', message: 'Role must be reader or editor' });
  }

  const token = generateToken(role);
  res.json({ token, role });
});

export default router;