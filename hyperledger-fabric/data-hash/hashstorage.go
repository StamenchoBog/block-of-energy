package main

import (
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing a data hash
type SmartContract struct {
	contractapi.Contract
}

// EnergyDataHash describes energy consumption data hash stored on the ledger
type EnergyDataHash struct {
	ID            string    `json:"ID"`
	HashValue     string    `json:"HashValue"`
	Timestamp     time.Time `json:"Timestamp"`
	DeviceID      string    `json:"DeviceID"`
	EnergyReading float64   `json:"EnergyReading,omitempty"`  // Optional: actual energy reading
	Location      string    `json:"Location,omitempty"`      // Optional: device location
	DataType      string    `json:"DataType"`                // e.g., "consumption", "production"
	CreatedAt     time.Time `json:"CreatedAt"`               // Blockchain entry time
	UpdatedAt     time.Time `json:"UpdatedAt,omitempty"`     // Last update time
}

// Custom error types for better error handling
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error in field '%s': %s", e.Field, e.Message)
}

// CreateEnergyDataHash creates a new energy data hash with enhanced validation and logging
func (s *SmartContract) CreateEnergyDataHash(ctx contractapi.TransactionContextInterface, id string, hashValue string, timestamp string, deviceID string, dataType string) error {
	log.Printf("CreateEnergyDataHash called with ID: %s, DeviceID: %s, DataType: %s", id, deviceID, dataType)
	
	// Validate inputs
	if err := s.validateInput(id, hashValue, timestamp, deviceID, dataType); err != nil {
		log.Printf("Validation failed for ID %s: %v", id, err)
		return err
	}

	// Check if hash already exists
	exists, err := s.HashExists(ctx, id)
	if err != nil {
		log.Printf("Error checking if hash exists for ID %s: %v", id, err)
		return fmt.Errorf("failed to check hash existence: %v", err)
	}
	if exists {
		log.Printf("Hash with ID %s already exists", id)
		return fmt.Errorf("the energy data hash with ID %s already exists", id)
	}

	// Parse timestamp
	parsedTime, err := time.Parse(time.RFC3339, timestamp)
	if err != nil {
		log.Printf("Invalid timestamp format for ID %s: %s", id, timestamp)
		return &ValidationError{Field: "timestamp", Message: "must be in RFC3339 format (e.g., 2024-01-15T10:30:00Z)"}
	}

	// Create enhanced energy data hash
	now := time.Now()
	hash := EnergyDataHash{
		ID:        id,
		HashValue: hashValue,
		Timestamp: parsedTime,
		DeviceID:  deviceID,
		DataType:  dataType,
		CreatedAt: now,
	}

	// Marshal to JSON
	hashJSON, err := json.Marshal(hash)
	if err != nil {
		log.Printf("Failed to marshal hash for ID %s: %v", id, err)
		return fmt.Errorf("failed to marshal energy data hash: %v", err)
	}

	// Store on ledger
	if err := ctx.GetStub().PutState(id, hashJSON); err != nil {
		log.Printf("Failed to store hash for ID %s: %v", id, err)
		return fmt.Errorf("failed to store energy data hash: %v", err)
	}

	log.Printf("Successfully created energy data hash for ID %s", id)
	return nil
}

// CreateHash - Legacy function for backward compatibility
func (s *SmartContract) CreateHash(ctx contractapi.TransactionContextInterface, id string, hashValue string, timestamp string, deviceID string) error {
	return s.CreateEnergyDataHash(ctx, id, hashValue, timestamp, deviceID, "consumption")
}

// validateInput performs comprehensive input validation
func (s *SmartContract) validateInput(id, hashValue, timestamp, deviceID, dataType string) error {
	// Validate ID
	if strings.TrimSpace(id) == "" {
		return &ValidationError{Field: "id", Message: "cannot be empty"}
	}
	if len(id) > 64 {
		return &ValidationError{Field: "id", Message: "must be 64 characters or less"}
	}

	// Validate hash value (SHA256 format)
	hashRegex := regexp.MustCompile("^[a-fA-F0-9]{64}$")
	if !hashRegex.MatchString(hashValue) {
		return &ValidationError{Field: "hashValue", Message: "must be a valid 64-character hex string (SHA256)"}
	}

	// Validate timestamp format
	if _, err := time.Parse(time.RFC3339, timestamp); err != nil {
		return &ValidationError{Field: "timestamp", Message: "must be in RFC3339 format (e.g., 2024-01-15T10:30:00Z)"}
	}

	// Validate device ID
	if strings.TrimSpace(deviceID) == "" {
		return &ValidationError{Field: "deviceID", Message: "cannot be empty"}
	}
	deviceRegex := regexp.MustCompile("^[a-zA-Z0-9_-]{1,32}$")
	if !deviceRegex.MatchString(deviceID) {
		return &ValidationError{Field: "deviceID", Message: "must contain only alphanumeric characters, hyphens, and underscores (1-32 chars)"}
	}

	// Validate data type
	validDataTypes := map[string]bool{
		"consumption": true,
		"production":  true,
		"storage":     true,
		"transmission": true,
	}
	if !validDataTypes[strings.ToLower(dataType)] {
		return &ValidationError{Field: "dataType", Message: "must be one of: consumption, production, storage, transmission"}
	}

	return nil
}

// ReadEnergyDataHash returns enhanced energy data hash from the ledger
func (s *SmartContract) ReadEnergyDataHash(ctx contractapi.TransactionContextInterface, id string) (*EnergyDataHash, error) {
	log.Printf("ReadEnergyDataHash called with ID: %s", id)
	
	if strings.TrimSpace(id) == "" {
		return nil, &ValidationError{Field: "id", Message: "cannot be empty"}
	}

	hashJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		log.Printf("Failed to read hash for ID %s: %v", id, err)
		return nil, fmt.Errorf("failed to read energy data hash: %v", err)
	}
	if hashJSON == nil {
		log.Printf("Energy data hash with ID %s does not exist", id)
		return nil, fmt.Errorf("energy data hash with ID %s does not exist", id)
	}

	var hash EnergyDataHash
	if err := json.Unmarshal(hashJSON, &hash); err != nil {
		log.Printf("Failed to unmarshal hash for ID %s: %v", id, err)
		return nil, fmt.Errorf("failed to unmarshal energy data hash: %v", err)
	}

	log.Printf("Successfully read energy data hash for ID %s", id)
	return &hash, nil
}

// ReadHash - Legacy function for backward compatibility  
func (s *SmartContract) ReadHash(ctx contractapi.TransactionContextInterface, id string) (*EnergyDataHash, error) {
	return s.ReadEnergyDataHash(ctx, id)
}

// GetHashesByDevice returns all hashes for a specific device
func (s *SmartContract) GetHashesByDevice(ctx contractapi.TransactionContextInterface, deviceID string) ([]*EnergyDataHash, error) {
	log.Printf("GetHashesByDevice called with DeviceID: %s", deviceID)
	
	if strings.TrimSpace(deviceID) == "" {
		return nil, &ValidationError{Field: "deviceID", Message: "cannot be empty"}
	}

	queryString := fmt.Sprintf(`{"selector":{"DeviceID":"%s"}}`, deviceID)
	return s.queryHashes(ctx, queryString)
}

// GetHashesByDataType returns all hashes for a specific data type
func (s *SmartContract) GetHashesByDataType(ctx contractapi.TransactionContextInterface, dataType string) ([]*EnergyDataHash, error) {
	log.Printf("GetHashesByDataType called with DataType: %s", dataType)
	
	validDataTypes := map[string]bool{
		"consumption": true, "production": true, "storage": true, "transmission": true,
	}
	if !validDataTypes[strings.ToLower(dataType)] {
		return nil, &ValidationError{Field: "dataType", Message: "must be one of: consumption, production, storage, transmission"}
	}

	queryString := fmt.Sprintf(`{"selector":{"DataType":"%s"}}`, strings.ToLower(dataType))
	return s.queryHashes(ctx, queryString)
}

// GetHashesByTimeRange returns hashes within a specific time range
func (s *SmartContract) GetHashesByTimeRange(ctx contractapi.TransactionContextInterface, startTime, endTime string) ([]*EnergyDataHash, error) {
	log.Printf("GetHashesByTimeRange called with range: %s to %s", startTime, endTime)
	
	// Validate time format
	if _, err := time.Parse(time.RFC3339, startTime); err != nil {
		return nil, &ValidationError{Field: "startTime", Message: "must be in RFC3339 format"}
	}
	if _, err := time.Parse(time.RFC3339, endTime); err != nil {
		return nil, &ValidationError{Field: "endTime", Message: "must be in RFC3339 format"}
	}

	queryString := fmt.Sprintf(`{
		"selector": {
			"Timestamp": {
				"$gte": "%s",
				"$lte": "%s"
			}
		}
	}`, startTime, endTime)
	
	return s.queryHashes(ctx, queryString)
}

// queryHashes performs rich queries against the state database
func (s *SmartContract) queryHashes(ctx contractapi.TransactionContextInterface, queryString string) ([]*EnergyDataHash, error) {
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		log.Printf("Query failed: %v", err)
		return nil, fmt.Errorf("query failed: %v", err)
	}
	defer resultsIterator.Close()

	var hashes []*EnergyDataHash
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			log.Printf("Iterator error: %v", err)
			return nil, fmt.Errorf("iterator error: %v", err)
		}

		var hash EnergyDataHash
		if err := json.Unmarshal(queryResult.Value, &hash); err != nil {
			log.Printf("Failed to unmarshal query result: %v", err)
			continue // Skip invalid entries
		}
		
		hashes = append(hashes, &hash)
	}

	log.Printf("Query returned %d results", len(hashes))
	return hashes, nil
}

// HashExists returns true when a hash with given ID exists in world state
func (s *SmartContract) HashExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	if strings.TrimSpace(id) == "" {
		return false, &ValidationError{Field: "id", Message: "cannot be empty"}
	}

	hashJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		log.Printf("Error checking if hash exists for ID %s: %v", id, err)
		return false, fmt.Errorf("failed to check hash existence: %v", err)
	}

	exists := hashJSON != nil
	log.Printf("Hash existence check for ID %s: %t", id, exists)
	return exists, nil
}

// GetAllHashes returns all energy data hashes (use with caution in production)
func (s *SmartContract) GetAllHashes(ctx contractapi.TransactionContextInterface) ([]*EnergyDataHash, error) {
	log.Printf("GetAllHashes called")
	
	// Warning: This can be expensive with large datasets
	log.Printf("Warning: GetAllHashes can be expensive with large datasets")
	
	queryString := `{"selector":{}}`
	return s.queryHashes(ctx, queryString)
}

// GetHashCount returns the total number of hashes by data type
func (s *SmartContract) GetHashCount(ctx contractapi.TransactionContextInterface, dataType string) (int, error) {
	log.Printf("GetHashCount called with DataType: %s", dataType)
	
	hashes, err := s.GetHashesByDataType(ctx, dataType)
	if err != nil {
		return 0, err
	}
	
	count := len(hashes)
	log.Printf("Hash count for DataType %s: %d", dataType, count)
	return count, nil
}

// GetHashCountByTimeRange returns count of hashes within time range for analytics
func (s *SmartContract) GetHashCountByTimeRange(ctx contractapi.TransactionContextInterface, startTime, endTime string) (int, error) {
	log.Printf("GetHashCountByTimeRange called with range: %s to %s", startTime, endTime)
	
	hashes, err := s.GetHashesByTimeRange(ctx, startTime, endTime)
	if err != nil {
		return 0, err
	}
	
	count := len(hashes)
	log.Printf("Hash count for time range %s to %s: %d", startTime, endTime, count)
	return count, nil
}

// CreateBatchEnergyDataHash creates multiple energy data hashes in one transaction
func (s *SmartContract) CreateBatchEnergyDataHash(ctx contractapi.TransactionContextInterface, batchData string) (int, error) {
	log.Printf("CreateBatchEnergyDataHash called")
	
	// Parse batch data (JSON array)
	var batch []map[string]string
	if err := json.Unmarshal([]byte(batchData), &batch); err != nil {
		log.Printf("Failed to parse batch data: %v", err)
		return 0, fmt.Errorf("invalid batch data format: %v", err)
	}
	
	successCount := 0
	for i, item := range batch {
		id, ok1 := item["id"]
		hashValue, ok2 := item["hashValue"]
		timestamp, ok3 := item["timestamp"]
		deviceID, ok4 := item["deviceID"]
		dataType, ok5 := item["dataType"]
		
		if !ok1 || !ok2 || !ok3 || !ok4 || !ok5 {
			log.Printf("Skipping batch item %d: missing required fields", i)
			continue
		}
		
		if err := s.CreateEnergyDataHash(ctx, id, hashValue, timestamp, deviceID, dataType); err != nil {
			log.Printf("Failed to create hash for batch item %d (ID: %s): %v", i, id, err)
			continue
		}
		
		successCount++
	}
	
	log.Printf("Successfully created %d out of %d batch items", successCount, len(batch))
	return successCount, nil
}

// main function to start the energy data hash chaincode
func main() {
	log.Printf("Starting Energy Data Hash Chaincode")
	
	hashChaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating energy data hash chaincode: %v", err)
	}

	log.Printf("Energy Data Hash Chaincode created successfully")
	
	if err := hashChaincode.Start(); err != nil {
		log.Panicf("Error starting energy data hash chaincode: %v", err)
	}
	
	log.Printf("Energy Data Hash Chaincode started successfully")
}
