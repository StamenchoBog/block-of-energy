package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing a data hash
type SmartContract struct {
	contractapi.Contract
}

// DataHash describes the basic details of the hash stored on the ledger
// The struct tags are used by encoding/json library
type DataHash struct {
	ID        string `json:"ID"`
	HashValue string `json:"HashValue"`
	Timestamp string `json:"Timestamp"`
	DeviceID  string `json:"DeviceID"`
}

// CreateHash issues a new hash to the world state with given details.
// This function will be called by your 'Hashing Service' Azure Function.
func (s *SmartContract) CreateHash(ctx contractapi.TransactionContextInterface, id string, hashValue string, timestamp string, deviceID string) error {
	// First, check if a hash with this ID already exists
	exists, err := s.HashExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the hash with ID %s already exists", id)
	}

	// Create the DataHash object
	hash := DataHash{
		ID:        id,
		HashValue: hashValue,
		Timestamp: timestamp,
		DeviceID:  deviceID,
	}

	// Marshal the object into a JSON byte array
	hashJSON, err := json.Marshal(hash)
	if err != nil {
		return err
	}

	// Put the state into the ledger, using the ID as the key
	return ctx.GetStub().PutState(id, hashJSON)
}

// ReadHash returns the hash stored in the world state with given id.
// This function can be used by your application to verify a piece of data.
func (s *SmartContract) ReadHash(ctx contractapi.TransactionContextInterface, id string) (*DataHash, error) {
	// Get the state from the ledger using the ID
	hashJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if hashJSON == nil {
		return nil, fmt.Errorf("the hash with ID %s does not exist", id)
	}

	// Unmarshal the JSON byte array into a DataHash object
	var hash DataHash
	err = json.Unmarshal(hashJSON, &hash)
	if err != nil {
		return nil, err
	}

	return &hash, nil
}

// HashExists returns true when a hash with given ID exists in world state.
func (s *SmartContract) HashExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	hashJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return hashJSON != nil, nil
}

// main function to start the chaincode
func main() {
	hashChaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating data-hash-transfer chaincode: %v", err)
	}

	if err := hashChaincode.Start(); err != nil {
		log.Panicf("Error starting data-hash-transfer chaincode: %v", err)
	}
}
