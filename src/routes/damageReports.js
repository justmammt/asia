const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth.js');
const { validateDamageReport } = require('../validators/damageReports.js');

const router = Router();
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Create new damage report
router.post('/:id/damage-reports', authenticateToken, validateDamageReport, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, severity } = req.body;

    const damageReport = await prisma.damageReport.create({
      data: {
        vehicleId: id,
        description,
        severity,
      },
    });

    res.status(201).json({
      ...damageReport,
      reportedAt: damageReport.reportedAt.toISOString().split('T')[0],
      resolvedAt: damageReport.resolvedAt ? damageReport.resolvedAt.toISOString().split('T')[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create damage report' });
  }
});

// Get all damage reports for a vehicle
router.get('/:id/damage-reports', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const damageReports = await prisma.damageReport.findMany({
      where: { vehicleId: id },
      orderBy: { reportedAt: 'desc' },
    });

    res.json(damageReports.map(report => ({
      ...report,
      reportedAt: report.reportedAt.toISOString().split('T')[0],
      resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString().split('T')[0] : null
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch damage reports' });
  }
});

// Update damage report
router.put('/damage-reports/:reportId', authenticateToken, validateDamageReport, async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { description, severity, resolvedAt } = req.body;

    const updatedReport = await prisma.damageReport.update({
      where: { id: reportId },
      data: {
        description,
        severity,
        resolvedAt: resolvedAt ? new Date(resolvedAt) : null,
      },
    });

    res.json({
      ...updatedReport,
      reportedAt: updatedReport.reportedAt.toISOString().split('T')[0],
      resolvedAt: updatedReport.resolvedAt ? updatedReport.resolvedAt.toISOString().split('T')[0] : null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update damage report' });
  }
});

// Delete damage report
router.delete('/damage-reports/:reportId', authenticateToken, async (req, res, next) => {
  try {
    const { reportId } = req.params;

    await prisma.damageReport.delete({
      where: { id: reportId },
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete damage report' });
  }
});

module.exports = router;
