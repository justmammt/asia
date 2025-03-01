const { z } = require('zod');
const { isValidUUID } = require('../utils/validation');

const sharedLinkSchema = z.object({
  vehicleId: z.string().refine(isValidUUID, {
    message: 'Invalid vehicle ID format'
  }),
  expiresInHours: z.number().int().positive(),
  description: z.string().optional()
});

const validateSharedLink = (req, res, next) => {
  try {
    const validatedData = sharedLinkSchema.parse(req.body);
    req.validatedData = validatedData;
    next();
  } catch (error) {
    res.status(400).json({
      error: 'Invalid shared link data',
      details: error.errors
    });
  }
};

module.exports = {
  validateSharedLink
};
