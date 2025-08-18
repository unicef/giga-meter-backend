# Device Token Authentication with Security Enhancements

This document describes the comprehensive device token authentication system implemented in the NestJS application. This system provides secure token-based authentication for devices using device fingerprints or UUIDs, enhanced with multiple layers of security including nonce validation, HMAC signature verification, and HTTP security headers.

## Overview

The device token authentication system works alongside the existing Bearer token authentication without interfering with it. It uses AES-256-GCM encryption to generate secure, time-limited tokens for device-based authentication, implements nonce validation using Redis to prevent replay attacks, HMAC signature verification for message integrity, and Helmet security headers for comprehensive HTTP security.

### Key Features

- **Secure Encryption**: Uses AES-256-GCM with random IVs and authentication tags
- **Device-Based**: Tokens are tied to specific device fingerprints or UUIDs
- **Time-Limited**: Tokens expire after 24 hours by default
- **Replay Attack Prevention**: Nonce validation ensures each request can only be used once
- **Message Integrity**: HMAC-SHA256 signatures verify request authenticity
- **Redis Integration**: Uses Redis for distributed nonce storage with TTL-based cleanup
- **HTTP Security Headers**: Helmet middleware protects against common web vulnerabilities
- **Non-Interfering**: Works alongside existing Bearer token authentication
- **Comprehensive Testing**: Full unit test coverage for all components

## Architecture

### Components

1. **DeviceTokenService** (`src/auth/device-token.service.ts`)
   - Handles token generation and validation
   - Manages encryption/decryption using AES-256-GCM
   - Provides device ID hashing for consistency

2. **NonceService** (`src/auth/nonce.service.ts`)
   - Generates cryptographically secure nonces
   - Validates and consumes nonces to prevent replay attacks
   - Uses Redis for distributed nonce storage
   - Provides nonce format validation and statistics
   - **Replay Prevention**: Nonces prevent replay attacks
- **Message Integrity**: HMAC signatures ensure request data hasn't been tampered with
- **Distributed Security**: Redis-based nonce storage works across multiple server instances
- **Timing Attack Resistance**: HMAC validation uses timing-safe comparison methods

3. **HmacSignatureService** (`src/auth/hmac-signature.service.ts`)
   - Generates and validates HMAC-SHA256 signatures for request integrity
   - Uses timing-safe comparison to prevent timing attacks
   - Supports timestamp validation with configurable tolerance
   - Provides comprehensive signature validation with detailed error reporting

4. **DeviceTokenController** (`src/auth/device-token.controller.ts`)
   - Exposes REST endpoints for token operations
   - Handles input validation and error responses
   - Provides token generation and validation endpoints

5. **AuthGuard** (`src/auth/auth.guard.ts`) - Enhanced
   - Modified to support both Bearer and Device token schemes
   - Integrates nonce validation and HMAC signature verification for device tokens
   - Routes requests to appropriate validation logic
   - Maintains backward compatibility with existing Bearer tokens

6. **HTTP Security Headers** (`src/main.ts`)
   - Helmet middleware configured with comprehensive security headers
   - Content Security Policy (CSP) to prevent XSS attacks
   - Frame protection against clickjacking
   - HSTS for enforced HTTPS connections
   - Additional security headers for comprehensive protection

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

## Authentication Usage with Nonce Validation

### Using Device Tokens with Nonces and HMAC Signatures

To authenticate with a device token, include the token, nonce, and HMAC signature in the request headers:

```http
Authorization: Device <base64-encoded-token>
X-Device-Nonce: <base64-encoded-nonce>
X-HMAC-Signature: <base64-encoded-hmac-signature>
X-Timestamp: <unix-timestamp-milliseconds>
```

### Nonce Requirements

- **Format**: Base64-encoded random bytes (minimum 16 bytes when decoded)
- **Uniqueness**: Each nonce can only be used once
- **Generation**: Use cryptographically secure random number generation
- **Lifetime**: Nonces are stored in Redis with the same TTL as tokens (24 hours default)

### Nonce Security

- **Generation**: Uses `crypto.randomBytes(32)` for cryptographically secure randomness
- **Storage**: SHA-256 hashed for Redis keys to prevent key enumeration
- **Uniqueness**: Redis atomic operations ensure no race conditions
- **Cleanup**: Automatic TTL-based cleanup prevents Redis bloat

### HMAC Signature Security

- **Algorithm**: HMAC-SHA256 for cryptographic integrity verification
- **Secret Management**: Uses environment variable for secret key storage
- **Timing Safety**: Uses `timingSafeEqual` to prevent timing attacks
- **Message Structure**: Combines token, nonce, timestamp, and payload for comprehensive integrity
- **Timestamp Validation**: Optional timestamp validation with configurable tolerance (5 minutes default)

### Example Nonce Generation

```javascript
// Node.js example
const crypto = require('crypto');
const nonce = crypto.randomBytes(32).toString('base64');
```

```python
# Python example
import base64
import secrets
nonce = base64.b64encode(secrets.token_bytes(32)).decode('utf-8')
```

```bash
# Command line example
openssl rand -base64 32
```

### Example HMAC Signature Generation

```javascript
// Node.js example
const crypto = require('crypto');

function generateHmacSignature(token, nonce, payload, timestamp, secret) {
  const message = [token, nonce, timestamp.toString(), JSON.stringify(payload || '')].join('|');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(message, 'utf8');
  return hmac.digest('base64');
}

const token = 'your-device-token';
const nonce = 'your-generated-nonce';
const payload = { test: 'data' };
const timestamp = Date.now();
const secret = process.env.DEVICE_TOKEN_HMAC_SECRET;

const signature = generateHmacSignature(token, nonce, payload, timestamp, secret);
```

```python
# Python example
import hmac
import hashlib
import json
import time

def generate_hmac_signature(token, nonce, payload, timestamp, secret):
    message_parts = [token, nonce, str(timestamp), json.dumps(payload or '')]
    message = '|'.join(message_parts)
    signature = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    return base64.b64encode(signature).decode('utf-8')

token = 'your-device-token'
nonce = 'your-generated-nonce'
payload = {'test': 'data'}
timestamp = int(time.time() * 1000)
secret = os.environ['DEVICE_TOKEN_HMAC_SECRET']

signature = generate_hmac_signature(token, nonce, payload, timestamp, secret)
```

### Using Bearer Tokens (Existing)

Bearer tokens continue to work as before without nonce requirements:

```http
Authorization: Bearer <jwt-or-api-key>
```

### Token Type Detection

The AuthGuard automatically detects the token type based on the authorization scheme:
- `Bearer`: Routes to existing Bearer token validation (no nonce required)
- `Device`: Routes to new device token validation (nonce required)

## Environment Configuration

Add the following environment variables to your `.env` file:

```bash
# Device Token Configuration
# Master encryption key for device tokens (32 bytes, base64 encoded)
DEVICE_TOKEN_MASTER_KEY=YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=

# Device Token Nonce Configuration
# TTL for nonce storage in Redis (in seconds) - should match or exceed token TTL
# Default: 86400 (24 hours)
DEVICE_TOKEN_NONCE_TTL=86400

# Device Token HMAC Configuration
# Secret key for HMAC signature generation and validation (64 bytes recommended)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
DEVICE_TOKEN_HMAC_SECRET=aGVsbG8td29ybGQtaG1hYy1zZWNyZXQtZm9yLWRldmljZS10b2tlbi1zaWduYXR1cmUtdmFsaWRhdGlvbg==
```

### Generating a New Master Key

To generate a new 32-byte base64-encoded key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Important**: 
- Use different keys for each environment (development, staging, production)
- Keep the master key secure and never commit it to version control
- Changing the master key will invalidate all existing device tokens
- Nonce TTL should match or exceed token TTL to prevent valid tokens from being rejected
- HMAC secret should be different from the device token master key
- Use a strong, randomly generated HMAC secret (64 bytes recommended)

## Security Considerations

### Multi-Layer Security Architecture

The device token authentication system implements multiple layers of security:

1. **Token Encryption** (AES-256-GCM)
2. **Nonce Validation** (Redis-based replay prevention)
3. **HMAC Signature Verification** (Message integrity)
4. **HTTP Security Headers** (Web vulnerability protection)

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
request.nonce = nonce;
request.hmacSignature = signature;
request.tokenType = 'device';
request.category = "giga_meter";
request.has_write_access = false; // Device tokens have limited access
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

#### Missing Nonce Header
```json
{
  "statusCode": 401,
  "message": "Missing x-device-nonce header for device token authentication",
  "error": "Unauthorized"
}
```

#### Invalid Nonce Format
```json
{
  "statusCode": 401,
  "message": "Invalid nonce format",
  "error": "Unauthorized"
}
```

#### Replay Attack Detected
```json
{
  "statusCode": 401,
  "message": "Nonce validation failed: Nonce has already been used (replay attack detected)",
  "error": "Unauthorized"
}
```

#### Missing HMAC Signature
```json
{
  "statusCode": 401,
  "message": "HMAC signature validation failed: Missing X-HMAC-Signature header",
  "error": "Unauthorized"
}
```

#### Invalid HMAC Signature Format
```json
{
  "statusCode": 401,
  "message": "HMAC signature validation failed: Invalid HMAC signature format",
  "error": "Unauthorized"
}
```

#### HMAC Signature Mismatch
```json
{
  "statusCode": 401,
  "message": "HMAC signature validation failed: HMAC signature mismatch",
  "error": "Unauthorized"
}
```

#### HMAC Timestamp Too Old
```json
{
  "statusCode": 401,
  "message": "HMAC signature validation failed: HMAC signature timestamp is too old",
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
