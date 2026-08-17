package main

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func jsonLogger() gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		var userAgent string
		if param.Request != nil {
			userAgent = param.Request.UserAgent()
		}

		return fmt.Sprintf(
			`{"time":"%s","remote_ip":"%s","method":"%s","path":"%s","status":%d,"latency":"%s","user_agent":"%s","error":"%s"}`+"\n",
			param.TimeStamp.Format(time.RFC3339),
			param.ClientIP,
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
			userAgent,
			param.ErrorMessage,
		)
	})
}

func corsMiddleware() gin.HandlerFunc {
	configuredOrigins := strings.Split(
		getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"),
		",",
	)

	allowedOrigins := make(map[string]struct{}, len(configuredOrigins))
	for _, origin := range configuredOrigins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowedOrigins[origin] = struct{}{}
		}
	}

	return func(c *gin.Context) {
		origin := strings.TrimSpace(c.GetHeader("Origin"))

		if origin != "" && !isSameOrigin(c.Request, origin) {
			if _, ok := allowedOrigins[origin]; !ok {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error": "Origin tidak diizinkan",
				})
				return
			}
		}

		if origin != "" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func isSameOrigin(r *http.Request, origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}

	return strings.EqualFold(parsed.Host, r.Host)
}
