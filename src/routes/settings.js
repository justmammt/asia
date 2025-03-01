const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = Router();
const prisma = new PrismaClient();

// Get current user settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        notificationDays: true,
        redThreshold: true,
        orangeThreshold: true
      }
    });

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        notificationDays: 7,
        redThreshold: 10,
        orangeThreshold: 25
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ error: 'Failed to fetch user settings' });
  }
});

// Update user settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationDays, redThreshold, orangeThreshold } = req.body;

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        notificationDays,
        redThreshold,
        orangeThreshold
      },
      create: {
        userId,
        notificationDays,
        redThreshold,
        orangeThreshold
      }
    });

    res.json({
      notificationDays: updatedSettings.notificationDays,
      redThreshold: updatedSettings.redThreshold,
      orangeThreshold: updatedSettings.orangeThreshold
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

module.exports = router;
