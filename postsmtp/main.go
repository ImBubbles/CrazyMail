package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	"postsmtp/db"

	"github.com/ImBubbles/MySMTP/server"
	"github.com/joho/godotenv"
)

type MessageHandler struct {
	db *db.DB
}

func NewMessageHandler(database *db.DB) *MessageHandler {
	return &MessageHandler{db: database}
}

func (h *MessageHandler) HandleMessage(conn net.Conn, mailFrom string, rcptTo []string, data []byte) error {
	// Validate all recipients
	for _, recipient := range rcptTo {
		// Extract username from email (e.g., "user@domain.com" -> "user")
		parts := strings.Split(recipient, "@")
		if len(parts) == 0 {
			return fmt.Errorf("invalid recipient format: %s", recipient)
		}
		username := parts[0]
		
		if !h.db.ValidateRecipient(username) {
			return fmt.Errorf("recipient username not found: %s", username)
		}
	}
	
	// Store the message
	return h.db.StoreMessage(mailFrom, rcptTo, data)
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to PostgreSQL using db package
	dbConfig := db.NewConfigFromEnv()
	database, err := db.New(dbConfig.ConnectionString())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Get SMTP server configuration
	serverHostname := getEnv("SMTP_SERVER_HOSTNAME", "localhost")
	serverPort := getEnv("SMTP_SERVER_PORT", "2525")
	serverAddress := getEnv("SMTP_SERVER_ADDRESS", "0.0.0.0")
	serverDomain := getEnv("SMTP_SERVER_DOMAIN", "localhost")

	log.Printf("Starting SMTP server on %s:%s", serverAddress, serverPort)

	// Create message handler
	handler := NewMessageHandler(database)

	// Create SMTP server using MySMTP v1.0.0 library
	// Reference: https://github.com/ImBubbles/MySMTP
	// Based on the repository structure, the handler is likely registered via:
	// 1. Config.Handler field, or
	// 2. Server.OnMessage() method, or
	// 3. Server.Handler field
	// Handler function signature: func(conn net.Conn, mailFrom string, rcptTo []string, data []byte) error
	
	// Define message handler function
	messageHandler := func(conn net.Conn, mailFrom string, rcptTo []string, data []byte) error {
		return handler.HandleMessage(conn, mailFrom, rcptTo, data)
	}
	
	// Create server configuration with handler
	// Option 1: Handler in config (most common pattern)
	config := &server.Config{
		Hostname: serverHostname,
		Address:  serverAddress,
		Port:     serverPort,
		Domain:   serverDomain,
		Handler:  messageHandler, // Try setting handler in config
	}
	
	// Create SMTP server
	smtpServer := server.NewServer(config)
	
	// Option 2: If handler wasn't in config, try setting it directly
	// Uncomment if Option 1 doesn't work:
	// smtpServer.Handler = messageHandler
	
	// Option 3: If the library uses OnMessage method
	// Uncomment if Options 1 and 2 don't work:
	// smtpServer.OnMessage(messageHandler)

	// Start the server
	if err := smtpServer.ListenAndServe(); err != nil {
		log.Fatalf("SMTP server error: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
