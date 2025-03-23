document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const themeToggle = document.getElementById('theme-toggle');
    const imageUpload = document.getElementById('image-upload');
    const newChatButton = document.getElementById('new-chat-button');
    let conversationHistory = [];
    let userUploadedImage = null;

    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/>
            </svg>
        `;
    }

    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        
        // Update theme toggle icon
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/>
                </svg>
            `;
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = `
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/>
                    <path d="M9 17h6c.55 0 1-.45 1-1s-.45-1-1-1H9c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/>
                </svg>
            `;
        }
    });

    // Handle image upload
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(event) {
                userUploadedImage = event.target.result;
                // Show preview
                const previewContainer = document.createElement('div');
                previewContainer.id = 'image-preview-container';
                previewContainer.innerHTML = `
                    <img src="${userUploadedImage}" class="image-preview">
                    <button id="remove-image" title="Remove image">×</button>
                `;
                previewContainer.style.position = 'relative';
                previewContainer.style.marginTop = '10px';
                
                const removeBtn = previewContainer.querySelector('#remove-image');
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '5px';
                removeBtn.style.right = '5px';
                removeBtn.style.background = 'rgba(0,0,0,0.5)';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '24px';
                removeBtn.style.height = '24px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.style.fontSize = '16px';
                
                removeBtn.addEventListener('click', () => {
                    previewContainer.remove();
                    userUploadedImage = null;
                    imageUpload.value = '';
                });
                
                const inputWrapper = document.querySelector('.input-wrapper');
                if (document.getElementById('image-preview-container')) {
                    document.getElementById('image-preview-container').remove();
                }
                inputWrapper.appendChild(previewContainer);
            };
            reader.readAsDataURL(file);
        }
    });

    // Auto-resize textarea as user types
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
        
        // Enable/disable send button based on input
        sendButton.disabled = userInput.value.trim() === '' && !userUploadedImage;
    });

    // Allow sending message with Enter key (but Shift+Enter for new line)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (userInput.value.trim() !== '' || userUploadedImage) {
                sendMessage();
            }
        }
    });

    sendButton.addEventListener('click', () => {
        if (userInput.value.trim() !== '' || userUploadedImage) {
            sendMessage();
        }
    });

    // Add welcome message on page load
    const welcomeMessage = `Hello! I'm Josh AI, an advanced AI assistant That Is Made By Deepseek, designed to help you with a wide range of tasks including code generation. Try asking me to write some code for you!`;
    addBotMessage(welcomeMessage);
    conversationHistory.push({
        role: "assistant",
        content: welcomeMessage
    });

    async function sendMessage() {
        const message = userInput.value.trim();
        const hasImage = userUploadedImage !== null;
        
        // Display user message with image if present
        addUserMessage(message, hasImage ? userUploadedImage : null);
        
        // Prepare message content for API
        let messageContent = [];
        if (message) {
            messageContent.push({
                type: "text",
                text: message
            });
        }
        
        if (hasImage) {
            messageContent.push({
                type: "image_url",
                image_url: { url: userUploadedImage }
            });
        }
        
        // Add to conversation history - simplified version for history
        conversationHistory.push({
            role: "user",
            content: message + (hasImage ? " [Image attached]" : "")
        });
        
        // Only keep the last 10 messages to avoid token limits
        conversationHistory = conversationHistory.slice(-10);
        
        // Clear input and image
        userInput.value = '';
        userInput.style.height = 'auto';
        sendButton.disabled = true;
        if (document.getElementById('image-preview-container')) {
            document.getElementById('image-preview-container').remove();
        }
        userUploadedImage = null;
        imageUpload.value = '';
        
        // Show typing indicator
        const typingIndicator = showTypingIndicator();
        
        try {
            // Use real AI to generate response
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are Josh AI, an advanced and capable AI assistant trained on extensive knowledge. You excel at writing and explaining code in any programming language. When asked to write code, provide clean, efficient, and well-documented solutions. If presented with an image, analyze it and incorporate your observations naturally in your response. Always prioritize user safety and provide the most relevant information to their queries And knowd C++ Lua And More."
                    },
                    ...conversationHistory.map(msg => {
                        // Convert history format to API format
                        if (msg.role === "user" && msg.content.includes("[Image attached]")) {
                            // This is a simplification since we can't actually send past images to the API
                            return {
                                role: msg.role,
                                content: msg.content.replace(" [Image attached]", "")
                            };
                        }
                        return msg;
                    })
                ],
                // If current message has an image, use the content array format
                ...(hasImage ? { content: messageContent } : {})
            });

            // Remove typing indicator
            typingIndicator.remove();
            
            // Add AI response to chat
            const aiResponse = completion.content;
            addBotMessage(aiResponse);
            
            // Add to conversation history
            conversationHistory.push({
                role: "assistant",
                content: aiResponse
            });
        } catch (error) {
            // Handle error
            typingIndicator.remove();
            addBotMessage("I'm sorry, I encountered an error processing your request. Please try again.");
            console.error("AI response error:", error);
        }
    }

    function addUserMessage(text, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        
        let messageContent = formatMessage(text);
        if (imageUrl) {
            messageContent += `<img src="${imageUrl}" class="image-preview">`;
        }
        
        messageDiv.innerHTML = `
            <div class="avatar user-avatar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
            </div>
            <div class="message-content">${messageContent}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        messageDiv.innerHTML = `
            <div class="avatar bot-avatar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58 3.51-3.47 9.14-3.47 12.65 0L21 3v7.12z"/>
                </svg>
            </div>
            <div class="message-content">${formatMessage(text)}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        
        typingDiv.innerHTML = `
            <div class="avatar bot-avatar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58 3.51-3.47 9.14-3.47 12.65 0L21 3v7.12z"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
        return typingDiv;
    }

    function formatMessage(text) {
        if (!text) return '';
        
        // Enhanced code block handling with syntax highlighting
        let formattedText = text.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, function(match, language, code) {
            const lines = code.split('\n');
            const numberedLines = lines.map((line, i) => 
                `<span class="line-number">${i + 1}</span>${line}`
            ).join('\n');
            
            return `
                <div class="code-block ${language}">
                    <div class="code-header">
                        ${language || 'Code'}
                        <div class="code-actions">
                            <button class="copy-button">Copy</button>
                        </div>
                    </div>
                    <pre><code>${numberedLines}</code></pre>
                </div>`;
        });
        
        // Handle code blocks without language specification
        formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<div class="code-block"><div class="code-header">Code<button class="copy-button">Copy</button></div><pre>$1</pre></div>');
        
        // Handle inline code with `
        formattedText = formattedText.replace(/`([^`]+)`/g, '<code style="background-color:var(--code-bg);padding:2px 4px;border-radius:3px;font-family:monospace;">$1</code>');
        
        // Handle bold text with **
        formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Handle italic text with *
        formattedText = formattedText.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Handle URLs
        formattedText = formattedText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--primary-color);text-decoration:underline;">$1</a>');
        
        // Handle line breaks
        formattedText = formattedText.replace(/\n/g, '<br>');
        
        return formattedText;
    }

    function scrollToBottom() {
        const lastMessage = chatMessages.lastElementChild;
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    // New chat button functionality
    newChatButton.addEventListener('click', () => {
        // Clear chat history
        conversationHistory = [];
        
        // Clear chat messages
        chatMessages.innerHTML = '';
        
        // Reset input field
        userInput.value = '';
        userInput.style.height = 'auto';
        sendButton.disabled = true;
        
        // Clear image upload if any
        if (document.getElementById('image-preview-container')) {
            document.getElementById('image-preview-container').remove();
        }
        userUploadedImage = null;
        imageUpload.value = '';
        
        // Add welcome message
        const welcomeMessage = `Hello! I'm JoshAI, an advanced AI assistant that is made by deepseek,designed to help you with a wide range of tasks including code generation. Try asking me to write some code for you!`;
        addBotMessage(welcomeMessage);
        conversationHistory.push({
            role: "assistant",
            content: welcomeMessage
        });
    });

    chatMessages.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-button')) {
            const codeBlock = e.target.closest('.code-block');
            const code = codeBlock.querySelector('pre').innerText;
            
            navigator.clipboard.writeText(code).then(() => {
                const originalText = e.target.innerText;
                e.target.innerText = 'Copied!';
                e.target.style.backgroundColor = 'var(--primary-color)';
                e.target.style.color = 'white';
                
                setTimeout(() => {
                    e.target.innerText = originalText;
                    e.target.style.backgroundColor = '';
                    e.target.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
            });
        }
    });

    // Add Quick Actions
    const quickActionsDiv = document.createElement('div');
    quickActionsDiv.className = 'quick-actions';
    quickActionsDiv.innerHTML = `
        <button class="quick-action-btn">Code Help</button>
        <button class="quick-action-btn">Explanations</button>
        <button class="quick-action-btn">Debug Help</button>
        <button class="quick-action-btn">Optimization</button>
        <button class="quick-action-btn">Code Convert</button>
    `;
    chatMessages.parentNode.insertBefore(quickActionsDiv, chatMessages);

    // Add click handlers for quick actions
    const quickActionButtons = quickActionsDiv.querySelectorAll('.quick-action-btn');
    const quickActionPrefixes = [
        'Write a function that...',
        'Explain how...',
        'Debug this code...',
        'Optimize this...',
        'Convert this code to...'
    ];

    quickActionButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            userInput.value = quickActionPrefixes[index];
            userInput.focus();
            userInput.setSelectionRange(userInput.value.length, userInput.value.length);
        });
    });
});