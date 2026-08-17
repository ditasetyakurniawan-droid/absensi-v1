package main

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const adminSessionCookie = "absensi_admin_session"

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type adminIdentity struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

func registerAuthRoutes(r *gin.Engine, db *sql.DB) {
	auth := r.Group("/api/v1/auth")

	auth.POST("/login", func(c *gin.Context) {
		var req loginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username dan password wajib diisi"})
			return
		}

		username := strings.TrimSpace(req.Username)
		if username == "" || req.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username dan password wajib diisi"})
			return
		}

		var admin adminIdentity
		var passwordHash string
		var isActive bool

		err := db.QueryRow(`
			SELECT id, username, full_name, role, password_hash, is_active
			FROM admins
			WHERE username = ?
			LIMIT 1`, username,
		).Scan(
			&admin.ID,
			&admin.Username,
			&admin.FullName,
			&admin.Role,
			&passwordHash,
			&isActive,
		)

		if errors.Is(err, sql.ErrNoRows) || !isActive {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses login"})
			return
		}

		if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Username atau password salah"})
			return
		}

		rawToken, err := generateSessionToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi admin"})
			return
		}

		expiresAt := time.Now().Add(12 * time.Hour)
		tokenHash := hashSessionToken(rawToken)

		// Bersihkan session lama milik admin ini dan session global yang sudah expired.
		_, _ = db.Exec(`DELETE FROM admin_sessions WHERE expires_at <= NOW()`)
		_, _ = db.Exec(`DELETE FROM admin_sessions WHERE admin_id = ?`, admin.ID)

		if _, err := db.Exec(`
			INSERT INTO admin_sessions (admin_id, token_hash, expires_at)
			VALUES (?, ?, ?)`, admin.ID, tokenHash, expiresAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan sesi admin"})
			return
		}

		setAdminSessionCookie(c, rawToken, expiresAt)

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"admin":  admin,
		})
	})

	auth.POST("/logout", func(c *gin.Context) {
		if rawToken, err := c.Cookie(adminSessionCookie); err == nil && rawToken != "" {
			_, _ = db.Exec(`DELETE FROM admin_sessions WHERE token_hash = ?`, hashSessionToken(rawToken))
		}

		clearAdminSessionCookie(c)
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	})

	auth.GET("/me", requireAdmin(db), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"admin": adminIdentity{
				ID:       c.GetInt64("admin_id"),
				Username: c.GetString("admin_username"),
				FullName: c.GetString("admin_full_name"),
				Role:     c.GetString("admin_role"),
			},
		})
	})
}

func requireAdmin(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawToken, err := c.Cookie(adminSessionCookie)
		if err != nil || strings.TrimSpace(rawToken) == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sesi admin diperlukan"})
			return
		}

		var admin adminIdentity
		err = db.QueryRow(`
			SELECT a.id, a.username, a.full_name, a.role
			FROM admin_sessions s
			JOIN admins a ON a.id = s.admin_id
			WHERE s.token_hash = ?
			  AND s.expires_at > NOW()
			  AND a.is_active = 1
			LIMIT 1`, hashSessionToken(rawToken),
		).Scan(&admin.ID, &admin.Username, &admin.FullName, &admin.Role)

		if errors.Is(err, sql.ErrNoRows) {
			clearAdminSessionCookie(c)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Sesi admin sudah berakhir"})
			return
		}
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Gagal memvalidasi sesi admin"})
			return
		}

		c.Set("admin_id", admin.ID)
		c.Set("admin_username", admin.Username)
		c.Set("admin_full_name", admin.FullName)
		c.Set("admin_role", admin.Role)
		c.Next()
	}
}

func bootstrapAdmin(db *sql.DB) error {
	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM admins`).Scan(&total); err != nil {
		return fmt.Errorf("cek tabel admins: %w", err)
	}
	if total > 0 {
		return nil
	}

	username := optionalGetEnvOrFile("ADMIN_BOOTSTRAP_USERNAME", "ADMIN_BOOTSTRAP_USERNAME_FILE")
	password := optionalGetEnvOrFile("ADMIN_BOOTSTRAP_PASSWORD", "ADMIN_BOOTSTRAP_PASSWORD_FILE")
	fullName := strings.TrimSpace(getEnv("ADMIN_BOOTSTRAP_FULL_NAME", "Administrator"))

	if username == "" || password == "" {
		return fmt.Errorf("belum ada admin. Set ADMIN_BOOTSTRAP_USERNAME dan ADMIN_BOOTSTRAP_PASSWORD untuk membuat admin pertama")
	}
	if len(password) < 10 {
		return fmt.Errorf("ADMIN_BOOTSTRAP_PASSWORD minimal 10 karakter")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash password admin: %w", err)
	}

	_, err = db.Exec(`
		INSERT INTO admins (username, password_hash, full_name, role, is_active)
		VALUES (?, ?, ?, 'SUPERADMIN', 1)`, username, string(hash), fullName,
	)
	if err != nil {
		return fmt.Errorf("insert admin pertama: %w", err)
	}

	return nil
}

func generateSessionToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func hashSessionToken(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}

func setAdminSessionCookie(c *gin.Context, rawToken string, expiresAt time.Time) {
	secure := envBool("COOKIE_SECURE", false)
	maxAge := int(time.Until(expiresAt).Seconds())
	if maxAge < 1 {
		maxAge = 1
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		adminSessionCookie,
		rawToken,
		maxAge,
		"/",
		"",
		secure,
		true,
	)
}

func clearAdminSessionCookie(c *gin.Context) {
	secure := envBool("COOKIE_SECURE", false)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(adminSessionCookie, "", -1, "/", "", secure, true)
}
