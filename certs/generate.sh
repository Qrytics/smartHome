#!/bin/bash
# Smart Home IoT - Certificate Generation Script
# Generates self-signed certificates for MQTT TLS/SSL communication

set -e

CERT_DIR="$(cd "$(dirname "$0")" && pwd)"
DAYS_VALID=365
CA_DAYS_VALID=3650

echo "=== Smart Home Certificate Generation ==="
echo "Certificate directory: $CERT_DIR"
echo ""

# Certificate details
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORG="SmartHome"
CN_CA="SmartHome-CA"
CN_SERVER="mqtt.smarthome.local"

# Check if certificates already exist
if [ -f "$CERT_DIR/ca.crt" ] && [ -f "$CERT_DIR/server.crt" ]; then
    read -p "Certificates already exist. Regenerate? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    echo "Removing old certificates..."
    rm -f "$CERT_DIR"/*.{key,crt,csr,srl}
fi

cd "$CERT_DIR"

echo ""
echo "Step 1: Generating CA private key..."
openssl genrsa -out ca.key 4096

echo "Step 2: Generating CA certificate..."
openssl req -new -x509 -days $CA_DAYS_VALID -key ca.key -out ca.crt \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=$CN_CA"

echo "Step 3: Generating server private key..."
openssl genrsa -out server.key 4096

echo "Step 4: Generating server certificate signing request..."
openssl req -new -key server.key -out server.csr \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=$CN_SERVER"

echo "Step 5: Signing server certificate with CA..."
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days $DAYS_VALID \
    -extfile <(printf "subjectAltName=DNS:$CN_SERVER,DNS:localhost,IP:127.0.0.1")

echo "Step 6: Generating client certificates (optional)..."
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/CN=SmartHome-Client"
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out client.crt -days $DAYS_VALID

echo "Step 7: Setting secure permissions..."
chmod 600 *.key
chmod 644 *.crt

echo "Step 8: Cleaning up temporary files..."
rm -f *.csr *.srl

echo ""
echo "=== Certificate generation complete! ==="
echo ""
echo "Generated files:"
echo "  - ca.crt (CA certificate) - Distribute to all clients"
echo "  - ca.key (CA private key) - KEEP SECURE!"
echo "  - server.crt (Server certificate)"
echo "  - server.key (Server private key) - KEEP SECURE!"
echo "  - client.crt (Client certificate)"
echo "  - client.key (Client private key) - KEEP SECURE!"
echo ""
echo "Verification:"
openssl verify -CAfile ca.crt server.crt
openssl verify -CAfile ca.crt client.crt
echo ""
echo "Certificate details:"
openssl x509 -in server.crt -noout -subject -dates
echo ""
echo "⚠️  IMPORTANT: Never commit *.key files to version control!"
echo ""
