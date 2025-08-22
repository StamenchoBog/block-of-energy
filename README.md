# Block of Energy

Platform which leverages Blockchain technology to provide temper-free storing of records about energy consumption in
a given home, office, university campus or industry center.

## Diagrams

The Cloud Provider of choice is [Azure](https://portal.azure.com). The architecture diagram and the workflow
is displayed on the image below.

![Data Flow](./docs/images/architecture_diagram.png)

In the following sections each block from the data flow diagram will be analyzed in detail.

### Sensors and MQTT Broker

#### Sensors

The sensors deployed for the current PoC (Proof-of-Concept) are [Nous A1T](https://nous.technology/product/a1t.html) 
with a flashed [Tasmota](https://tasmota.github.io/docs/) firmware.
The sensor devices are able to measure and detect the following parameters:

Example MQTT message of the sensor:
```json
{
  "timestamp": "2025-08-21T18:23:28.067Z",
  "Uptime": "0T01:00:00",
  "UptimeSec": 3600,
  "Vcc": 3.339,
  "Heap": 23,
  "SleepMode": "Dynamic",
  "Sleep": 50,
  "LoadAvg": 15,
  "MqttCount": 1,
  "Wifi": {
    "AP": 1,
    "SSId": "TEST_WIFI",
    "BSSId": "AA:BB:CC:DD:EE:FF",
    "Channel": 6,
    "Mode": "11n",
    "RSSI": 83,
    "Signal": -61,
    "LinkCount": 1,
    "Downtime": "0T00:00:03"
  },
  "ENERGY": {
    "TotalStartTime": "2025-08-21T00:00:00",
    "Total": 10.017,
    "Yesterday": 6.87,
    "Today": 0.017,
    "Period": 14,
    "Power": 203,
    "ApparentPower": 207,
    "ReactivePower": 40,
    "Factor": 0.98,
    "Voltage": 223,
    "Current": 0.93
  }
}
```

#### MQTT Broker

The MQTT Broker deployed in the LAN (Local Area Network), is an [Eclipse Mosquitto](https://mosquitto.org/) broker.

#### Forwarder Proxy

A question that might come up is `Why having a MQTT Broker and a Forwarder Proxy, brokers at the same time ?`. The answer
to that we can look at a couple of problems that appeared connecting the MQTT Broker to the IoT Hub.

- `Issues with handling certificate(s)` - In order to set up a secure connection from a MQTT Broker to the IoT Hub, a 
certificate is the recommended way of encrypting data in transit. Managing the certificate might be outsourced to a Key Vault
in Azure, but providing each MQTT Broker with a valida certificate causes a problem and increases complexity.
- `Multiple MQTT Broker` - If we look at a scenario of having a single MQTT Broker, everything theoretically looks feasible.
But, adding additional MQTT Brokers on the fly, especially from different open-source projects or companies, will cause
a problem in their configuring.

This way the MQTT Broker is independent of the Forward Proxy, allowing the setup to be plug-and-play with many
brokers available on the market (ex: HiveMQ, EMQX, VerneMQ, RabbitMQ, etc.). Additionally, the setup allows usage of multiple
brokers, and allows independent scaling if needed.

### Azure resources

Resources deployed on Azure:
- IoT Hub
- IoT Hub DPS
- Azure Function(s)
  - `process_iot_hub_message`
  - `cosmos_db_writer`
  - `hash_and_store_to_ledger`
  - `scheduled_temper_check` (To be deployed)
- Service Bus (Topic and Subscription)
- CosmosDB MongoDB database
- AKS
  - Ledger deployed in namespace `bkp-of-energy-blockchain`
  - Application deployed in `bkp-of-energy-application`
- ...

### Local development

#### Pre-requisites

- Python 3.12 and above
- Docker
- Docker Compose
- OpenTofu
- Azure Tools CLI

### Improvements

- Migrate `Forwarder Proxy` to use a language with a better throughput capabilities (like GoLang, etc.).

### Application Images

![Dashboard](docs/images/application/01_dashboard.png)
![Daily Report](docs/images/application/02_daily_report.png)
![Weekly Report](docs/images/application/03_weekly_report.png)
![Monthly Report](docs/images/application/04_monthly_report.png)
![Yearly Report](docs/images/application/05_yearly_report.png)
