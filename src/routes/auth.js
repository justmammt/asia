const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Email transport configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
}
});

// Input validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});

const requestOtpSchema = z.object({
  email: z.string().email()
});

// Rate limit configuration
const rateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const maxRequestsPerWindow = 5;
const otpRateLimitWindowMs = 15 * 60 * 1000; // 15 minutes
const maxOtpRequestsPerWindow = 3;
const rateLimits = new Map();

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = signupSchema.parse(req.body);
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP
    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry }
    });

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify your email',
      text: `Your OTP is: ${otp}`
    });

    res.status(201).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Request OTP endpoint
router.post('/request-otp', async (req, res) => {
  try {
    const { email } = requestOtpSchema.parse(req.body);
    
    // Check rate limit
    const requestCount = (rateLimits.get(email) || 0) + 1;
    if (requestCount > maxOtpRequestsPerWindow) {
      return res.status(429).json({
        error: 'Too many OTP requests',
        retryAfter: otpRateLimitWindowMs
      });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      rateLimits.set(email, requestCount);
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: { otp, otpExpiry }
    });

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      name: "Asia Vehicle Management",
      subject: `Your OTP Code is ${otp}`,
      text: `Your OTP is: ${otp}`
    }, (error, info) => {
      if (error) {
          return console.log('Errore durante l\'invio:', error);
      }
      console.log('Email inviata:', info.response);
  });

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login schema validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  otp: z.string().length(6)
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, otp } = loginSchema.parse(req.body);
    
    // Check rate limit
    const now = Date.now();
    const requestCount = (rateLimits.get(email) || 0) + 1;
    
    if (requestCount > maxRequestsPerWindow) {
      // Send emergency email if rate limit exceeded
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Account Security Alert',
        text: `Multiple failed login attempts detected for your account. Please contact support if this wasn't you.`
      });

      return res.status(429).json({
        error: 'Too many login attempts',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateLimitWindowMs,
        emergencyEmailSent: true
      });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      rateLimits.set(email, requestCount);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      rateLimits.set(email, requestCount);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify OTP
    if (user.otp !== otp || new Date() > user.otpExpiry) {
      rateLimits.set(email, requestCount);
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Reset rate limit on successful login
    rateLimits.delete(email);

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '720h' }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    res.json({
      token,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
