import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import app from './app.js';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import sendtrade from '.././kafkaproducer.js';
import kafkaconsumer from '.././kafkaconsumer.js'

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// START THE SERVER IMMEDIATELY so ports open up right away
const MONGO_URI = 'mongodb://127.0.0.1:27017/absolutely_new_test_db';
mongoose.connect(MONGO_URI, { dbName: 'auth_provider' })
    .then(async () => {
        console.log("🚀 MongoDB connected successfully!");
       
        
        // Connect Redis asynchronously AFTER server initializes
        try {
            const pubClient = createClient({ url: 'redis://127.0.0.1:6379' }); 
            const subClient = pubClient.duplicate();
            await pubClient.connect();
            await subClient.connect();
            console.log("Redis pub/sub established");
              try {
            await kafkaconsumer(pubClient);
            console.log("Kafka Consumer has been successfully initialized & listening!");
        } catch (consumerError) {
            console.error(" Failed to boot Kafka Consumer:", consumerError);
        }
        

            // Handle your Kafka subscription here smoothly
            await subClient.subscribe('Global_Chat_Channel', async (message) => {
                const parsedData = JSON.parse(message);
                io.emit('chat_message', parsedData);
                try { await sendtrade(parsedData); } catch(e) {}
            });

            // Socket logic attached safely
            io.on('connection', async (socket) => {
                console.log(`A user connected to live chat! ID:${socket.id}`);
                
                // Fetch History
                const existingHistoryString = await pubClient.get('CHAT_HISTORY_STATE');
                if (existingHistoryString) {
                    socket.emit('chat_history', JSON.parse(existingHistoryString));
                }

                socket.on('chat_message', async (data) => {
                    const msgpayload = { user: data.user, text: data.text, time: Date.now() };
                    
                    // Save history array logic...
                    const rawHistory = await pubClient.get('CHAT_HISTORY_STATE');
                    let historyArray = rawHistory ? JSON.parse(rawHistory) : [];
                    historyArray.push(msgpayload);
                    if (historyArray.length > 100) historyArray.shift();
                    
                    await pubClient.set('CHAT_HISTORY_STATE', JSON.stringify(historyArray));
                    pubClient.publish('Global_Chat_Channel', JSON.stringify(msgpayload));
                });
            });

        } catch (err) {
            console.error("Redis/Socket setup failure:", err);
        }

        // Fire up the listener
        httpServer.listen(8081, () => {
            console.log("⚡ Live Server running at http://127.0.0.1:8081");
        });
    });
   












    