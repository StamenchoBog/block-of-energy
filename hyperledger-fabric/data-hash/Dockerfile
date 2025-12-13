# Multi-architecture Dockerfile for Hyperledger Fabric Chaincode
# Supports both ARM64 (Apple Silicon) and x86_64 (Intel/AMD) architectures
# This solves the architecture mismatch issue when deploying from MacBook Pro M1 to Kind cluster

# Use buildx with platform detection
FROM --platform=$TARGETPLATFORM golang:1.23-alpine AS builder

# Set working directory
WORKDIR /chaincode

# Install build dependencies for all platforms
RUN apk add --no-cache git ca-certificates tzdata

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Tidy dependencies and build chaincode for the target platform
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o chaincode .

# Final stage - use minimal base image for the target platform
FROM --platform=$TARGETPLATFORM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user for security
RUN addgroup -g 1001 -S fabric && \
    adduser -u 1001 -S fabric -G fabric

WORKDIR /chaincode

# Copy the binary from builder stage
COPY --from=builder /chaincode/chaincode .

# Change ownership to fabric user
RUN chown -R fabric:fabric /chaincode

# Switch to non-root user
USER fabric

# Set required environment variables for Hyperledger Fabric CCaaS
ENV CORE_PEER_TLS_ENABLED=false
ENV CORE_CHAINCODE_LOGGING_LEVEL=info
ENV CORE_CHAINCODE_LOGGING_SHIM=warning

# Note: CORE_CHAINCODE_ID_NAME will be set dynamically during deployment via kubectl patch

# Expose the chaincode port
EXPOSE 9999

# Set the entrypoint for the chaincode
ENTRYPOINT ["./chaincode"]