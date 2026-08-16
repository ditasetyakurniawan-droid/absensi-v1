package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

type TapRequest struct {
	CardUID string `json:"card_uid" binding:"required"`
}

type Student struct {
	ID        int    `json:"id"`
	FullName  string `json:"full_name"`
	Classroom string `json:"classroom"`
	PhotoURL  string `json:"photo_url"`
}

func main() {
	_ = godotenv.Load()

	dbUser := mustGetEnvOrFile("DB_USER", "DB_USER_FILE")
	dbPassword := mustGetEnvOrFile("DB_PASSWORD", "DB_PASSWORD_FILE")
	dbName := mustGetEnvOrFile("DB_NAME", "DB_NAME_FILE")

	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?parseTime=true",
		dbUser,
		dbPassword,
		getEnv("DB_HOST", "192.168.100.70"),
		getEnv("DB_PORT", "3306"),
		dbName,
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Gagal inisialisasi driver DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("❌ Gagal terhubung ke MySQL DB-dt: %v", err)
	}
	log.Println("✅ Sukses terhubung ke database MySQL (DB-dt)!")

	// 🟢 Set Mode Release agar tidak menampilkan log debug internal Gin yang tidak perlu
	gin.SetMode(gin.ReleaseMode)

	// 🟢 Gunakan gin.New() alih-alih gin.Default() untuk kustomisasi Logger & Recovery
	r := gin.New()

	// 🟢 Middleware Structured JSON Logger untuk ELK / Logstash / Filebeat
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		var userAgent string
		if param.Request != nil {
			userAgent = param.Request.UserAgent()
		}

		return fmt.Sprintf(`{"time":"%s","remote_ip":"%s","method":"%s","path":"%s","status":%d,"latency":"%s","user_agent":"%s","error":"%s"}`+"\n",
			param.TimeStamp.Format(time.RFC3339),
			param.ClientIP,
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
			userAgent,
			param.ErrorMessage,
		)
	}))

	// 🟢 Recovery middleware mencegah server crash total jika terjadi panic error
	r.Use(gin.Recovery())

	// Middleware CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// 1. Health Check Endpoint
	r.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"message": "API Absensi Sholat backend aktif!",
		})
	})

	// 2. Endpoint Tap Kartu RFID
	r.POST("/api/v1/attendance/tap", func(c *gin.Context) {
		var req TapRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Payload request tidak valid"})
			return
		}

		now := time.Now()

		prayerName := getPrayerName(now)
		if prayerName == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Belum memasuki waktu presensi sholat!",
			})
			return
		}

		// Cari Santri berdasarkan card_uid
		query := `
			SELECT s.id, s.full_name, s.classroom, COALESCE(s.photo_url, '') 
			FROM students s 
			JOIN cards c ON s.id = c.student_id 
			WHERE c.card_uid = ?`

		var student Student
		err = db.QueryRow(query, req.CardUID).Scan(&student.ID, &student.FullName, &student.Classroom, &student.PhotoURL)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kartu tidak terdaftar!"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Terjadi kesalahan database"})
			return
		}

		// Cek Duplicate Tap
		var existingID int
		checkQuery := `
			SELECT id FROM attendance_logs 
			WHERE student_id = ? AND prayer_name = ? AND DATE(tapped_at) = CURRENT_DATE()`
		err = db.QueryRow(checkQuery, student.ID, prayerName).Scan(&existingID)

		if err != sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Kamu sudah melakukan presensi " + prayerName + " hari ini!",
			})
			return
		}

		// Insert Log Absensi
		tappedAtStr := now.Format("2006-01-02 15:04:05")
		insertLog := `
			INSERT INTO attendance_logs (student_id, card_uid, prayer_name, status, tapped_at) 
			VALUES (?, ?, ?, 'PRESENT', ?)`
		_, err = db.Exec(insertLog, student.ID, req.CardUID, prayerName, tappedAtStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan log absensi"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":      "success",
			"message":     "Absensi Berhasil!",
			"full_name":   student.FullName,
			"classroom":   student.Classroom,
			"photo_url":   student.PhotoURL,
			"prayer_name": prayerName,
			"tapped_at":   tappedAtStr,
		})
	})

	// 3. Endpoint Real-time Stats & Feed Hari Ini
	r.GET("/api/v1/dashboard/today", func(c *gin.Context) {
		var totalStudents int
		_ = db.QueryRow("SELECT COUNT(*) FROM students").Scan(&totalStudents)

		currentPrayer := getPrayerName(time.Now())

		var presentCount int
		if currentPrayer != "" {
			queryPresent := `
				SELECT COUNT(DISTINCT student_id) 
				FROM attendance_logs 
				WHERE prayer_name = ? AND DATE(tapped_at) = CURRENT_DATE()`
			_ = db.QueryRow(queryPresent, currentPrayer).Scan(&presentCount)
		}

		feedQuery := `
			SELECT a.id, s.full_name, s.classroom, COALESCE(s.photo_url, ''), a.prayer_name, DATE_FORMAT(a.tapped_at, '%H:%i:%s') as time_str
			FROM attendance_logs a
			JOIN students s ON a.student_id = s.id
			WHERE DATE(a.tapped_at) = CURRENT_DATE()
			ORDER BY a.tapped_at DESC LIMIT 10`

		rows, err := db.Query(feedQuery)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data feed"})
			return
		}
		defer rows.Close()

		type FeedItem struct {
			ID         int    `json:"id"`
			FullName   string `json:"full_name"`
			Classroom  string `json:"classroom"`
			PhotoURL   string `json:"photo_url"`
			PrayerName string `json:"prayer_name"`
			TimeStr    string `json:"time_str"`
		}

		feeds := []FeedItem{}
		for rows.Next() {
			var f FeedItem
			if err := rows.Scan(&f.ID, &f.FullName, &f.Classroom, &f.PhotoURL, &f.PrayerName, &f.TimeStr); err == nil {
				feeds = append(feeds, f)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"total_students": totalStudents,
			"current_prayer": currentPrayer,
			"present_count":  presentCount,
			"recent_taps":    feeds,
		})
	})

	// 4. Endpoint Laporan Rekap Absensi (Filter Date & Prayer)
	r.GET("/api/v1/reports/attendance", func(c *gin.Context) {
		dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
		prayer := c.Query("prayer")

		baseQuery := `
			SELECT a.id, s.full_name, s.classroom, a.prayer_name, a.status, DATE_FORMAT(a.tapped_at, '%Y-%m-%d %H:%i:%s')
			FROM attendance_logs a
			JOIN students s ON a.student_id = s.id
			WHERE DATE(a.tapped_at) = ?`

		args := []interface{}{dateStr}
		if prayer != "" {
			baseQuery += " AND a.prayer_name = ?"
			args = append(args, prayer)
		}
		baseQuery += " ORDER BY a.tapped_at DESC"

		rows, err := db.Query(baseQuery, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil rekap absensi"})
			return
		}
		defer rows.Close()

		type ReportItem struct {
			ID         int    `json:"id"`
			FullName   string `json:"full_name"`
			Classroom  string `json:"classroom"`
			PrayerName string `json:"prayer_name"`
			Status     string `json:"status"`
			TappedAt   string `json:"tapped_at"`
		}

		reports := []ReportItem{}
		for rows.Next() {
			var r ReportItem
			if err := rows.Scan(&r.ID, &r.FullName, &r.Classroom, &r.PrayerName, &r.Status, &r.TappedAt); err == nil {
				reports = append(reports, r)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"date":    dateStr,
			"total":   len(reports),
			"records": reports,
		})
	})

	// 5. Endpoint Rekap Bulanan & Nilai Kedisiplinan Santri
	r.GET("/api/v1/reports/monthly", func(c *gin.Context) {
		// Ambil parameter month & year dari query string (default: bulan & tahun saat ini)
		now := time.Now()
		monthStr := c.DefaultQuery("month", fmt.Sprintf("%02d", int(now.Month())))
		yearStr := c.DefaultQuery("year", fmt.Sprintf("%d", now.Year()))

		// Asumsi total sholat wajib dalam 1 bulan (5 sholat x 30 hari = 150 sesi)
		const totalSesiBulanan = 150

		query := `
			SELECT 
				s.id,
				s.full_name,
				s.classroom,
				COUNT(a.id) as total_hadir
			FROM students s
			LEFT JOIN attendance_logs a ON s.id = a.student_id 
				AND DATE_FORMAT(a.tapped_at, '%m') = ? 
				AND DATE_FORMAT(a.tapped_at, '%Y') = ?
			GROUP BY s.id, s.full_name, s.classroom
			ORDER BY s.classroom ASC, s.full_name ASC`

		rows, err := db.Query(query, monthStr, yearStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data rekap bulanan"})
			return
		}
		defer rows.Close()

		type MonthlyReport struct {
			StudentID  int     `json:"student_id"`
			FullName   string  `json:"full_name"`
			Classroom  string  `json:"classroom"`
			TotalHadir int     `json:"total_hadir"`
			Persentase float64 `json:"persentase"`
			Grade      string  `json:"grade"`
		}

		reports := []MonthlyReport{}
		for rows.Next() {
			var r MonthlyReport
			if err := rows.Scan(&r.StudentID, &r.FullName, &r.Classroom, &r.TotalHadir); err == nil {
				// Hitung persentase kehadiran
				r.Persentase = (float64(r.TotalHadir) / float64(totalSesiBulanan)) * 100
				if r.Persentase > 100 {
					r.Persentase = 100
				}

				// Penentuan Grade Kedisiplinan
				switch {
				case r.Persentase >= 90:
					r.Grade = "A (Sangat Disiplin)"
				case r.Persentase >= 75:
					r.Grade = "B (Disiplin)"
				case r.Persentase >= 60:
					r.Grade = "C (Cukup)"
				default:
					r.Grade = "D (Perlu Pembinaan)"
				}

				reports = append(reports, r)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"month":   monthStr,
			"year":    yearStr,
			"total":   len(reports),
			"records": reports,
		})
	})

	// 🟢 Pindahkan SERVER START ke Paling Bawah Fungsi main()
	port := getEnv("SERVER_PORT", "8080")
	log.Printf("🚀 Server Backend berjalan di port :%s", port)
	_ = r.Run(":" + port)
}

// 🟢 Helper Function Waktu Sholat Presisi
func getPrayerName(now time.Time) string {
	totalMinutes := now.Hour()*60 + now.Minute()

	switch {
	case totalMinutes >= 4*60 && totalMinutes <= (5*60+30):
		return "Subuh"
	case totalMinutes >= (11*60+30) && totalMinutes <= 13*60:
		return "Dzuhur"
	case totalMinutes >= 15*60 && totalMinutes <= 16*60:
		return "Asar"
	case totalMinutes >= (17*60+30) && totalMinutes <= (18*60+30):
		return "Magrib"
	case totalMinutes >= 19*60 && totalMinutes <= 21*60:
		return "Isya"
	default:
		return ""
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func mustGetEnvOrFile(envKey, fileKey string) string {
	if filePath := os.Getenv(fileKey); filePath != "" {
		content, err := os.ReadFile(filePath)
		if err != nil {
			log.Fatalf("Gagal membaca secret %s: %v", fileKey, err)
		}

		value := strings.TrimSpace(string(content))

		if value == "" {
			log.Fatalf("Secret file untuk %s kosong", envKey)
		}

		return value
	}

	if value := os.Getenv(envKey); value != "" {
		return value
	}

	log.Fatalf(
		"Credential %s tidak tersedia. Set %s atau %s",
		envKey,
		envKey,
		fileKey,
	)

	return ""
}
