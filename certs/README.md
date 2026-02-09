# Certificates Directory

This directory contains SSL/TLS certificates for secure MQTT communication.

## Certificate Files

- `ca.crt` - Certificate Authority (CA) certificate
- `ca.key` - CA private key (keep secure!)
- `server.crt` - Server certificate
- `server.key` - Server private key (keep secure!)
- `client.crt` - Client certificate (optional)
- `client.key` - Client private key (optional)

## Generating Certificates

Use the provided script to generate all required certificates:

```bash
./generate.sh
```

This will create:
1. A self-signed CA certificate
2. Server certificate signed by the CA
3. Client certificates (optional)

## Security Best Practices

⚠️ **IMPORTANT**: 
- Never commit private keys (`.key` files) to version control
- Keep the CA private key secure and backed up
- Use strong passwords for key encryption in production
- Rotate certificates periodically (recommended: annually)
- Use proper file permissions: `chmod 600 *.key`

## Manual Generation

If you need to generate certificates manually:

### 1. Generate CA Key and Certificate

```bash
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=SmartHome/CN=SmartHome-CA"
```

### 2. Generate Server Key and CSR

```bash
openssl genrsa -out server.key 4096
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=State/L=City/O=SmartHome/CN=mqtt.smarthome.local"
```

### 3. Sign Server Certificate

```bash
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365
```

## ESP32 Configuration

To use these certificates with ESP32:
1. Copy `ca.crt` content to `firmware/src/certs/ca_cert.h`
2. Configure MQTT client to use TLS with the CA certificate
3. Enable certificate validation in the firmware

## Verification

Test certificate chain:

```bash
openssl verify -CAfile ca.crt server.crt
```

Check certificate details:

```bash
openssl x509 -in server.crt -text -noout
```

## Production Use

For production:
- Use certificates from a trusted CA (e.g., Let's Encrypt)
- Implement certificate pinning on devices
- Set up certificate monitoring and renewal automation
