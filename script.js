document.addEventListener("DOMContentLoaded", () => {
    loadChatHistory();
    loadChatList();
});

document.getElementById("user-input").addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// ✅ Store chat sessions
let chatSessions = JSON.parse(localStorage.getItem("chatSessions")) || [];
let currentChatIndex = chatSessions.length > 0 ? chatSessions.length - 1 : 0;

// ✅ Function to send messages
async function sendMessage() {
    const inputField = document.getElementById('user-input');
    const userMessage = inputField.value.trim();
    if (!userMessage) return;

    appendMessage(userMessage, 'user');
    saveToLocalDB(userMessage, 'user');
    inputField.value = '';

    const botMessageElement = appendMessage("", "bot");

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {  
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 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'
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: "You are an AI assistant. Respond to the user clearly and concisely. Build By Lakshit Mathur Trained By Lakshit Mathur " },
                    { role: "user", content: userMessage }
                ],
                stream: true
            })
        });

        if (!response.body) {
            botMessageElement.textContent = "Error: No response body";
            saveToLocalDB("Error: No response body", 'bot');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botMessage = "";

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            try {
                const jsonParts = chunk.split("\n").filter(line => line.trim() !== ""); 

                for (const jsonPart of jsonParts) {
                    if (jsonPart.startsWith("data:")) { 
                        const jsonData = JSON.parse(jsonPart.replace("data:", "").trim());
                        if (jsonData.choices && jsonData.choices.length > 0) {
                            const token = jsonData.choices[0]?.delta?.content || "";
                            botMessage += token;
                            botMessageElement.textContent = botMessage;
                        }
                    }
                }
            } catch (error) {
                console.error("Error parsing streamed chunk:", error);
            }
        }

        saveToLocalDB(botMessage, 'bot');

    } catch (error) {
        console.error('Error:', error);
        botMessageElement.textContent = "Error: Unable to fetch response";
        saveToLocalDB("Error: Unable to fetch response", 'bot');
    }
}

// ✅ Function to append messages to the chat UI
function appendMessage(text, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.textContent = text;
    messageDiv.classList.add('message', sender);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageDiv;
}

// ✅ Function to save messages for each session
function saveToLocalDB(message, sender) {
    if (!chatSessions[currentChatIndex]) {
        chatSessions[currentChatIndex] = [];
    }
    chatSessions[currentChatIndex].push({ message, sender });
    localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    loadChatList();
}

// ✅ Function to load chat history when page reloads
function loadChatHistory() {
    let chatHistory = chatSessions[currentChatIndex] || [];
    document.getElementById("chat-box").innerHTML = "";
    chatHistory.forEach(chat => {
        appendMessage(chat.message, chat.sender);
    });
}

// ✅ Function to show past chats
function loadChatList() {
    const chatList = document.getElementById("chat-history-list");
    chatList.innerHTML = "";
    chatSessions.forEach((session, index) => {
        let listItem = document.createElement("li");
        listItem.textContent = session.length > 0 ? session[0].message.substring(0, 20) + "..." : "Chat " + (index + 1);
        listItem.onclick = () => loadSpecificChat(index);
        chatList.appendChild(listItem);
    });
}

// ✅ Function to load a specific chat
function loadSpecificChat(index) {
    currentChatIndex = index;
    loadChatHistory();
}

// ✅ Function to start a new chat
function startNewChat() {
    currentChatIndex = chatSessions.length;
    chatSessions.push([]);
    localStorage.setItem("chatSessions", JSON.stringify(chatSessions));
    document.getElementById("chat-box").innerHTML = "";
    loadChatList();
}

// ✅ Function to clear all chat history
function clearChatHistory() {
    localStorage.removeItem("chatSessions");
    chatSessions = [];
    currentChatIndex = 0;
    document.getElementById("chat-box").innerHTML = "";
    document.getElementById("chat-history-list").innerHTML = "";
}
