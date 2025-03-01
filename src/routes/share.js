const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { validateSharedLink } = require('../validators/share');

const router = Router();
const prisma = new PrismaClient();

// Generate shareable link
router.post('/generate', authenticateToken, validateSharedLink, async (req, res) => {
  try {
    const { vehicleId, expiresInHours, description } = req.body;
    const userId = req.user.id;

    // Verify user owns the vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true }
    });

    if (!vehicle || vehicle.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to vehicle' });
    }

    // Generate unique token
    const token = require('crypto').randomBytes(8).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const sharedLink = await prisma.sharedLink.create({
      data: {
        vehicleId,
        token,
        expiresAt,
        description
      }
    });

    res.status(201).json({
      token: sharedLink.token,
      url: `${process.env.APP_URL}/share/${sharedLink.token}`,
      expiresAt: sharedLink.expiresAt.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// Get shared links
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'active', sort = 'createdAt', order = 'desc' } = req.query;
    const userId = req.user.id;
    
    const where = {
      vehicle: { userId },
      ...(status === 'active' && { expiresAt: { gt: new Date() } }),
      ...(status === 'expired' && { expiresAt: { lte: new Date() } })
    };

    const [links, total] = await Promise.all([
      prisma.sharedLink.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              type: true
            }
          }
        },
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.sharedLink.count({ where })
    ]);

    res.json({
      data: links.map(link => ({
        ...link,
        url: `${process.env.APP_URL}/share/${link.token}`
      })),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        hasMore: (page * limit) < total
      }
    });
  } catch (error) {
    console.error('Error fetching shared links:', error);
    res.status(500).json({ error: 'Failed to fetch shared links' });
  }
});

// Get shared link details
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token format
    if (!/^[a-f0-9]{16}$/.test(token)) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    const sharedLink = await prisma.sharedLink.findUnique({
      where: { token },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            type: true,
            insuranceDue: true,
            taxDue: true,
            inspectionDue: true,
            damageStatus: true,
          }
        }
      }
    });

    if (!sharedLink) {
      return res.status(404).json({ error: 'Shared link not found' });
    }

    // Check if link is expired
    const isExpired = sharedLink.expiresAt < new Date();

    res.json({
      token: sharedLink.token,
      url: `${process.env.APP_URL}/share/${sharedLink.token}`,
      description: sharedLink.description,
      createdAt: sharedLink.createdAt.toISOString().split('T')[0],
      expiresAt: sharedLink.expiresAt.toISOString().split('T')[0],
      isExpired,
      vehicle: sharedLink.vehicle
    });
  } catch (error) {
    console.error('Error fetching shared link:', error);
    res.status(500).json({ error: 'Failed to fetch shared link' });
  }
});

// Revoke shared link
router.delete('/:token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.id;

    // Find and verify ownership
    const sharedLink = await prisma.sharedLink.findUnique({
      where: { token },
      include: { vehicle: true }
    });

    if (!sharedLink || sharedLink.vehicle.userId !== userId) {
      return res.status(404).json({ error: 'Shared link not found' });
    }

    await prisma.sharedLink.delete({
      where: { token }
    });

    res.status(204).end();
  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

module.exports = router;
