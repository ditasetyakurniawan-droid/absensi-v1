package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type studentWriteRequest struct {
	NIS       string `json:"nis" binding:"required"`
	FullName  string `json:"full_name" binding:"required"`
	Classroom string `json:"classroom"`
	PhotoURL  string `json:"photo_url"`
}

type cardWriteRequest struct {
	CardUID string `json:"card_uid" binding:"required"`
}

type cardSummary struct {
	ID      int64  `json:"id"`
	CardUID string `json:"card_uid"`
	Status  string `json:"status"`
}

type adminStudent struct {
	ID          int64        `json:"id"`
	NIS         string       `json:"nis"`
	FullName    string       `json:"full_name"`
	Classroom   string       `json:"classroom"`
	PhotoURL    string       `json:"photo_url"`
	IsActive    bool         `json:"is_active"`
	CurrentCard *cardSummary `json:"current_card"`
}

func registerAdminRoutes(r *gin.Engine, db *sql.DB) {
	admin := r.Group("/api/v1/admin")
	admin.Use(requireAdmin(db))

	admin.GET("/students", func(c *gin.Context) {
		search := strings.TrimSpace(c.Query("search"))
		classroom := strings.TrimSpace(c.Query("classroom"))
		includeInactive := c.Query("include_inactive") == "true"

		query := `
			SELECT s.id, s.nis, s.full_name, COALESCE(s.classroom, ''), COALESCE(s.photo_url, ''), s.is_active,
			       c.id, c.card_uid, c.status
			FROM students s
			LEFT JOIN cards c ON c.student_id = s.id AND c.status = 'ACTIVE'
			WHERE 1 = 1`

		args := make([]any, 0)
		if !includeInactive {
			query += " AND s.is_active = 1"
		}
		if search != "" {
			query += " AND (s.nis LIKE ? OR s.full_name LIKE ?)"
			term := "%" + search + "%"
			args = append(args, term, term)
		}
		if classroom != "" {
			query += " AND s.classroom = ?"
			args = append(args, classroom)
		}
		query += " ORDER BY s.classroom ASC, s.full_name ASC"

		rows, err := db.Query(query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data santri"})
			return
		}
		defer rows.Close()

		students := make([]adminStudent, 0)
		for rows.Next() {
			var item adminStudent
			var cardID sql.NullInt64
			var cardUID sql.NullString
			var cardStatus sql.NullString

			if err := rows.Scan(
				&item.ID,
				&item.NIS,
				&item.FullName,
				&item.Classroom,
				&item.PhotoURL,
				&item.IsActive,
				&cardID,
				&cardUID,
				&cardStatus,
			); err != nil {
				continue
			}

			if cardID.Valid {
				item.CurrentCard = &cardSummary{
					ID:      cardID.Int64,
					CardUID: cardUID.String,
					Status:  cardStatus.String,
				}
			}

			students = append(students, item)
		}

		c.JSON(http.StatusOK, gin.H{
			"total":   len(students),
			"records": students,
		})
	})

	admin.POST("/students", func(c *gin.Context) {
		var req studentWriteRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIS dan nama santri wajib diisi"})
			return
		}

		req.NIS = strings.TrimSpace(req.NIS)
		req.FullName = strings.TrimSpace(req.FullName)
		req.Classroom = strings.TrimSpace(req.Classroom)
		req.PhotoURL = strings.TrimSpace(req.PhotoURL)

		if req.NIS == "" || req.FullName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIS dan nama santri wajib diisi"})
			return
		}

		var existingID int64
		err := db.QueryRow(`SELECT id FROM students WHERE nis = ? LIMIT 1`, req.NIS).Scan(&existingID)
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "NIS sudah terdaftar"})
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memvalidasi NIS"})
			return
		}

		result, err := db.Exec(`
			INSERT INTO students (nis, full_name, classroom, photo_url, is_active)
			VALUES (?, ?, ?, ?, 1)`, req.NIS, req.FullName, req.Classroom, nullableString(req.PhotoURL),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menambahkan santri"})
			return
		}

		id, _ := result.LastInsertId()
		c.JSON(http.StatusCreated, gin.H{
			"status":     "success",
			"student_id": id,
			"message":    "Santri berhasil ditambahkan",
		})
	})

	admin.PUT("/students/:id", func(c *gin.Context) {
		studentID, ok := parseIDParam(c, "id")
		if !ok {
			return
		}

		var req studentWriteRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data santri tidak valid"})
			return
		}

		req.NIS = strings.TrimSpace(req.NIS)
		req.FullName = strings.TrimSpace(req.FullName)
		req.Classroom = strings.TrimSpace(req.Classroom)
		req.PhotoURL = strings.TrimSpace(req.PhotoURL)

		if req.NIS == "" || req.FullName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIS dan nama santri wajib diisi"})
			return
		}

		var conflictingID int64
		err := db.QueryRow(`SELECT id FROM students WHERE nis = ? AND id <> ? LIMIT 1`, req.NIS, studentID).Scan(&conflictingID)
		if err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "NIS digunakan santri lain"})
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memvalidasi NIS"})
			return
		}

		result, err := db.Exec(`
			UPDATE students
			SET nis = ?, full_name = ?, classroom = ?, photo_url = ?
			WHERE id = ?`, req.NIS, req.FullName, req.Classroom, nullableString(req.PhotoURL), studentID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui santri"})
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Santri tidak ditemukan"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Data santri diperbarui"})
	})

	admin.DELETE("/students/:id", func(c *gin.Context) {
		studentID, ok := parseIDParam(c, "id")
		if !ok {
			return
		}

		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
			return
		}
		defer tx.Rollback()

		result, err := tx.Exec(`UPDATE students SET is_active = 0 WHERE id = ? AND is_active = 1`, studentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menonaktifkan santri"})
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Santri aktif tidak ditemukan"})
			return
		}

		if _, err := tx.Exec(`
			UPDATE cards
			SET status = 'BLOCKED', blocked_at = NOW()
			WHERE student_id = ? AND status = 'ACTIVE'`, studentID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memblokir kartu santri"})
			return
		}

		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan perubahan"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Santri dinonaktifkan"})
	})

	admin.PATCH("/students/:id/activate", func(c *gin.Context) {
		studentID, ok := parseIDParam(c, "id")
		if !ok {
			return
		}

		result, err := db.Exec(`UPDATE students SET is_active = 1 WHERE id = ?`, studentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengaktifkan santri"})
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Santri tidak ditemukan"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Santri diaktifkan kembali"})
	})

	admin.GET("/students/:id/cards", func(c *gin.Context) {
		studentID, ok := parseIDParam(c, "id")
		if !ok {
			return
		}

		rows, err := db.Query(`
			SELECT id, card_uid, status
			FROM cards
			WHERE student_id = ?
			ORDER BY created_at DESC, id DESC`, studentID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat kartu"})
			return
		}
		defer rows.Close()

		cards := make([]cardSummary, 0)
		for rows.Next() {
			var card cardSummary
			if err := rows.Scan(&card.ID, &card.CardUID, &card.Status); err == nil {
				cards = append(cards, card)
			}
		}

		c.JSON(http.StatusOK, gin.H{"records": cards})
	})

	admin.GET("/cards/lookup/:uid", func(c *gin.Context) {
		uid := strings.TrimSpace(c.Param("uid"))
		if uid == "" || len(uid) > 50 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "UID tidak valid"})
			return
		}

		var card cardSummary
		var studentID int64
		var studentName string
		err := db.QueryRow(`
			SELECT c.id, c.card_uid, c.status, s.id, s.full_name
			FROM cards c
			JOIN students s ON s.id = c.student_id
			WHERE c.card_uid = ?
			LIMIT 1`, uid,
		).Scan(&card.ID, &card.CardUID, &card.Status, &studentID, &studentName)

		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"registered": false,
				"card_uid":   uid,
			})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memeriksa kartu"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"registered":   true,
			"card":         card,
			"student_id":   studentID,
			"student_name": studentName,
		})
	})

	admin.POST("/students/:id/cards", func(c *gin.Context) {
		studentID, ok := parseIDParam(c, "id")
		if !ok {
			return
		}

		var req cardWriteRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "UID kartu wajib diisi"})
			return
		}

		uid := strings.TrimSpace(req.CardUID)
		if uid == "" || len(uid) > 50 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "UID kartu tidak valid"})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
			return
		}
		defer tx.Rollback()

		var active bool
		if err := tx.QueryRow(`SELECT is_active FROM students WHERE id = ? FOR UPDATE`, studentID).Scan(&active); errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Santri tidak ditemukan"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memeriksa santri"})
			return
		}
		if !active {
			c.JSON(http.StatusConflict, gin.H{"error": "Santri sedang nonaktif"})
			return
		}

		var existingCardID int64
		var existingStudentID int64
		var existingStatus string
		err = tx.QueryRow(`
			SELECT id, student_id, status
			FROM cards
			WHERE card_uid = ?
			LIMIT 1
			FOR UPDATE`, uid,
		).Scan(&existingCardID, &existingStudentID, &existingStatus)

		if err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"error":       "UID kartu sudah pernah terdaftar",
				"student_id":  existingStudentID,
				"card_status": existingStatus,
			})
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memvalidasi UID kartu"})
			return
		}

		// Satu santri hanya boleh punya satu kartu ACTIVE. Kartu lama tetap disimpan sebagai history.
		if _, err := tx.Exec(`
			UPDATE cards
			SET status = 'REPLACED'
			WHERE student_id = ? AND status = 'ACTIVE'`, studentID,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menonaktifkan kartu lama"})
			return
		}

		result, err := tx.Exec(`
			INSERT INTO cards (card_uid, student_id, status)
			VALUES (?, ?, 'ACTIVE')`, uid, studentID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftarkan kartu"})
			return
		}

		cardID, _ := result.LastInsertId()
		if err := tx.Commit(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pendaftaran kartu"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"status":     "success",
			"message":    "Kartu RFID berhasil didaftarkan",
			"card_id":    cardID,
			"card_uid":   uid,
			"student_id": studentID,
		})
	})

	admin.PATCH("/cards/:id/block", func(c *gin.Context) {
		cardID, ok := parseIDParam(c, "id")
		if !ok {
			return
		}

		result, err := db.Exec(`
			UPDATE cards
			SET status = 'BLOCKED', blocked_at = NOW()
			WHERE id = ? AND status = 'ACTIVE'`, cardID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memblokir kartu"})
			return
		}

		affected, _ := result.RowsAffected()
		if affected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Kartu aktif tidak ditemukan"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "success", "message": "Kartu berhasil diblokir"})
	})
}

func parseIDParam(c *gin.Context, name string) (int64, bool) {
	value, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil || value <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return 0, false
	}
	return value, true
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
