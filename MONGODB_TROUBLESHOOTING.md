# MongoDB Connection Troubleshooting

## SSL/TLS Error Fix

If you're getting SSL/TLS errors like:
```
ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR
MongoNetworkError: SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

## Common Causes & Solutions

### 1. IP Whitelist Issue (Most Common)

**Problem:** Your IP address is not whitelisted in MongoDB Atlas.

**Solution:**
1. Go to https://cloud.mongodb.com/
2. Navigate to your cluster → Network Access
3. Click "Add IP Address"
4. Add your current IP address OR
5. Click "Allow Access from Anywhere" (0.0.0.0/0) for development (NOT recommended for production)

### 2. Connection String Format

**Current Connection String:**
```
mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority
```

**Verify:**
- Username: `clashseven02_db_user`
- Password: `NThuq1VYGB5jM5rv`
- Cluster: `cluster0.opegv1r.mongodb.net`
- Database: `student_management`

### 3. Network/Firewall Issues

**Check:**
- Your internet connection
- Firewall settings
- VPN (if using one, try disconnecting)

### 4. MongoDB Atlas Cluster Status

**Check:**
1. Go to MongoDB Atlas dashboard
2. Verify your cluster is running (not paused)
3. Check if there are any service alerts

## Testing Connection

You can test the connection manually:

```bash
# Using MongoDB Compass or mongosh
mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management
```

## Environment Variable

Make sure your `.env.local` has:

```env
MONGODB_URI=mongodb+srv://clashseven02_db_user:NThuq1VYGB5jM5rv@cluster0.opegv1r.mongodb.net/student_management?retryWrites=true&w=majority
```

## Next Steps

1. **Check IP Whitelist** - This is the most common issue
2. **Verify credentials** - Make sure username/password are correct
3. **Test connection** - Try connecting with MongoDB Compass
4. **Check cluster status** - Ensure cluster is running in Atlas












