import express from 'express';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/chat-test', (req, res) => {
   res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>TradeLens Core Live Chat</title>
            <style>
                body { margin: 0; padding: 20px; font-family: system-ui; background: #0f172a; color: #fff; display: flex; flex-direction: column; height: 90vh; }
                #chat-box { flex: 1; background: #1e293b; border-radius: 8px; padding: 20px; overflow-y: auto; margin-bottom: 20px; border: 1px solid #334155; }
                .msg { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; background: #334155; width: max-content; max-width: 70%; }
                .msg .user { color: #38bdf8; font-weight: bold; font-size: 0.85rem; display: block; }
                .input-area { display: flex; gap: 10px; }
                input { flex: 1; padding: 12px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #fff; }
                button { background: #38bdf8; color: #0f172a; border: none; padding: 0 24px; border-radius: 6px; font-weight: bold; cursor: pointer; }
                .chatbox { display: flex; flex-direction: column; }
                .self { background-color: #1e3a8a; align-self: flex-end; font-size: 16px; border: 1px solid #3b82f6; }
                .other { background-color: #334155; align-self: flex-start; font-size: 16px; }
            </style>
            <script src="http://localhost:8081/socket.io/socket.io.js"></script>
        </head>
        <body>
            <h2>💬 TradeLens System Live Terminal Chat</h2>
            <div id="chat-box" class="chatbox"></div>
            <div class="input-area">
                <input type="text" id="msg-input" placeholder="Type a secure message...">
                <button id="send-btn">Send</button>
            </div>

            <script>
                const username = "User_" + Math.floor(Math.random() * 1000);
                const socket = io("http://127.0.0.1:8081", { transports: ["websocket"] });
                
                const box = document.getElementById('chat-box');
                const input = document.getElementById('msg-input');
                const button = document.getElementById('send-btn');

                function appendMessage(data) {
                    if (!box) return;
                    const isSelf = data.user === username;
                    
                    box.innerHTML += \`
                        <div class="msg \${isSelf ? 'self' : 'other'}">
                            <span class="user">\${data.user} (\${data.time})</span>
                            \${data.text}
                        </div>
                    \`;
                    box.scrollTop = box.scrollHeight; 
                }

                socket.on('chat_history', (historyarray) => {
                    if (!box) return;
                    box.innerHTML = ''; 
                    if (Array.isArray(historyarray)) {
                        historyarray.forEach(appendMessage);
                    }
                });

                socket.on('chat_message', (data) => {
                    appendMessage(data);
                });

                function broadcastInput() {
                    const text = input.value.trim();
                    if (!text) return;
                    
                    socket.emit('chat_message', { user: username, text: text });
                    input.value = '';
                    input.focus();
                }

                button.addEventListener('click', broadcastInput);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') broadcastInput();
                });
            </script>
        </body>
        </html>
    `);
});

export default app;