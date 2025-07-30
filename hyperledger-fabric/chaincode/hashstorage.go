package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing a hash
type SmartContract struct {
	contractapi.Contract
}

// HashData describes basic details of what we are storing
type HashData struct {
	Value     string `json:"value"`
	Timestamp string `json:"timestamp"`
	DeviceID  string `json:"deviceID,omitempty"`
}

// StoreHash adds a new hash to the ledger
func (s *SmartContract) StoreHash(ctx contractapi.TransactionContextInterface, id string, hashValue string) error {
	log.Printf("Storing Hash for ID: %s", id)

	// Check if the hash ID already exists
	exists, err := s.HashExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the hash for ID %s already exists", id)
	}

	// Create the hash data object
	hash := HashData{
		Value: hashValue,
	}

	// Convert the object to a JSON byte array
	hashJSON, err := json.Marshal(hash)
	if err != nil {
		return err
	}

	// Put the JSON data on the ledger, using the ID as the key
	return ctx.GetStub().PutState(id, hashJSON)
}

// GetHash returns the hash stored in the world state with given id
func (s *SmartContract) GetHash(ctx contractapi.TransactionContextInterface, id string) (*HashData, error) {
	// Get the hash data from the ledger using the ID
	hashJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if hashJSON == nil {
		return nil, fmt.Errorf("the hash for ID %s does not exist", id)
	}

	// Create a new HashData object to hold the result
	var hash HashData
	// Unmarshal the JSON data into the object
	err = json.Unmarshal(hashJSON, &hash)
	if err != nil {
		return nil, err
	}

	return &hash, nil
}

// HashExists returns true when a hash with given ID exists in world state
func (s *SmartContract) HashExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	hashJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return hashJSON != nil, nil
}

func main() {
	// Create a new smart contract chaincode
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating hashstorage chaincode: %v", err)
	}

	// Start the chaincode
	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting hashstorage chaincode: %v", err)
	}
}
