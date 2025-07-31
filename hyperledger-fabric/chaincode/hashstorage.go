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

// InitLedger adds a base set of hashes to the ledger (optional)
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	log.Println("Initializing Hash Storage chaincode")
	return nil
}

// StoreHash adds a new hash to the ledger
func (s *SmartContract) StoreHash(ctx contractapi.TransactionContextInterface, id string, hashValue string) error {
	log.Printf("Storing Hash for ID: %s", id)

	exists, err := s.HashExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the hash for ID %s already exists", id)
	}

	hash := HashData{
		Value: hashValue,
	}

	hashJSON, err := json.Marshal(hash)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, hashJSON)
}

// GetHash returns the hash stored in the world state with given id
func (s *SmartContract) GetHash(ctx contractapi.TransactionContextInterface, id string) (*HashData, error) {
	hashJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if hashJSON == nil {
		return nil, fmt.Errorf("the hash for ID %s does not exist", id)
	}

	var hash HashData
	err = json.Unmarshal(hashJSON, &hash)
	if err != nil {
		return nil, err
	}

	return &hash, nil
}

// GetAllHashes returns all hashes found in world state
func (s *SmartContract) GetAllHashes(ctx contractapi.TransactionContextInterface) ([]*HashData, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var hashes []*HashData
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var hash HashData
		err = json.Unmarshal(queryResponse.Value, &hash)
		if err != nil {
			return nil, err
		}
		hashes = append(hashes, &hash)
	}

	return hashes, nil
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
	hashChaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		log.Panicf("Error creating hashstorage chaincode: %v", err)
	}

	if err := hashChaincode.Start(); err != nil {
		log.Panicf("Error starting hashstorage chaincode: %v", err)
	}
}
