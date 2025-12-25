# API Structure Documentation

## Folder Structure

```
app/api/
├── auth/
│   └── callback/
│       └── route.js          # OAuth callback handler
├── users/
│   └── route.js              # User CRUD operations
├── management/
│   ├── route.js              # Management CRUD operations
│   └── stats/
│       └── route.js          # Management statistics
└── onboarding/
    └── setup/
        └── route.js          # Management setup (first-time admin)
```

## Database Structure

### Location
- **Connection**: `lib/db/connection.js` - MongoDB client connection
- **Collections**: `lib/db/collections.js` - Collection helpers and initialization
- **Legacy**: `utils/db/db.js` - Backward compatibility wrapper

### Database Name
- Default: `student_management`
- Configurable via `DB_NAME` constant

### Collections
- **users** - User accounts
- **management** - Management/organization data

## API Endpoints

### Authentication

#### `GET /api/auth/callback`
- Handles Google OAuth callback
- Creates/updates user records
- Creates management for first user from domain
- Sets session cookies
- **Initializes collections automatically**

### Users

#### `GET /api/users`
- Get current user or specific user
- Query params:
  - `userId` - Get specific user (admin or own profile)
  - `managementId` - Get all users from management
- **Initializes collections automatically**

#### `PUT /api/users`
- Update current user profile
- Fields: `name`, `picture`
- **Initializes collections automatically**

### Management

#### `GET /api/management`
- Get management information
- Query params:
  - `managementId` - Specific management (default: user's management)
- Returns management data with admin info
- **Initializes collections automatically**

#### `PUT /api/management`
- Update management information (admin only)
- Fields: `name`, `numCoaches`, `numStudents`, `logo`
- **Initializes collections automatically**

#### `GET /api/management/stats`
- Get management statistics (admin only)
- Returns: user counts, coach/student counts, etc.
- **Initializes collections automatically**

### Onboarding

#### `POST /api/onboarding/setup`
- Complete management setup (first-time admin)
- Fields: `name`, `numCoaches`, `numStudents`, `logo`
- **Initializes collections automatically**

## Collection Initialization

All routes automatically call `initializeCollections(DB_NAME)` which:
1. Creates indexes on collections
2. Ensures proper database structure
3. Sets up unique constraints

### Indexes Created

**Users Collection:**
- `email` (unique)
- `googleId` (unique)
- `managementId`
- `emailDomain`

**Management Collection:**
- `managementId` (unique)
- `emailDomain` (unique)
- `adminId`

## Usage Example

```javascript
import { getUsersCollection, initializeCollections, DB_NAME } from '@/lib/db/collections'

// In your route handler
export async function GET(request) {
  // Initialize collections (creates indexes if needed)
  await initializeCollections(DB_NAME)
  
  // Get collection
  const usersCollection = await getUsersCollection(DB_NAME)
  
  // Use collection
  const users = await usersCollection.find({}).toArray()
  
  return NextResponse.json({ users })
}
```

## Migration Notes

- Old imports from `@/utils/db/db` still work (backward compatible)
- New code should use `@/lib/db/collections`
- All routes now initialize collections automatically
- Database name is centralized in `DB_NAME` constant













