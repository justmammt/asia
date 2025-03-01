# Vehicle Management System Codebase Documentation

## Overview
A full-stack system for managing vehicle maintenance, sharing, and damage reporting with Italian compliance features. Built with Node.js, Express, Prisma, and PostgreSQL.

```mermaid
graph TD
    A[User] --> B[Vehicle]
    B --> C[MaintenanceLog]
    B --> D[DamageReport]
    B --> E[SharedLink]
    A --> F[UserSettings]
    A --> G[AuditLog]
```

## Core Components

### 1. Database Schema (Prisma)
#### Key Models:

```prisma
model User {
  // Authentication & Security
  id                 String    @id @default(uuid())
  email              String    @unique
  passwordHash       String    
  twoFactorEnabled   Boolean   
  // Maintenance Tracking
  vehicles           Vehicle[]
  // System Settings
  settings           UserSettings?
  // Security Monitoring
  auditLogs          AuditLog[]
}

model Vehicle {
  // Identification
  plateNumber        String    @unique
  // Relationships
  type               VehicleType
  // Maintenance Intervals (Days)
  insuranceInterval  Int?      
  taxInterval        Int?      
  revisionInterval   Int?      
  // Status Tracking
  damageStatus       String?   
  damageDescription  String?   
  // Temporal Data
  createdAt          DateTime  
  updatedAt          DateTime  
}
```

### 2. API Structure (OpenAPI)
#### Key Endpoints:

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant Database
    
    Client->>API: POST /vehicles
    API->>AuthService: Verify JWT
    AuthService-->>API: Valid Token
    API->>Database: Create Vehicle
    Database-->>API: Vehicle Record
    API-->>Client: 201 Created
```

| Endpoint Category | Key Features |
|-------------------|--------------|
| Authentication    | 2FA, OTP, Rate Limiting, Password Complexity |
| Vehicles          | Italian plate validation, Maintenance scheduling, Status coloring |
| Sharing           | Time-limited tokens, Revocation, Access tracking |
| Damage Reports    | Severity levels, Resolution tracking, Vehicle history |

### 3. Security Architecture
```mermaid
graph LR
    A[Request] --> B{JWT Validation}
    B -->|Valid| C[Route Handler]
    B -->|Invalid| D[401 Response]
    C --> E[Prisma ORM]
    E --> F[PostgreSQL]
    style B fill:#f9f,stroke:#333
```

- **JWT Authentication**: Bearer token required for all endpoints
- **Password Requirements**:
  - 12-72 characters
  - Upper + lowercase + number + special character
- **Security Monitoring**:
  - Failed login tracking
  - Account lockout after 5 attempts
  - Audit logs for sensitive operations

### 4. Validation System
```javascript
// Example Zod schema from vehicles.js
const vehicleSchema = z.object({
  plate: z.string().regex(/^([A-Z]{2}[\s-]?[0-9]{3}[\s-]?[A-Z]{2}/),
  type: z.enum(['car','motorcycle','truck','military']),
  insuranceInterval: z.number().int().positive().optional(),
  taxInterval: z.number().int().positive().optional(),
  inspectionInterval: z.number().int().positive().optional()
});
```

**Validation Features**:
- Italian license plate format enforcement
- Interval day validation (positive integers)
- Enum validation for vehicle types
- Optional/Mandatory field handling

### 5. Maintenance Scheduling
**Key Functions**:
```javascript
// From utils/dates.js
function calculateDueDateItaly(baseDate, intervalDays) {
  // Italian business day calculation
  // Skips weekends and national holidays
  // Returns Date object
}
```

**Status Coloring**:
```javascript
function getStatusColor(dueDate) {
  const daysRemaining = calculateDaysRemaining(dueDate);
  
  if (daysRemaining <= userSettings.redThreshold) return 'red';
  if (daysRemaining <= userSettings.orangeThreshold) return 'orange';
  return 'green';
}
```

### 6. Damage Reporting System
**Workflow**:
1. User submits damage report with severity level
2. System updates vehicle status
3. Mechanics receive notifications
4. Resolution tracking with timestamps

```mermaid
stateDiagram-v2
    [*] --> NoDamage: Initial State
    NoDamage --> Minor: Minor damage reported
    NoDamage --> Moderate: Moderate damage
    NoDamage --> Severe: Major damage
    Minor --> Repaired: Fix verified
    Moderate --> Repaired: Fix verified
    Severe --> Repaired: Fix verified
    Repaired --> NoDamage: Reset status
```

### 7. Shared Access System
**Token Features**:
- 16-character unique tokens
- Configurable expiration (1-168 hours)
- Revocation capability
- Detailed access tracking

**Security Measures**:
- Token entropy validation
- IP-based usage tracking
- Automatic expiration cleanup
- Owner visibility only

## Development Setup

### Requirements
- Node.js 18+
- PostgreSQL 15+
- Redis (for rate limiting)

### Configuration
```bash
# .env Example
POSTGRES_EXTERNAL_URL="postgres://user:pass@host:5432/db"
JWT_SECRET="your-secret-key"
REDIS_URL="redis://localhost:6379"
```

### Key Commands
```bash
# Database migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Start development server
npm run dev
```

## API Documentation
Full OpenAPI spec available at `/docs` endpoint in development mode.
