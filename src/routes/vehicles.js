const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { calculateDueDateItaly } = require('../utils/dates');
const { authenticateToken } = require('../middleware/auth');

const prisma = new PrismaClient();

// Italian license plate regex
const plateRegex = /^([A-Z]{2}[\s-]?[0-9]{3}[\s-]?[A-Z]{2}|[A-Z]{2}[\s-]?[0-9]{4}[A-Z]{2})$/;

// Vehicle schema
const dateSchema = z.string().date();
const vehicleSchema = z.object({
  plate: z.string().regex(plateRegex),
  type: z.string().max(1), // Vehicle type name
  insuranceInterval: z.number().int().positive().optional(),
  taxInterval: z.number().int().positive().optional(),
  inspectionInterval: z.number().int().positive().optional(),
  lastInsurancePaid: dateSchema,
  lastTaxPaid: dateSchema,
  lastInspectionPaid: dateSchema
});

// Add vehicle
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { plate, type: typeName, insuranceInterval, taxInterval, lastInsurancePaid, lastTaxPaid, lastInspectionPaid } = vehicleSchema.parse(req.body);

    if (typeName != "b" && typeName != "c") {
      return res.status(400).json({ error: 'Invalid vehicle type' })
    }

    // Calculate initial due dates
    const insuranceDue = insuranceInterval ? calculateDueDateItaly(new Date(lastInsurancePaid), insuranceInterval) : null;
    const taxDue = taxInterval ? calculateDueDateItaly(new Date(lastTaxPaid), taxInterval) : null;
    const inspectionDue = lastInspectionPaid ? calculateDueDateItaly(new Date(lastInspectionPaid), typeName === "c" ? 365 : 730) : null;

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: plate,
        type: typeName,
        insuranceInterval,
        taxInterval,
        
        insuranceDue,
        taxDue,
        inspectionDue,
        user: {
          connect: { id: req.user.id }
        }
      }
    });

    res.status(201).json({
      ...vehicle,
      insuranceDue: vehicle.insuranceDue ? vehicle.insuranceDue.toISOString().split('T')[0] : null,
      taxDue: vehicle.taxDue ? vehicle.taxDue.toISOString().split('T')[0] : null,
      inspectionDue: vehicle.inspectionDue ? vehicle.inspectionDue.toISOString().split('T')[0] : null
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Invalid vehicle data' });
  }
});

// Get vehicle list with status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        plateNumber: true,
        type: true,
        insuranceDue: true,
        taxDue: true,
        inspectionDue: true
      }
    });

    // Add status colors
    const vehiclesWithStatus = vehicles.map(vehicle => ({
      ...vehicle,
      status: {
        insurance: getStatusColor(vehicle.insuranceDue),
        tax: getStatusColor(vehicle.taxDue),
        inspection: getStatusColor(vehicle.inspectionDue)
      }
    }));

    res.json(vehiclesWithStatus.map(vehicle => ({
      ...vehicle,
      insuranceDue: vehicle.insuranceDue ? vehicle.insuranceDue.toISOString().split('T')[0] : null,
      taxDue: vehicle.taxDue ? vehicle.taxDue.toISOString().split('T')[0] : null,
      inspectionDue: vehicle.inspectionDue ? vehicle.inspectionDue.toISOString().split('T')[0] : null
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper to get status color
function getStatusColor(dueDate) {
  if (!dueDate) return 'gray';

  const daysRemaining = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 10) return 'red';
  if (daysRemaining <= 25) return 'orange';
  return 'green';
}
// Get vehicle
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id, userId: req.user.id },
      select: {
        id: true,
        plateNumber: true,
        type: true,
        userId: true,
        insuranceDue: true,
        taxDue: true,
        inspectionDue: true
      }
    });
    const user = await prisma.user.findUnique({

    })
    if (vehicle.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(200).json({
      ...vehicle,
      insuranceDue: vehicle.insuranceDue ? vehicle.insuranceDue.toISOString().split('T')[0] : null,
      taxDue: vehicle.taxDue ? vehicle.taxDue.toISOString().split('T')[0] : null,
      inspectionDue: vehicle.inspectionDue ? vehicle.inspectionDue.toISOString().split('T')[0] : null,
      insurance: getStatusColor(vehicle.insuranceDue),
      tax: getStatusColor(vehicle.taxDue),
      inspection: getStatusColor(vehicle.inspectionDue)
    });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Vehicle not found' });
    } else {
      res.status(400).json({ error: 'Invalid vehicle data' });
    }
  }
})
// Update vehicle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = vehicleSchema.partial().parse(req.body);

    // Recalculate due dates if intervals are updated
    const now = new Date();
    if (updateData.insuranceInterval) {
      updateData.insuranceDue = calculateDueDateItaly(now, updateData.insuranceInterval);
    }
    if (updateData.taxInterval) {
      updateData.taxDue = calculateDueDateItaly(now, updateData.taxInterval);
    }


    const updatedVehicle = await prisma.vehicle.update({
      where: { id, userId: req.user.id },
      data: updateData,
      select: {
        id: true,
        plate: true,
        type: true,
        insuranceDue: true,
        taxDue: true,
        inspectionDue: true
      }
    });

    // Add status colors
    const vehicleWithStatus = {
      ...updatedVehicle,
      status: {
        insurance: getStatusColor(updatedVehicle.insuranceDue),
        tax: getStatusColor(updatedVehicle.taxDue),
        inspection: getStatusColor(updatedVehicle.inspectionDue)
      }
    };

    res.json({
      ...vehicleWithStatus,
      insuranceDue: vehicleWithStatus.insuranceDue ? vehicleWithStatus.insuranceDue.toISOString().split('T')[0] : null,
      taxDue: vehicleWithStatus.taxDue ? vehicleWithStatus.taxDue.toISOString().split('T')[0] : null,
      inspectionDue: vehicleWithStatus.inspectionDue ? vehicleWithStatus.inspectionDue.toISOString().split('T')[0] : null
    });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Vehicle not found' });
    } else {
      res.status(400).json({ error: 'Invalid vehicle data' });
    }
  }
});

// Delete vehicle
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify vehicle exists and belongs to user
    const vehicle = await prisma.vehicle.findUnique({
      where: { id, userId: req.user.id }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    await prisma.vehicle.delete({
      where: { id }
    });

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
