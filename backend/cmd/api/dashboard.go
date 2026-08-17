package main

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type feedItem struct {
	ID         int64  `json:"id"`
	FullName   string `json:"full_name"`
	Classroom  string `json:"classroom"`
	PhotoURL   string `json:"photo_url"`
	PrayerName string `json:"prayer_name"`
	TimeStr    string `json:"time_str"`
}

type reportItem struct {
	ID         int64  `json:"id"`
	FullName   string `json:"full_name"`
	Classroom  string `json:"classroom"`
	PrayerName string `json:"prayer_name"`
	Status     string `json:"status"`
	TappedAt   string `json:"tapped_at"`
}

type monthlyReport struct {
	StudentID  int64   `json:"student_id"`
	FullName   string  `json:"full_name"`
	Classroom  string  `json:"classroom"`
	TotalHadir int     `json:"total_hadir"`
	Persentase float64 `json:"persentase"`
	Grade      string  `json:"grade"`
}

func registerDashboardRoutes(r *gin.Engine, db *sql.DB) {
	r.GET("/api/v1/dashboard/today", func(c *gin.Context) {
		var totalStudents int
		_ = db.QueryRow(`SELECT COUNT(*) FROM students WHERE is_active = 1`).Scan(&totalStudents)

		currentPrayer := getPrayerName(time.Now())
		presentCount := 0
		if currentPrayer != "" {
			_ = db.QueryRow(`
				SELECT COUNT(DISTINCT a.student_id)
				FROM attendance_logs a
				JOIN students s ON s.id = a.student_id
				WHERE a.prayer_name = ?
				  AND DATE(a.tapped_at) = CURRENT_DATE()
				  AND s.is_active = 1`, currentPrayer,
			).Scan(&presentCount)
		}

		rows, err := db.Query(`
			SELECT a.id, s.full_name, COALESCE(s.classroom, ''), COALESCE(s.photo_url, ''),
			       a.prayer_name, DATE_FORMAT(a.tapped_at, '%H:%i:%s')
			FROM attendance_logs a
			JOIN students s ON a.student_id = s.id
			WHERE DATE(a.tapped_at) = CURRENT_DATE()
			ORDER BY a.tapped_at DESC
			LIMIT 10`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data feed"})
			return
		}
		defer rows.Close()

		feeds := make([]feedItem, 0)
		for rows.Next() {
			var item feedItem
			if err := rows.Scan(&item.ID, &item.FullName, &item.Classroom, &item.PhotoURL, &item.PrayerName, &item.TimeStr); err != nil {
				continue
			}
			feeds = append(feeds, item)
		}

		c.JSON(http.StatusOK, gin.H{
			"total_students": totalStudents,
			"current_prayer": currentPrayer,
			"present_count":  presentCount,
			"recent_taps":    feeds,
		})
	})

	r.GET("/api/v1/reports/attendance", func(c *gin.Context) {
		dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
		prayer := c.Query("prayer")

		query := `
			SELECT a.id, s.full_name, COALESCE(s.classroom, ''), a.prayer_name, a.status,
			       DATE_FORMAT(a.tapped_at, '%Y-%m-%d %H:%i:%s')
			FROM attendance_logs a
			JOIN students s ON a.student_id = s.id
			WHERE DATE(a.tapped_at) = ?`

		args := []any{dateStr}
		if prayer != "" {
			query += " AND a.prayer_name = ?"
			args = append(args, prayer)
		}
		query += " ORDER BY a.tapped_at DESC"

		rows, err := db.Query(query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil rekap absensi"})
			return
		}
		defer rows.Close()

		reports := make([]reportItem, 0)
		for rows.Next() {
			var item reportItem
			if err := rows.Scan(&item.ID, &item.FullName, &item.Classroom, &item.PrayerName, &item.Status, &item.TappedAt); err != nil {
				continue
			}
			reports = append(reports, item)
		}

		c.JSON(http.StatusOK, gin.H{
			"date":    dateStr,
			"total":   len(reports),
			"records": reports,
		})
	})

	r.GET("/api/v1/reports/monthly", func(c *gin.Context) {
		now := time.Now()
		monthStr := c.DefaultQuery("month", fmt.Sprintf("%02d", int(now.Month())))
		yearStr := c.DefaultQuery("year", fmt.Sprintf("%d", now.Year()))

		// Untuk v1.1 tetap mempertahankan asumsi 150 sesi/bulan agar tidak mengubah
		// perilaku laporan lama. Nanti kita pindahkan ke tabel jadwal/sesi aktual.
		const totalSesiBulanan = 150

		rows, err := db.Query(`
			SELECT s.id, s.full_name, COALESCE(s.classroom, ''), COUNT(a.id)
			FROM students s
			LEFT JOIN attendance_logs a ON s.id = a.student_id
			  AND DATE_FORMAT(a.tapped_at, '%m') = ?
			  AND DATE_FORMAT(a.tapped_at, '%Y') = ?
			WHERE s.is_active = 1
			GROUP BY s.id, s.full_name, s.classroom
			ORDER BY s.classroom ASC, s.full_name ASC`, monthStr, yearStr,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data rekap bulanan"})
			return
		}
		defer rows.Close()

		reports := make([]monthlyReport, 0)
		for rows.Next() {
			var item monthlyReport
			if err := rows.Scan(&item.StudentID, &item.FullName, &item.Classroom, &item.TotalHadir); err != nil {
				continue
			}

			item.Persentase = float64(item.TotalHadir) / float64(totalSesiBulanan) * 100
			if item.Persentase > 100 {
				item.Persentase = 100
			}

			switch {
			case item.Persentase >= 90:
				item.Grade = "A (Sangat Disiplin)"
			case item.Persentase >= 75:
				item.Grade = "B (Disiplin)"
			case item.Persentase >= 60:
				item.Grade = "C (Cukup)"
			default:
				item.Grade = "D (Perlu Pembinaan)"
			}

			reports = append(reports, item)
		}

		c.JSON(http.StatusOK, gin.H{
			"month":   monthStr,
			"year":    yearStr,
			"total":   len(reports),
			"records": reports,
		})
	})
}
