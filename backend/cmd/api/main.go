package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	db, err := openDatabase()
	if err != nil {
		log.Fatalf("❌ Gagal terhubung ke MySQL: %v", err)
	}
	defer db.Close()

	log.Println("✅ Sukses terhubung ke database MySQL")

	if err := bootstrapAdmin(db); err != nil {
		log.Fatalf("❌ Gagal bootstrap admin: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(jsonLogger())
	r.Use(gin.Recovery())
	r.Use(corsMiddleware())

	r.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "API Absensi Sholat backend aktif!",
		})
	})

	registerAuthRoutes(r, db)
	registerAttendanceRoutes(r, db)
	registerDashboardRoutes(r, db)
	registerAdminRoutes(r, db)

	port := getEnv("SERVER_PORT", "8080")
	log.Printf("🚀 Server Backend berjalan di port :%s", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("❌ Backend berhenti: %v", err)
	}
}
