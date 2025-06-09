document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = "AIzaSyDKCOPVTAE5ArvAQjW24S5jWpcEd1r5wew";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
    const MATSANELA_AI_NAME = "Matsanela AI";

    const chatMain = document.getElementById('chatMain');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const fileInput = document.getElementById('fileInput');
    const filePreviewArea = document.getElementById('filePreviewArea');
    const clearChatBtn = document.getElementById('clearChatBtn');

    // Stores the full conversation history for API requests
    let conversationHistory = [];
    // Stores files selected by the user for the current message
    let currentFiles = [];

    // --- Utility Functions ---

    /**
     * Scrolls the chat container to the bottom.
     */
    const scrollToBottom = () => {
        chatMain.scrollTop = chatMain.scrollHeight;
    };

    /**
     * Displays a message bubble in the chat UI.
     * @param {string} text - The text content of the message.
     * @param {'user'|'ai'} sender - The sender of the message ('user' or 'ai').
     * @param {Array<object>} [imageDataArray=[]] - Array of objects { dataUrl, mimeType } for images.
     */
    const displayMessage = (text, sender, imageDataArray = []) => {
        const bubble = document.createElement('div');
        bubble.classList.add('bubble', `${sender}-message`, 'bubble-enter-animation');

        if (imageDataArray.length > 0) {
            imageDataArray.forEach(imgData => {
                const img = document.createElement('img');
                img.src = imgData.dataUrl;
                img.alt = 'Uploaded Image';
                bubble.appendChild(img);
            });
        }

        const p = document.createElement('p');
        p.textContent = text;
        bubble.appendChild(p);

        chatMain.appendChild(bubble);
        scrollToBottom();
    };

    /**
     * Creates and displays a typing indicator for the AI.
     * @returns {HTMLElement} The typing indicator element.
     */
    const createTypingIndicator = () => {
        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator');
        indicator.innerHTML = '<span></span><span></span><span></span>';
        chatMain.appendChild(indicator);
        scrollToBottom();
        return indicator;
    };

    /**
     * Removes a specific typing indicator from the UI.
     * @param {HTMLElement} indicatorElement - The typing indicator element to remove.
     */
    const removeTypingIndicator = (indicatorElement) => {
        if (indicatorElement && chatMain.contains(indicatorElement)) {
            chatMain.removeChild(indicatorElement);
        }
    };

    /**
     * Converts a File object to a Base64 Data URL.
     * @param {File} file - The file to convert.
     * @returns {Promise<{dataUrl: string, mimeType: string}>} A promise that resolves with the data URL and mime type.
     */
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve({
                    dataUrl: reader.result,
                    mimeType: file.type
                });
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };

    /**
     * Adds a file preview to the UI.
     * @param {string} dataUrl - Base64 data URL of the image.
     * @param {File} file - The original File object.
     */
    const addFilePreview = (dataUrl, file) => {
        const previewDiv = document.createElement('div');
        previewDiv.classList.add('file-preview');
        previewDiv.dataset.fileName = file.name;

        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Preview';
        previewDiv.appendChild(img);

        const removeBtn = document.createElement('button');
        removeBtn.classList.add('remove-file-btn');
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => {
            currentFiles = currentFiles.filter(f => f.name !== file.name);
            fileInput.value = ''; // Clear the input so same file can be re-added if needed
            filePreviewArea.removeChild(previewDiv);
        };
        previewDiv.appendChild(removeBtn);

        filePreviewArea.appendChild(previewDiv);
    };

    // --- Event Handlers ---

    /**
     * Handles sending the user's message and files to the AI.
     */
    const handleSendMessage = async () => {
        const userText = userInput.value.trim();

        if (!userText && currentFiles.length === 0) {
            return; // Don't send empty messages
        }

        // Prepare parts for the current user message
        const userMessageParts = [];
        const userImageDataForDisplay = []; // To display images with user message

        // Add image parts if any
        if (currentFiles.length > 0) {
            sendBtn.disabled = true; // Disable send button during file processing
            try {
                const base64Files = await Promise.all(currentFiles.map(fileToBase64));
                base64Files.forEach(fileData => {
                    userMessageParts.push({
                        inlineData: {
                            mimeType: fileData.mimeType,
                            data: fileData.dataUrl.split(',')[1] // Extract Base64 part
                        }
                    });
                    userImageDataForDisplay.push({
                        dataUrl: fileData.dataUrl,
                        mimeType: fileData.mimeType
                    });
                });
            } catch (error) {
                console.error("Error converting files:", error);
                displayMessage("Error converting files for upload. Please try again.", 'ai');
                sendBtn.disabled = false;
                return;
            } finally {
                sendBtn.disabled = false;
            }
        }

        // Add text part if any
        if (userText) {
            userMessageParts.push({
                text: userText
            });
        }

        // Display user message in UI
        displayMessage(userText, 'user', userImageDataForDisplay);

        // Add user message to conversation history for API
        conversationHistory.push({
            role: 'user',
            parts: userMessageParts
        });

        // Clear input and files immediately after sending
        userInput.value = '';
        currentFiles = [];
        fileInput.value = ''; // Clear the input field
        filePreviewArea.innerHTML = ''; // Clear file previews

        const typingIndicator = createTypingIndicator();
        sendBtn.disabled = true; // Disable send button while AI is typing

        try {
            const requestBody = {
                contents: conversationHistory
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                throw new Error(`API error: ${response.status} - ${errorData.error ? errorData.error.message : 'Unknown error'}`);
            }

            const data = await response.json();
            const aiResponseText = data.candidates[0]?.content?.parts[0]?.text || "Maaf, saya tidak dapat memproses permintaan Anda saat ini.";

            displayMessage(aiResponseText, 'ai');

            // Add AI's response to conversation history
            conversationHistory.push({
                role: 'model',
                parts: [{ text: aiResponseText }]
            });

        } catch (error) {
            console.error("Fetch error:", error);
            displayMessage(`Terjadi kesalahan: ${error.message}. Mohon coba lagi nanti.`, 'ai');
        } finally {
            removeTypingIndicator(typingIndicator);
            sendBtn.disabled = false;
            scrollToBottom();
        }
    };

    /**
     * Handles file input change event.
     * Reads selected files and adds previews.
     */
    const handleFileInputChange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        filePreviewArea.innerHTML = ''; // Clear existing previews
        currentFiles = []; // Reset current files

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                try {
                    const { dataUrl } = await fileToBase64(file);
                    addFilePreview(dataUrl, file);
                    currentFiles.push(file); // Add to currentFiles list
                } catch (error) {
                    console.error("Error reading file:", file.name, error);
                    alert(`Gagal membaca file: ${file.name}.`);
                }
            } else {
                alert(`File ${file.name} bukan format gambar yang didukung. Hanya gambar yang dapat diunggah.`);
            }
        }
    };

    /**
     * Clears all chat messages from the display, but keeps the session history intact.
     */
    const handleClearChat = () => {
        // Remove all child elements except the initial message
        Array.from(chatMain.children).forEach(child => {
            if (!child.classList.contains('initial-message')) {
                chatMain.removeChild(child);
            }
        });
        scrollToBottom(); // Scroll to the initial message
    };

    // --- Event Listeners ---
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Allow Shift+Enter for new line
            e.preventDefault(); // Prevent new line in input
            handleSendMessage();
        }
    });
    fileInput.addEventListener('change', handleFileInputChange);
    clearChatBtn.addEventListener('click', handleClearChat);
});