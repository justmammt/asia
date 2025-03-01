const { z } = require('zod');

const damageReportSchema = z.object({
  description: z.string().min(10).max(500),
  severity: z.enum(['MINOR', 'MODERATE', 'SEVERE']),
  resolvedAt: z.string().datetime().optional(),
});

function validateDamageReport(req, res, next) {
  try {
    damageReportSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid damage report data' });
  }
}

module.exports = { validateDamageReport };
