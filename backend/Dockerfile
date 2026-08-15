# Stage 1: Build Stage (Golang 1.22 Alpine)
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary Go tanpa CGO agar sangat ringan dan portabel
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/api/main.go

# Stage 2: Final Minimalist Production Image
FROM alpine:latest

# Install ca-certificates untuk koneksi HTTPS keluar jika diperlukan
RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta

WORKDIR /app

# Copy binary yang sudah di-compile dari stage builder
COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]