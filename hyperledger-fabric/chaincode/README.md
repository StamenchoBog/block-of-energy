

```shell
helm install hashstorage-install ./charts/fabric-chaincode-install \
  --set chaincode.name=hashstorage \
  --set chaincode.version=1.0 \
  --set chaincode.path=/path/to/your/chaincode \
  --set chaincode.lang=golang
  
  
helm install hashstorage-approve-org1 ./charts/fabric-chaincode-approve \
  --set chaincode.name=hashstorage \
  --set chaincode.version=1.0 \
  --set organization=org1
  
helm install hashstorage-commit ./charts/fabric-chaincode-commit \
  --set chaincode.name=hashstorage \
  --set chaincode.version=1.0
```