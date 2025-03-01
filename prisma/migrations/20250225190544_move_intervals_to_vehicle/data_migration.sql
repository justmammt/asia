-- Copy interval values from VehicleType to Vehicle
UPDATE "Vehicle" v
SET 
  insurance_interval = vt.insurance_interval,
  tax_interval = vt.tax_interval,
  revision_interval = vt.revision_interval
FROM "VehicleType" vt
WHERE v.type_id = vt.id;
