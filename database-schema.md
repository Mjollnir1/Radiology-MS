# Radiology Clinic Database Schema

## Entities

### 1. Admin
- **id**: Primary key (string)
- **email**: Unique email address
- **password**: Hashed password
- **name**: Full name
- **role**: "admin"
- **createdAt**: Timestamp
- **lastLogin**: Timestamp

### 2. Client
- **id**: Primary key (string)
- **email**: Unique email address
- **password**: Hashed password
- **phone**: 10-digit phone number
- **name**: Full name
- **role**: "client"
- **createdAt**: Timestamp
- **lastLogin**: Timestamp

### 3. Staff
- **id**: Primary key (string)
- **email**: Unique email address
- **password**: Hashed password
- **name**: Full name
- **role**: "staff"
- **department**: Department (e.g., "Radiology", "Reception")
- **createdAt**: Timestamp
- **lastLogin**: Timestamp

### 4. Appointments
- **id**: Primary key (string)
- **clientId**: Foreign key to Client
- **patientName**: Name of the patient
- **appointmentDate**: Date of appointment
- **appointmentTime**: Time of appointment
- **consultationType**: Type of consultation (X-Ray, CT Scan, MRI, Ultrasound)
- **status**: "scheduled", "confirmed", "cancelled", "completed"
- **notes**: Additional notes
- **createdAt**: Timestamp
- **updatedAt**: Timestamp

### 5. TimeSlots
- **id**: Primary key (string)
- **date**: Date
- **time**: Time slot
- **isAvailable**: Boolean
- **maxAppointments**: Maximum appointments for this slot
- **currentAppointments**: Current number of appointments
- **createdAt**: Timestamp

## Collections Structure (Firestore)

```
/artifacts/{appId}/
├── users/
│   ├── {userId}/
│   │   ├── profile: {email, name, role, phone?, department?}
│   │   └── appointments/
│   │       └── {appointmentId}: {patientName, date, time, type, status, notes}
├── appointments/
│   └── {appointmentId}: {clientId, patientName, date, time, type, status, notes, createdAt, updatedAt}
├── timeSlots/
│   └── {date}/
│       └── {time}: {isAvailable, maxAppointments, currentAppointments}
└── system/
    └── settings: {clinicHours, workingDays, etc.}
```

## Role Permissions

### Admin
- View all appointments
- Create, update, delete any appointment
- Manage users (create, update, delete)
- View system settings
- Manage time slots

### Staff
- View all appointments
- Update appointment status
- Reschedule appointments
- View available time slots
- Cannot delete appointments or manage users

### Client
- View only their own appointments
- Create new appointments
- Cancel their own appointments
- View available time slots
- Cannot modify other users' appointments

