const mqtt = require('mqtt');
const fs = require('fs');

// Configuration
const CONFIG = {
    broker: 'mqtt://localhost:1883',
    topic: 'tele/tasmota_monitor_000001/SENSOR',
    publishToMqtt: true,
    saveToFile: true,
    outputFilePath: './historical-data.json',

    // Historical data parameters
    daysOfHistory: 1,  // Number of days to go back
    minutesPerDay: 288, // Readings every 5 minutes (24 * 60 / 5 = 288)
    readingInterval: 5, // Minutes between readings
    publishDelayMs: 10  // Reduced delay to handle large number of messages
};

// Initialize client if publishing
const client = CONFIG.publishToMqtt ? mqtt.connect(CONFIG.broker) : null;

// Generate all historical dates (every 5 minutes for the specified days)
function generateHistoricalDates() {
    const now = new Date();
    const dates = [];

    // Start from X days ago
    const startDate = new Date(now.getTime() - (CONFIG.daysOfHistory * 24 * 60 * 60 * 1000));

    // Generate a date every 5 minutes
    for (let minutes = 0; minutes < CONFIG.daysOfHistory * CONFIG.minutesPerDay * CONFIG.readingInterval; minutes += CONFIG.readingInterval) {
        const date = new Date(startDate.getTime() + (minutes * 60 * 1000));
        dates.push(date);
    }

    return dates;
}

// Reuse existing functions
function fluctuate(baseValue, percentVariation) {
    const variation = (Math.random() * 2 - 1) * percentVariation;
    return baseValue * (1 + variation);
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${days}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Generate message for a specific date
function generateMessageForDate(date, index, totalEnergy, todayEnergy) {
    // Calculate uptime (increasing with each message - 5 minutes per reading)
    const uptimeSec = 3600 + (index * 60 * CONFIG.readingInterval);
    const uptime = formatUptime(uptimeSec);

    // Create realistic usage patterns
    const hour = date.getHours();
    const minute = date.getMinutes();
    const dayOfWeek = date.getDay();

    // Time-of-day pattern: higher during day, peak morning and evening
    let timeOfDayFactor = 0.6; // Base for nighttime
    if (hour >= 7 && hour < 9) {
        // Morning peak
        timeOfDayFactor = 1.8;
    } else if (hour >= 9 && hour < 17) {
        // Daytime
        timeOfDayFactor = 1.2;
    } else if (hour >= 17 && hour < 22) {
        // Evening peak
        timeOfDayFactor = 1.9;
    }

    // Weekend pattern: lower on weekends
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.8 : 1.1;

    // Minor random fluctuations by minute
    const minuteFactor = 1 + (0.1 * Math.sin(minute / 10));

    // Calculate power with all factors
    const basePower = 100 * timeOfDayFactor * weekendFactor * minuteFactor;
    const power = Math.floor(fluctuate(basePower, 0.15));

    // Other electrical parameters
    const voltage = Math.floor(fluctuate(230, 0.03));
    const powerFactor = Math.min(1, Math.max(0.85, fluctuate(0.96, 0.05)));
    const current = parseFloat((power / (voltage * powerFactor)).toFixed(3));
    const apparentPower = Math.floor(power / powerFactor);
    const reactivePower = Math.floor(Math.sqrt(apparentPower * apparentPower - power * power));

    // Energy consumption for five minutes instead of one
    const minuteEnergy = power * (CONFIG.readingInterval / 60000); // kWh for five minutes
    todayEnergy += minuteEnergy;
    totalEnergy += minuteEnergy;

    return {
        timestamp: date.toISOString(), // For reference
        Uptime: uptime,
        UptimeSec: Math.floor(uptimeSec),
        Vcc: parseFloat(fluctuate(3.45, 0.05).toFixed(3)),
        Heap: Math.floor(fluctuate(26, 0.2)),
        SleepMode: "Dynamic",
        Sleep: 50,
        LoadAvg: Math.floor(fluctuate(19, 0.3)),
        MqttCount: index + 1,
        Wifi: {
            AP: 1,
            SSId: "TEST_WIFI",
            BSSId: "AA:BB:CC:DD:EE:FF",
            Channel: 6,
            Mode: "11n",
            RSSI: Math.floor(fluctuate(88, 0.1)),
            Signal: Math.floor(fluctuate(-56, 0.1)),
            LinkCount: 1,
            Downtime: "0T00:00:03"
        },
        ENERGY: {
            TotalStartTime: date.toISOString().split('T')[0] + "T00:00:00",
            Total: parseFloat(totalEnergy.toFixed(3)),
            Yesterday: parseFloat(fluctuate(5.5, 0.3).toFixed(3)),
            Today: parseFloat(todayEnergy.toFixed(3)),
            Period: Math.floor(fluctuate(15, 0.2)),
            Power: power,
            ApparentPower: apparentPower,
            ReactivePower: reactivePower,
            Factor: parseFloat(powerFactor.toFixed(2)),
            Voltage: voltage,
            Current: current
        }
    };
}

// Generate all historical messages
function generateHistoricalData() {
    const dates = generateHistoricalDates();
    const messages = [];
    let totalEnergy = 10.0; // Starting base value
    let todayEnergy = 0;
    let currentDay = null;

    console.log(`Generating ${dates.length} readings across ${CONFIG.daysOfHistory} days...`);

    for (let i = 0; i < dates.length; i++) {
        const date = dates[i];

        // Reset daily energy for new days
        if (currentDay === null ||
            date.getDate() !== currentDay.getDate() ||
            date.getMonth() !== currentDay.getMonth()) {

            currentDay = new Date(date);
            todayEnergy = 0;
        }

        const message = generateMessageForDate(date, i, totalEnergy, todayEnergy);

        // Update the running totals with the calculated values
        totalEnergy = message.ENERGY.Total;
        todayEnergy = message.ENERGY.Today;

        messages.push(message);

        // Progress indicator for large datasets
        if (i % 10000 === 0) {
            console.log(`Generated ${i}/${dates.length} messages...`);
        }
    }

    return messages;
}

// Save messages to file in batches to avoid memory issues
function saveMessagesToFile(messages) {
    console.log(`Saving ${messages.length} messages to ${CONFIG.outputFilePath}...`);
    fs.writeFileSync(CONFIG.outputFilePath, JSON.stringify(messages, null, 2));
    console.log('Save complete');
}

// Publish messages to MQTT in batches
async function publishMessages(messages) {
    console.log(`Publishing ${messages.length} messages to ${CONFIG.topic}...`);

    const batchSize = 100;
    for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);

        for (const message of batch) {
            await new Promise(resolve => {
                client.publish(CONFIG.topic, JSON.stringify(message), {}, resolve);
            });
            await new Promise(resolve => setTimeout(resolve, CONFIG.publishDelayMs));
        }

        console.log(`Published batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(messages.length/batchSize)}`);
    }

    console.log('Publishing complete');
}

// Main execution function
async function main() {
    console.log('Starting historical data generation...');
    const messages = generateHistoricalData();

    if (CONFIG.saveToFile) {
        saveMessagesToFile(messages);
    }

    if (CONFIG.publishToMqtt) {
        if (client) {
            client.on('connect', async () => {
                console.log(`Connected to MQTT broker at ${CONFIG.broker}`);
                await publishMessages(messages);
                client.end();
                console.log('Finished');
            });

            client.on('error', (err) => {
                console.error('MQTT connection error:', err);
                process.exit(1);
            });
        }
    } else {
        console.log('MQTT publishing disabled');
    }
}

// Run the script
main().catch(err => {
    console.error('Error in main execution:', err);
});