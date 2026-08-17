package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type tapRequest struct {
	CardUID string `json:"card_uid" binding:"required"`
}

type studentIdentity struct {
	ID        int64  `json:"id"`
	FullName  string `json:"full_name"`
	Classroom string `json:"classroom"`
	PhotoURL  string `json:"photo_url"`
}

func registerAttendanceRoutes(r *gin.Engine, db *sql.DB) {
	r.POST("/api/v1/attendance/tap", func(c *gin.Context) {
		var req tapRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Payload request tidak valid"})
			return
		}

		uid := strings.TrimSpace(req.CardUID)
		if uid == "" || len(uid) > 50 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "UID kartu tidak valid"})
			return
		}

		now := time.Now()
		prayerName := getPrayerName(now)
		if prayerName == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Belum memasuki waktu presensi sholat!",
				"code":  "OUTSIDE_ATTENDANCE_WINDOW",
			})
			return
		}

		var student studentIdentity
		err := db.QueryRow(`
			SELECT s.id, s.full_name, COALESCE(s.classroom, ''), COALESCE(s.photo_url, '')
			FROM students s
			JOIN cards c ON s.id = c.student_id
			WHERE c.card_uid = ?
			  AND c.status = 'ACTIVE'
			  AND s.is_active = 1
			LIMIT 1`, uid,
		).Scan(&student.ID, &student.FullName, &student.Classroom, &student.PhotoURL)

		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":    "Kartu tidak terdaftar atau tidak aktif!",
				"code":     "CARD_NOT_REGISTERED",
				"card_uid": uid,
			})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Terjadi kesalahan database"})
			return
		}

		var existingID int64
		err = db.QueryRow(`
			SELECT id
			FROM attendance_logs
			WHERE student_id = ?
			  AND prayer_name = ?
			  AND DATE(tapped_at) = CURRENT_DATE()
			LIMIT 1`, student.ID, prayerName,
		).Scan(&existingID)

		switch {
		case err == nil:
			c.JSON(http.StatusConflict, gin.H{
				"error": "Kamu sudah melakukan presensi " + prayerName + " hari ini!",
				"code":  "DUPLICATE_ATTENDANCE",
			})
			return
		case errors.Is(err, sql.ErrNoRows):
			// Belum ada presensi pada sesi ini; lanjut insert.
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memeriksa presensi sebelumnya"})
			return
		}

		tappedAt := now.Format("2006-01-02 15:04:05")
		_, err = db.Exec(`
			INSERT INTO attendance_logs (student_id, card_uid, prayer_name, status, tapped_at)
			VALUES (?, ?, ?, 'PRESENT', ?)`, student.ID, uid, prayerName, tappedAt,
		)
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
			"tapped_at":   tappedAt,
		})
	})
}

func getPrayerName(now time.Time) string {
	totalMinutes := now.Hour()*60 + now.Minute()

	switch {
	case totalMinutes >= 4*60 && totalMinutes <= 5*60+30:
		return "Subuh"
	case totalMinutes >= 11*60+30 && totalMinutes <= 13*60:
		return "Dzuhur"
	case totalMinutes >= 15*60 && totalMinutes <= 16*60:
		return "Asar"
	case totalMinutes >= 17*60+30 && totalMinutes <= 18*60+30:
		return "Magrib"
	case totalMinutes >= 19*60 && totalMinutes <= 21*60:
		return "Isya"
	default:
		return ""
	}
}
