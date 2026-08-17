package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	_ "github.com/go-sql-driver/mysql"
)

func openDatabase() (*sql.DB, error) {
	dbUser := mustGetEnvOrFile("DB_USER", "DB_USER_FILE")
	dbPassword := mustGetEnvOrFile("DB_PASSWORD", "DB_PASSWORD_FILE")
	dbName := mustGetEnvOrFile("DB_NAME", "DB_NAME_FILE")

	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&loc=Local",
		dbUser,
		dbPassword,
		getEnv("DB_HOST", "127.0.0.1"),
		getEnv("DB_PORT", "3306"),
		dbName,
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	// Small homelab-friendly connection pool. Adjust later if traffic grows.
	db.SetMaxOpenConns(15)
	db.SetMaxIdleConns(5)

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value, exists := os.LookupEnv(key)
	if !exists || strings.TrimSpace(value) == "" {
		return fallback
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		log.Printf("⚠️ Nilai %s=%q bukan boolean valid; memakai default %t", key, value, fallback)
		return fallback
	}

	return parsed
}

func optionalGetEnvOrFile(envKey, fileKey string) string {
	if filePath := strings.TrimSpace(os.Getenv(fileKey)); filePath != "" {
		content, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("⚠️ Gagal membaca %s dari %s: %v", envKey, filePath, err)
			return ""
		}
		return strings.TrimSpace(string(content))
	}

	return strings.TrimSpace(os.Getenv(envKey))
}

func mustGetEnvOrFile(envKey, fileKey string) string {
	value := optionalGetEnvOrFile(envKey, fileKey)
	if value == "" {
		log.Fatalf("Credential %s tidak tersedia. Set %s atau %s", envKey, envKey, fileKey)
	}
	return value
}
