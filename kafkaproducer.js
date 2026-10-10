import kafka from './kafka.js'
const producer=kafka.producer()
let isConnected = false;
export default async function sendtrade(parsedData) {
   try {
        // 🚀 CRITICAL RECONNECT GUARD: If it dropped, boot it back up!
        if (!isConnected) {
            await producer.connect();
            isConnected = true;
        }
        await producer.send({
            topic: 'Global_Chat_Channel',
            messages: [{
                key: parsedData.user || 'CHAT',
                value: JSON.stringify(parsedData)
            }]
        });
        console.log("🚀 Event successfully streamed to Kafka.");
    } catch (error) {
        // This keeps your server alive even if Kafka is down!
        console.error("⚠️ Kafka skipped logging, but server is staying alive:", error.message);
    }
}

