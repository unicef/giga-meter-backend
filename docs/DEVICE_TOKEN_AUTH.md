# Device Token Authentication

This document describes the device token authentication system implemented in the NestJS application. This system provides secure token-based authentication for devices using device fingerprints or UUIDs.

## Overview

The device token authentication system works alongside the existing Bearer token authentication without interfering with it. It uses AES-256-GCM encryption to generate secure, time-limited tokens for device-based authentication.

### Key Features

- **Secure Encryption**: Uses AES-256-GCM with random IVs and authentication tags
- **Device-Based**: Tokens are tied to specific device fingerprints or UUIDs
- **Time-Limited**: Tokens expire after 24 hours by default
- **Non-Interfering**: Works alongside existing Bearer token authentication
- **Comprehensive Testing**: Full unit test coverage for all components

## Architecture

### Components

1. **DeviceTokenService** (`src/auth/device-token.service.ts`)
   - Handles token generation and validation
   - Manages encryption/decryption using AES-256-GCM
   - Provides device ID hashing for consistency

2. **DeviceTokenController** (`src/auth/device-token.controller.ts`)
   - Exposes REST endpoints for token operations
   - Handles input validation and error responses
   - Provides token generation and validation endpoints

3. **AuthGuard** (`src/auth/auth.guard.ts`) - Enhanced
   - Modified to support both Bearer and Device token schemes
   - Routes requests to appropriate validation logic
   - Maintains backward compatibility with existing Bearer tokens

## API Endpoints

### Generate Device Token

**POST** `/auth/device/generate-token`

Generates a new device token for the provided device identifier.

#### Request Body
```json
{
  "deviceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response
```json
{
  "token": "base64-encoded-encrypted-token",
  "expiresAt": 1692123456789,
  "deviceId": "hashed-device-id",
  "success": true,
  "message": "Token generated successfully"
}
```

#### Device ID Requirements
- Must be at least 8 characters long
- Can be a UUIDv4, UUIDv1, or custom device fingerprint
- Will be hashed using SHA-256 for consistent identification

### Validate Device Token (Testing Only)

**POST** `/auth/device/validate-token`

Validates a device token and returns its payload. This endpoint is intended for testing and should be removed or secured in production.

#### Request Body
```json
{
  "token": "base64-encoded-encrypted-token"
}
```

#### Response
```json
{
  "valid": true,
  "payload": {
    "deviceId": "hashed-device-id",
    "timestamp": 1692123456789,
    "expiresAt": 1692209856789
  },
  "message": "Token is valid"
}
```

## Authentication Usage

### Using Device Tokens

To authenticate with a device token, include it in the Authorization header with the `Device` scheme:

```http
Authorization: Device <base64-encoded-token>
```

### Using Bearer Tokens (Existing)

Bearer tokens continue to work as before:

```http
Authorization: Bearer <jwt-or-api-key>
```

### Token Type Detection

The AuthGuard automatically detects the token type based on the authorization scheme:
- `Bearer`: Routes to existing Bearer token validation
- `Device`: Routes to new device token validation

## Environment Configuration

Add the following environment variable to your `.env` file:

```bash
# Device Token Configuration
# Master encryption key for device tokens (32 bytes, base64 encoded)
DEVICE_TOKEN_MASTER_KEY=dGVzdC1rZXktMzItYnl0ZXMtZm9yLWRldmljZS10b2tlbg==
```

### Generating a New Master Key

To generate a new 32-byte base64-encoded key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important**: 
- Use a different key for each environment (development, staging, production)
- Keep the master key secure and never commit it to version control
- Changing the master key will invalidate all existing device tokens

## Security Considerations

### Encryption Details

- **Algorithm**: AES-256-GCM
- **Key Size**: 32 bytes (256 bits)
- **IV Size**: 16 bytes (128 bits) - randomly generated for each token
- **Auth Tag**: 16 bytes - provides authentication and integrity

### Token Structure

Each device token contains:
1. **IV** (16 bytes): Random initialization vector
2. **Auth Tag** (16 bytes): GCM authentication tag
3. **Encrypted Payload**: JSON containing device ID, timestamps

### Security Features

- **Unique IVs**: Each token uses a fresh random IV
- **Authentication**: GCM mode provides built-in authentication
- **Device Binding**: Tokens are cryptographically bound to device IDs
- **Time Limits**: Tokens automatically expire after 24 hours
- **Hash Consistency**: Device IDs are hashed for consistent identification

## Request Context

When a device token is validated, the following properties are added to the request object:

```typescript
request.deviceId = "hashed-device-id";
request.tokenType = "device";
request.has_write_access = false; // Device tokens have limited access
request.category = "device";
```

This allows controllers and services to differentiate between Bearer and Device token requests.

## Error Handling

### Common Error Responses

#### Missing Device ID
```json
{
  "statusCode": 400,
  "message": "Device ID is required",
  "error": "Bad Request"
}
```

#### Invalid Device ID
```json
{
  "statusCode": 400,
  "message": "Device ID must be at least 8 characters long",
  "error": "Bad Request"
}
```

#### Token Generation Failure
```json
{
  "statusCode": 400,
  "message": "Failed to generate token",
  "error": "Bad Request"
}
```

#### Authentication Errors
```json
{
  "statusCode": 401,
  "message": "Invalid device token or not authorized to access",
  "error": "Unauthorized"
}
```

## Testing

### Running Tests

```bash
# Run all auth tests
npm test -- --testPathPattern=auth

# Run device token specific tests
npm test -- --testPathPattern=device-token

# Run with coverage
npm test -- --coverage --testPathPattern=auth
```

### Test Coverage

The implementation includes comprehensive unit tests covering:

#### DeviceTokenService Tests
- Token generation with various device ID formats
- Token validation and expiration handling
- Error scenarios and edge cases
- Environment configuration handling
- Encryption/decryption functionality

#### DeviceTokenController Tests
- Request validation and sanitization
- Response formatting
- Error handling and status codes
- UUID validation logic

### Manual Testing

#### Generate a Token
```bash
curl -X POST http://localhost:3000/auth/device/generate-token \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "550e8400-e29b-41d4-a716-446655440000"}'
```

#### Use Token for Authentication
```bash
curl -X GET http://localhost:3000/protected-endpoint \
  -H "Authorization: Device <token-from-previous-step>"
```

## Migration and Deployment

### Deployment Checklist

1. **Environment Variables**
   - [ ] Set `DEVICE_TOKEN_MASTER_KEY` in production environment
   - [ ] Verify key is different from development/staging
   - [ ] Ensure key is properly base64 encoded

2. **Security Review**
   - [ ] Remove or secure the `/auth/device/validate-token` endpoint
   - [ ] Review device token access permissions
   - [ ] Verify logging doesn't expose sensitive data

3. **Monitoring**
   - [ ] Set up alerts for token generation failures
   - [ ] Monitor device token usage patterns
   - [ ] Track authentication error rates

### Backward Compatibility

This implementation maintains full backward compatibility:
- Existing Bearer token authentication continues to work unchanged
- No modifications required for existing API clients
- All existing endpoints and functionality preserved

## Troubleshooting

### Common Issues

#### "DEVICE_TOKEN_MASTER_KEY not set" Warning
- **Cause**: Environment variable not configured
- **Solution**: Add the master key to your `.env` file

#### Token Validation Fails
- **Cause**: Wrong master key or corrupted token
- **Solution**: Verify master key matches the one used for generation

#### "Unsupported authorization scheme" Error
- **Cause**: Invalid Authorization header format
- **Solution**: Use `Device <token>` or `Bearer <token>` format

#### Token Expired
- **Cause**: Token is older than 24 hours
- **Solution**: Generate a new token

### Debug Logging

Enable debug logging to troubleshoot issues:

```typescript
// In your main.ts or app configuration
app.useLogger(['error', 'warn', 'log', 'debug']);
```

Device token operations are logged with the `DeviceTokenService` and `DeviceTokenController` contexts.

## Performance Considerations

### Token Generation
- Each token generation requires cryptographic operations
- Consider rate limiting token generation endpoints
- Monitor CPU usage during high token generation loads

### Token Validation
- Validation involves decryption and JSON parsing
- Generally faster than external API calls (Bearer tokens)
- Consider caching validated tokens for short periods if needed

### Memory Usage
- Each token contains ~100-200 bytes of encrypted data
- No server-side token storage required
- Stateless design scales horizontally

## Future Enhancements

### Potential Improvements
1. **Token Refresh**: Implement refresh token mechanism
2. **Scope-Based Access**: Add permission scopes to device tokens
3. **Device Management**: Track and manage registered devices
4. **Audit Logging**: Enhanced logging for security audits
5. **Rate Limiting**: Built-in rate limiting for token operations

### Configuration Options
Consider making these configurable:
- Token TTL (currently 24 hours)
- Encryption algorithm (currently AES-256-GCM)
- Device ID validation rules
- Access permissions for device tokens
