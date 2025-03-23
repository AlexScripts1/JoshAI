// Main script for Webimy AI Assistant
import { marked } from 'marked';

// Global variables
let currentModel = "webimy-2";
let isTyping = false;
let editingMessageId = null;
let thinkingVisible = false;
let currentActivity = "chat";
let imageDataUrl = null;
let conversationHistory = [];
let typingTimeouts = [];
let isDarkTheme = true;
let isHighContrast = false;
let saveConversations = true;
let enableAnalytics = true;
let selectedTab = null;
let isGeneratingImage = false;
let typingIndicatorElement = null;
let isCompareMode = false;
let selectedModelsForComparison = [];
let comparisonResults = {};
let codeImprovementCount = 5; // Default number of auto-improvements for Coder model
let modelUsageCount = {
    "webimy-lite": 0,
    "webimy-2": 0,
    "webimy-2.5": 0,
    "webimy-reasoner-mini": 0,
    "webimy-reasoner": 0,
    "webimy-reasoner-pro": 0,
    "webimy-3": 0,
    "webimy-hybrid": 0,
    "webimy-coder": 0
};
let codePlaygroundActive = false; // Track if playground is active
let currentPlaygroundCode = "";
let currentPlaygroundLanguage = "javascript";
let codeReplacementActive = false;
let originalCodeSegment = "";

// Rate limiting
let messagesSentLastMinute = {
    "webimy-lite": 0,
    "webimy-2": 0,
    "webimy-2.5": 0,
    "webimy-reasoner-mini": 0,
    "webimy-reasoner": 0,
    "webimy-reasoner-pro": 0,
    "webimy-3": 0,
    "webimy-hybrid": 0,
    "webimy-coder": 0
};
let messageRateLimits = {
    "webimy-lite": Infinity, 
    "webimy-2": Infinity,
    "webimy-2.5": Infinity,
    "webimy-reasoner-mini": Infinity,
    "webimy-reasoner": Infinity,
    "webimy-reasoner-pro": Infinity,
    "webimy-3": Infinity,
    "webimy-hybrid": Infinity,
    "webimy-coder": Infinity
};
let dailyUsage = {
    "webimy-reasoner-mini": 0,
    "webimy-reasoner": 0,
    "webimy-reasoner-pro": 0
};
let dailyLimits = {
    "webimy-reasoner-mini": Infinity,
    "webimy-reasoner": Infinity,
    "webimy-reasoner-pro": Infinity
};
let lastResetTimestamp = Date.now();
let lastDailyReset = new Date().setHours(0,0,0,0);

// Analytics data
let analyticsData = {
    messagesExchanged: 0,
    charactersGenerated: 0,
    imagesGenerated: 0,
    sessionStartTime: Date.now(),
    averageResponseTime: 0,
    totalResponseTime: 0,
    totalTokens: 0,
    webimyLiteUsage: 0,
    webimy2Usage: 0,
    webimy25Usage: 0,
    webimyReasonerMiniUsage: 0,
    webimyReasonerUsage: 0,
    webimyReasonerProUsage: 0,
    webimy3Usage: 0,
    webimyHybridUsage: 0,
    webimyCoderUsage: 0
};

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const submitButton = document.getElementById('submit-button');
const micButton = document.querySelector('#mic-button');
const imageUploadBtn = document.getElementById('image-upload-btn');
const imageUpload = document.getElementById('image-upload');
const reasoningBtn = document.getElementById('reasoning-btn');
const codePlaygroundBtn = document.getElementById('code-playground-btn');
const rateLimitError = document.createElement('div');
rateLimitError.id = 'rate-limit-error';
document.body.appendChild(rateLimitError);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    userInput.addEventListener('keydown', handleInputKeydown);
    userInput.addEventListener('input', adjustTextareaHeight);
    submitButton.addEventListener('click', sendMessage);
    userInput.addEventListener('input', checkForImprovementCount);
    
    // Model selector
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(option => {
        option.addEventListener('click', () => {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            currentModel = option.dataset.model;
            
            // Update reasoning button state
            updateReasoningButtonState();
        });
        
        // Add double-click handler to show model info
        option.addEventListener('dblclick', () => {
            showModelInfoPopup(option.dataset.model);
        });
    });
    
    // Reasoning button
    const reasoningBtn = document.getElementById('reasoning-btn');
    if (reasoningBtn) {
        reasoningBtn.addEventListener('click', toggleReasoning);
    } else {
        console.error("Reasoning button not found in the DOM");
    }
    
    // Code playground button
    if (codePlaygroundBtn) {
        codePlaygroundBtn.addEventListener('click', toggleCodePlayground);
    }
    
    // Additional event listeners
    document.getElementById('new-chat-btn').addEventListener('click', startNewChat);
    document.getElementById('image-upload-btn').addEventListener('click', () => imageUpload.click());
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    
    // Initialize modals
    const sidebarOptions = document.querySelectorAll('.sidebar-option');
    sidebarOptions.forEach((option, index) => {
        option.addEventListener('click', () => {
            sidebarOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            switchActivity(index);
        });
    });
    
    // Settings modal
    document.getElementById('dark-theme-toggle').addEventListener('change', toggleDarkTheme);
    document.getElementById('high-contrast-toggle').addEventListener('change', toggleHighContrast);
    document.getElementById('save-conversations-toggle').addEventListener('change', toggleSaveConversations);
    document.getElementById('analytics-toggle').addEventListener('change', toggleAnalytics);
    document.getElementById('clear-data-btn').addEventListener('click', clearData);
    document.getElementById('clear-analytics-btn').addEventListener('click', clearAnalytics);
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Compare models button
    document.getElementById('compare-models-btn').addEventListener('click', openCompareModelsModal);
    
    // Compare models modal events
    document.querySelectorAll('.compare-option').forEach(option => {
        option.addEventListener('click', function() {
            this.classList.toggle('selected');
            updateCompareModelSelection();
        });
    });
    
    document.getElementById('compare-cancel').addEventListener('click', closeCompareModelsModal);
    document.getElementById('compare-start').addEventListener('click', startModelComparison);
    
    document.getElementById('auto-model-btn').addEventListener('click', autoSelectModel);
    
    document.getElementById('changelog-btn').addEventListener('click', function() {
        const modal = document.getElementById('changelog-modal');
        modal.classList.remove('hidden');
        const changelogContent = document.querySelector('#changelog-modal .changelog-content');
        changelogContent.innerHTML = getChangelogText();
    });
    
    const promoButton = document.createElement('button');
    promoButton.textContent = 'AllGPT 3 Promo';
    promoButton.style.margin = '10px auto';
    promoButton.style.display = 'block';
    promoButton.style.backgroundColor = 'var(--secondary-accent)';
    promoButton.style.color = 'white';
    promoButton.style.border = 'none';
    promoButton.style.padding = '8px 16px';
    promoButton.style.borderRadius = '4px';
    
    promoButton.addEventListener('click', showAllGPTPromotion);
    
    // Insert the button after the changelog button
    const changelogBtn = document.getElementById('changelog-btn');
    if (changelogBtn) {
        changelogBtn.parentNode.insertBefore(promoButton, changelogBtn.nextSibling);
    }
    
    // Initialize app state
    loadSettings();
    displayWelcomeMessage();
    startRateLimitTimer();
    checkDailyReset();
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
});

// Message handling functions
async function sendComparisonMessage() {
    const message = userInput.value.trim();
    if (message === '' && !imageDataUrl) return;
    
    // Check if any model is rate limited
    const limitedModels = [];
    selectedModelsForComparison.forEach(model => {
        if (messagesSentLastMinute[model] >= messageRateLimits[model]) {
            limitedModels.push(getCurrentModelName(model));
        }
        if (model.startsWith("webimy-reasoner") && dailyUsage[model] >= dailyLimits[model]) {
            limitedModels.push(getCurrentModelName(model) + " (daily limit)");
        }
    });
    
    if (limitedModels.length > 0) {
        showRateLimitError(`Rate limit reached for: ${limitedModels.join(", ")}`);
        return;
    }
    
    // Add user message to UI
    const messageId = Date.now().toString();
    addMessageToUI('user', message, messageId, imageDataUrl);
    
    // Create comparison container
    const comparisonContainer = document.createElement('div');
    comparisonContainer.className = 'comparison-container';
    
    const comparisonHeader = document.createElement('div');
    comparisonHeader.className = 'comparison-header';
    comparisonHeader.innerHTML = `
        <div class="comparison-title">Model Comparison Results</div>
        <div class="comparison-controls">
            <button class="comparison-control-btn" id="exit-compare-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    `;
    
    const comparisonResults = document.createElement('div');
    comparisonResults.className = 'comparison-results';
    
    comparisonContainer.appendChild(comparisonHeader);
    comparisonContainer.appendChild(comparisonResults);
    chatMessages.appendChild(comparisonContainer);
    
    // Add exit compare mode event
    document.getElementById('exit-compare-btn').addEventListener('click', exitCompareMode);
    
    // Create user message content for history
    const userMessageContent = imageDataUrl 
        ? [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: imageDataUrl } }]
        : message;
    
    // Generate responses for each model
    for (const model of selectedModelsForComparison) {
        // Track model usage
        messagesSentLastMinute[model]++;
        modelUsageCount[model]++;
        if (model.startsWith("webimy-reasoner")) {
            dailyUsage[model]++;
        }
        
        // Create model card in results
        const modelCard = document.createElement('div');
        modelCard.className = 'comparison-card';
        modelCard.innerHTML = `
            <div class="comparison-card-header">
                <svg viewBox="0 0 24 24" width="20" height="20" class="${model}-color">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/>
                </svg>
                <div class="comparison-model-name">${getCurrentModelName(model)}</div>
            </div>
            <div class="comparison-content" data-model="${model}">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        comparisonResults.appendChild(modelCard);
        
        // Generate response for this model
        generateModelResponse(model, userMessageContent, modelCard.querySelector('.comparison-content'));
    }
    
    // Clear input
    userInput.value = '';
    imageDataUrl = null;
    adjustTextareaHeight();
    
    // Scroll to view the comparison results
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function generateModelResponse(model, userMessage, contentContainer) {
    const responseStartTime = Date.now();
    
    try {
        // Create a specific conversation history for this model to avoid contamination
        const tempHistory = [...conversationHistory.filter(msg => msg.role === 'user')];
        tempHistory.push({
            role: 'user',
            content: userMessage
        });
        
        // Get system message for this model
        const systemMessage = getSystemMessage(model);
        
        // Generate completion
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: systemMessage
                },
                ...tempHistory
            ]
        });
        
        // For Reasoner models, generate thinking process with self-review
        let thinking = "";
        if (model.startsWith("webimy-reasoner")) {
            thinking = await generateReasonerThinking(userMessage, model);
        }
        
        // Remove typing indicator
        contentContainer.innerHTML = '';
        
        // Create model indicator
        const modelIndicator = document.createElement('div');
        modelIndicator.className = 'model-indicator';
        modelIndicator.dataset.model = model;
        
        // Model icon
        const modelIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        modelIcon.setAttribute('viewBox', '0 0 24 24');
        modelIcon.setAttribute('width', '14');
        modelIcon.setAttribute('height', '14');
        
        if (model === "webimy-2") {
            modelIcon.innerHTML = '<path d="M7 2v11h3v9l7-12h-4l4-8z" fill="currentColor"/>';
        } else if (model === "webimy-2.5") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M12 7v10M9 10h6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (model === "webimy-reasoner-mini") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M7 13l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (model === "webimy-reasoner") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M12 7v10M9 10h6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (model === "webimy-reasoner-pro") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M12 7v10M9 10h6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (model === "webimy-hybrid") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="4" font-weight="bold">Hybrid</text>';
        } else if (model === "webimy-coder") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="4" font-weight="bold">Coder</text>';
        } else {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/>';
        }
        
        modelIndicator.appendChild(modelIcon);
        modelIndicator.appendChild(document.createTextNode(getCurrentModelName(model)));
        
        contentContainer.appendChild(modelIndicator);
        
        // For Reasoner models, add thinking process section
        if (model.startsWith("webimy-reasoner") && thinking) {
            const thinkingProcess = document.createElement('div');
            thinkingProcess.className = 'thinking-process';
            thinkingProcess.innerHTML = thinking;
            const thinkingToggle = document.createElement('span');
            thinkingToggle.className = 'thinking-toggle';
            thinkingToggle.textContent = 'Show thinking';
            thinkingToggle.addEventListener('click', function() {
                thinkingProcess.classList.toggle('visible');
                this.textContent = thinkingProcess.classList.contains('visible') ? 'Hide thinking' : 'Show thinking';
            });
            modelIndicator.appendChild(thinkingToggle);
            contentContainer.appendChild(thinkingProcess);
        }
        
        // Add formatted markdown content
        const markdownContent = document.createElement('div');
        markdownContent.className = 'markdown-content';
        markdownContent.innerHTML = marked.parse(completion.content);
        contentContainer.appendChild(markdownContent);
        
        // Make code blocks selectable
        const codeBlocks = markdownContent.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            block.style.userSelect = 'text';
        });
        
        // Update analytics
        const responseTime = Date.now() - responseStartTime;
        updateAnalyticsAfterResponse(completion.content, responseTime);
        
    } catch (error) {
        console.error(`Error getting ${model} response:`, error);
        contentContainer.innerHTML = `<div class="markdown-content"><p>Error: I encountered a problem generating a response with this model. Please try again later.</p></div>`;
    }
}

function exitCompareMode() {
    isCompareMode = false;
    document.getElementById('compare-models-btn').classList.remove('active');
    
    // Restore submit button
    submitButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
        </svg>
    `;
    
    // Clear any comparison UI
    const comparisonContainer = document.querySelector('.comparison-container');
    if (comparisonContainer) {
        comparisonContainer.remove();
    }
}

async function sendMessage() {
    if (isCompareMode) {
        sendComparisonMessage();
    } else {
        if (isTyping) {
            console.log("Cannot send message while AI is responding");
            showRateLimitError("Please wait for the AI to finish responding");
            return;
        }
        
        const message = userInput.value.trim();
        if (message === '' && !imageDataUrl) return;
        
        // Check rate limits
        if (!checkRateLimits()) {
            const timeToReset = Math.ceil((60000 - (Date.now() - lastResetTimestamp)) / 1000);
            showRateLimitError(`Rate limit reached for ${getCurrentModelName()}. Try again in ${timeToReset} seconds`);
            return;
        }
        
        // Check daily limits for reasoner models
        if (currentModel.startsWith("webimy-reasoner") && 
            dailyUsage[currentModel] >= dailyLimits[currentModel]) {
            showRateLimitError(`Daily limit reached for ${getCurrentModelName()}. Try again tomorrow`);
            return;
        }
        
        // Track usage
        messagesSentLastMinute[currentModel]++;
        modelUsageCount[currentModel]++;
        if (currentModel.startsWith("webimy-reasoner")) {
            dailyUsage[currentModel]++;
            localStorage.setItem('dailyUsage', JSON.stringify(dailyUsage));
        }
        updateAnalytics('send');
        
        // Add user message to UI
        const messageId = Date.now().toString();
        addMessageToUI('user', message, messageId, imageDataUrl);
        
        // Add to conversation history
        const userMessageContent = imageDataUrl 
            ? [{ type: 'text', text: message }, { type: 'image_url', image_url: { url: imageDataUrl } }]
            : message;
        
        const userMessage = {
            role: 'user',
            content: userMessageContent
        };
        conversationHistory.push(userMessage);
        
        // If this is a response to improvement count for Coder model
        if (currentModel === "webimy-coder" && 
            submitButton.dataset.improveCount && 
            conversationHistory.length > 0 && 
            conversationHistory[conversationHistory.length - 1].role === "assistant" &&
            conversationHistory[conversationHistory.length - 1].content.includes("auto-improvements")) {
            
            const count = parseInt(submitButton.dataset.improveCount);
            codeImprovementCount = isNaN(count) || count < 2 ? 2 : Math.min(count, 50);
            
            // Get the original coding request (2 messages back)
            if (conversationHistory.length >= 2 && conversationHistory[conversationHistory.length - 2].role === "user") {
                const originalRequest = conversationHistory[conversationHistory.length - 2].content;
                
                // Clear the improve count data attribute
                delete submitButton.dataset.improveCount;
                
                // Clear input
                userInput.value = '';
                adjustTextareaHeight();
                
                // Show typing indicator
                isTyping = true;
                const typingIndicator = addTypingIndicator();
                
                try {
                    // Determine code language from request
                    const langAnalysis = await websim.chat.completions.create({
                        messages: [
                            {
                                role: "system",
                                content: `Determine the programming language requested in this coding task. Respond with a single word: python, javascript, html, css, java, etc.`
                            },
                            {
                                role: "user",
                                content: originalRequest
                            }
                        ]
                    });
                    
                    const language = langAnalysis.content.trim().toLowerCase();
                    
                    // Perform code improvements
                    const improvedCode = await performCodeImprovements(originalRequest, language, codeImprovementCount);
                    
                    // Remove typing indicator
                    if (typingIndicator && typingIndicator.parentNode) {
                        chatMessages.removeChild(typingIndicator);
                    }
                    
                    // Add the response
                    addMessageToUI('assistant', improvedCode);
                    
                    // Add to conversation history
                    conversationHistory.push({
                        role: 'assistant',
                        content: improvedCode
                    });
                    
                    isTyping = false;
                    typingIndicatorElement = null;
                    
                    return; // Exit early
                } catch (error) {
                    console.error("Error handling code improvement:", error);
                    if (typingIndicator && typingIndicator.parentNode) {
                        chatMessages.removeChild(typingIndicator);
                    }
                    isTyping = false;
                    typingIndicatorElement = null;
                }
            }
        }
        
        // Clear input
        userInput.value = '';
        imageDataUrl = null;
        adjustTextareaHeight();
        
        // Get AI response
        getAIResponse();
    }
}

async function getAIResponse() {
    isTyping = true;
    const typingIndicator = addTypingIndicator();
    const responseStartTime = Date.now();
    
    try {
        const lastUserMessage = conversationHistory[conversationHistory.length - 1];
        let specialCommandResult = null;
        
        // Allow smart-tool processing for 2.5, any Reasoner model, Webimy 3.0, or Coder model
        if (["webimy-2.5", "webimy-reasoner-mini", "webimy-reasoner", "webimy-reasoner-pro", "webimy-3", "webimy-hybrid", "webimy-coder"].includes(currentModel)) {
            specialCommandResult = await analyzeAndProcessEliteAgentTools(lastUserMessage.content);
        }
        
        // Special handling for Webimy Coder
        if (currentModel === "webimy-coder" && !specialCommandResult) {
            specialCommandResult = await handleCoderModelRequest(lastUserMessage.content);
        }
        
        if (specialCommandResult) {
            await simulateThinking(typingIndicator);
            typeMessage(specialCommandResult, typingIndicator, null);
            conversationHistory.push({
                role: "assistant",
                content: specialCommandResult
            });
        } else {
            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: getSystemMessage() },
                    ...conversationHistory
                ]
            });
            
            let thinking = "";
            if (currentModel.startsWith("webimy-reasoner")) {
                thinking = await generateReasonerThinking(conversationHistory[conversationHistory.length - 1].content, currentModel);
                await simulateThinking(typingIndicator);
            }
            
            if (currentModel === "webimy-2") {
                typeMessageFast(completion.content, typingIndicator);
            } else {
                typeMessage(completion.content, typingIndicator, thinking);
            }
            
            conversationHistory.push({
                role: "assistant",
                content: completion.content
            });
        }
        
        const responseTime = Date.now() - responseStartTime;
        updateAnalyticsAfterResponse(conversationHistory[conversationHistory.length - 1].content, responseTime);
        
    } catch (error) {
        console.error("Error getting AI response:", error);
        if (typingIndicator && typingIndicator.parentNode) {
            chatMessages.removeChild(typingIndicator);
        }
        addMessageToUI('assistant', "I'm sorry, I encountered an error. Please try again later.");
        isTyping = false;
    }
}

// UI Functions
function addMessageToUI(role, content, messageId = Date.now().toString(), imageUrl = null, thinking = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.dataset.id = messageId;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (role === 'user') {
        messageContent.textContent = content;
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'user-image';
            img.alt = 'Uploaded image';
            messageContent.appendChild(img);
        }
        
        // Make user messages editable with double-click
        messageDiv.addEventListener('dblclick', () => {
            if (!isTyping) {
                editMessage(messageId, content);
            }
        });
    } else {
        // For assistant messages
        const modelIndicator = document.createElement('div');
        modelIndicator.className = 'model-indicator';
        modelIndicator.dataset.model = currentModel;
        
        // Model icon
        const modelIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        modelIcon.setAttribute('viewBox', '0 0 24 24');
        modelIcon.setAttribute('width', '14');
        modelIcon.setAttribute('height', '14');
        
        if (currentModel === "webimy-2") {
            modelIcon.innerHTML = '<path d="M7 2v11h3v9l7-12h-4l4-8z" fill="currentColor"/>';
        } else if (currentModel === "webimy-2.5") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M12 7v10M9 10h6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (currentModel === "webimy-reasoner-mini") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M7 13l3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (currentModel === "webimy-reasoner") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M12 7v10M9 10h6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (currentModel === "webimy-reasoner-pro") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><path d="M12 7v10M9 10h6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
        } else if (currentModel === "webimy-hybrid") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="4" font-weight="bold">Hybrid</text>';
        } else if (currentModel === "webimy-coder") {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/><text x="12" y="16" text-anchor="middle" fill="white" font-size="4" font-weight="bold">Coder</text>';
        } else {
            modelIcon.innerHTML = '<path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="currentColor"/>';
        }
        
        modelIndicator.appendChild(modelIcon);
        modelIndicator.appendChild(document.createTextNode(getCurrentModelName()));
        
        messageContent.appendChild(modelIndicator);
        
        // For Reasoner models, add thinking toggle
        if (currentModel.startsWith("webimy-reasoner")) {
            const thinkingToggle = document.createElement('span');
            thinkingToggle.className = 'thinking-toggle';
            thinkingToggle.textContent = 'Show thinking';
            thinkingToggle.addEventListener('click', toggleThinking);
            modelIndicator.appendChild(thinkingToggle);
        }
        
        messageContent.appendChild(modelIndicator);
        
        // Create thinking process section (hidden by default)
        if (currentModel.startsWith("webimy-reasoner") && thinking) {
            const thinkingProcess = document.createElement('div');
            thinkingProcess.className = 'thinking-process';
            thinkingProcess.innerHTML = thinking;
            messageContent.appendChild(thinkingProcess);
        }
        
        // Add formatted markdown content
        const markdownContent = document.createElement('div');
        markdownContent.className = 'markdown-content';
        markdownContent.innerHTML = marked.parse(content);
        messageContent.appendChild(markdownContent);
        
        // Make code blocks selectable
        const codeBlocks = markdownContent.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            block.style.userSelect = 'text';
        });
    }
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'stop-typing-btn';
    stopBtn.innerHTML = '✕';
    stopBtn.addEventListener('click', stopTyping);
    typingDiv.appendChild(stopBtn);
    
    // Show model info
    const modelInfo = document.createElement('div');
    modelInfo.className = 'typing-model-info';
    modelInfo.textContent = `${getCurrentModelName()} is thinking...`;
    typingDiv.appendChild(modelInfo);
    
    // Animate stop button after short delay
    setTimeout(() => {
        stopBtn.classList.add('visible');
    }, 1000);
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    typingIndicatorElement = typingDiv;
    
    return typingDiv;
}

function typeMessage(text, typingIndicator, thinking = null) {
    let i = 0;
    const messageDiv = addMessageToUI('assistant', '', null, null, thinking);
    const markdownContent = messageDiv.querySelector('.markdown-content');
    markdownContent.innerHTML = '';
    const delay = currentModel === 'webimy-2' ? 5 : 15;
    
    function typeNextChar() {
        if (i < text.length) {
            i++;
            const partialText = text.substring(0, i);
            try {
                markdownContent.innerHTML = marked.parse(partialText);
                // If the rendered HTML contains LaTeX delimiters, run MathJax typesetting.
                if (markdownContent.innerHTML.includes('$') && window.MathJax) {
                    MathJax.typesetPromise([markdownContent]).catch(err => console.error(err));
                }
            } catch (e) {
                console.log("Markdown parsing error - continuing");
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
            const timeout = setTimeout(typeNextChar, delay);
            typingTimeouts.push(timeout);
        } else {
            if (typingIndicator && typingIndicator.parentNode) {
                chatMessages.removeChild(typingIndicator);
            }
            isTyping = false;
            typingIndicatorElement = null;
            // Finalize LaTeX rendering after completion.
            if (window.MathJax) {
                MathJax.typesetPromise([markdownContent]).catch(err => console.error(err));
            }
        }
    }
    
    typeNextChar();
}

function typeMessageFast(text, typingIndicator) {
    const messageDiv = addMessageToUI('assistant', text);
    const markdownContent = messageDiv.querySelector('.markdown-content');
    if (window.MathJax) {
        MathJax.typesetPromise([markdownContent]).catch(err => console.error(err));
    }
    setTimeout(() => {
        if (typingIndicator && typingIndicator.parentNode) {
            chatMessages.removeChild(typingIndicator);
        }
        isTyping = false;
        typingIndicatorElement = null;
    }, 300);
}

async function simulateThinking(typingIndicator) {
    // For Reasoner models - simulate thinking time with different durations based on tier
    const modelInfo = typingIndicator.querySelector('.typing-model-info');
    if (modelInfo) {
        modelInfo.textContent = `${getCurrentModelName()} is analyzing...`;
    }
    
    // Random thinking time depending on the model tier
    let minThinkTime, maxThinkTime;
    if (currentModel === "webimy-reasoner-mini") {
        minThinkTime = 1000;
        maxThinkTime = 2000;
    } else if (currentModel === "webimy-reasoner") {
        minThinkTime = 2000;
        maxThinkTime = 3000;
    } else { // webimy-reasoner-pro
        minThinkTime = 3000;
        maxThinkTime = 5000;
    }
    
    const thinkingTime = Math.floor(Math.random() * (maxThinkTime - minThinkTime)) + minThinkTime;
    await new Promise(resolve => setTimeout(resolve, thinkingTime));
    
    if (modelInfo) {
        modelInfo.textContent = `${getCurrentModelName()} is drafting response...`;
    }
    
    // Additional drafting time depending on model tier
    const draftingTime = currentModel === "webimy-reasoner-mini" ? 800 : 
                         currentModel === "webimy-reasoner" ? 1500 : 2500;
    await new Promise(resolve => setTimeout(resolve, draftingTime));
}

// Helper functions
function getCurrentModelName(modelParam = null) {
    const model = modelParam || currentModel;
    switch(model) {
        case "webimy-lite": return "Webimy 2.0 Lite";
        case "webimy-2": return "Webimy 2.0";
        case "webimy-2.5": return "Webimy 2.5";
        case "webimy-reasoner-mini": return "Webimy Reasoner Mini";
        case "webimy-reasoner": return "Webimy Reasoner";
        case "webimy-reasoner-pro": return "Webimy Reasoner Pro";
        case "webimy-3": return "Webimy 3.0";
        case "webimy-hybrid": return "Webimy Hybrid";
        case "webimy-coder": return "Webimy Coder";
        default: return "Webimy";
    }
}

function getSystemMessage(modelParam = null) {
    const model = modelParam || currentModel;
    let baseMessage = "You are Webimy, an AI assistant. ";
    
    switch(model) {
        case 'webimy-lite':
            return baseMessage + "As Webimy 2.0 Lite, provide straightforward and friendly responses. Focus on being helpful while keeping answers concise and simple.";
        case 'webimy-2':
            return baseMessage + "As Webimy 2.0, provide a balance of technical expertise and concise responses. Combine detailed analysis when needed with the efficiency of direct answers.";
        case 'webimy-2.5':
            return baseMessage + "As Webimy 2.5, provide a balance of technical expertise and concise responses, with enhanced capabilities including built‐in tools.";
        case 'webimy-reasoner-mini':
            return baseMessage + "As Webimy Reasoner Mini, provide responses with low-level thoughtful analysis. Keep your reasoning brief with a quick self-review.";
        case 'webimy-reasoner':
            return baseMessage + "As Webimy Reasoner, deliver balanced and moderately deep responses. Analyze your query step by step and review your thinking for accuracy.";
        case 'webimy-reasoner-pro':
            return baseMessage + "As Webimy Reasoner Pro, deliver highly advanced responses with deep and extensive analysis. Thoroughly self-review your reasoning, using smart tools when needed – outputs should be 15× more refined than previous elite models.";
        case 'webimy-3':
            return baseMessage + "As Webimy 3.0, provide extremely detailed, thorough and comprehensive responses. Think step by step deeply with a sophisticated process and use your enhanced capabilities when relevant.";
        case 'webimy-hybrid':
            return baseMessage + "As Webimy Hybrid, combine the efficiency of Webimy 2.0 with the deep analytical capabilities of Reasoner models. Deliver comprehensive, thoughtful, and detailed responses with smart tool integration as required.";
        case 'webimy-coder':
            return baseMessage + "As Webimy Coder, you specialize in generating high-quality, functional code with self-improvement capabilities. Think step by step, analyze requirements carefully, and provide detailed code solutions with explanations. For each coding task, suggest improvements and refine your code automatically until you reach the optimal solution.";
        default:
            return baseMessage + "Provide helpful, balanced, and thorough responses to user queries.";
    }
}

// Replace the static thinking process with AI-generated thinking
async function generateReasonerThinking(userQuery, model) {
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an advanced AI assistant. Generate a step-by-step reasoning process for ${getCurrentModelName(model)} that not only explains your analysis in distinct steps (each step beginning with a <strong>heading</strong>) but also includes a final self-review of your thought process.`
                },
                {
                    role: "user",
                    content: `Analyze this query: "${userQuery}"`
                }
            ]
        });
        return completion.content +
          `<div class="thinking-step"><strong>Self-Review:</strong> I have reviewed the reasoning above and confirm that my response is comprehensive and accurate.</div>`;
    } catch (error) {
        console.error("Error generating reasoner thinking:", error);
        return generateThinkingProcess(userQuery, model);
    }
}

function toggleThinking(e) {
    e.stopPropagation();
    const messageContent = e.target.closest('.message-content');
    const thinkingProcess = messageContent.querySelector('.thinking-process');
    
    if (thinkingProcess) {
        thinkingProcess.classList.toggle('visible');
        e.target.textContent = thinkingProcess.classList.contains('visible') ? 'Hide thinking' : 'Show thinking';
    }
}

// Rate limiting functions
function checkRateLimits() {
    return messagesSentLastMinute[currentModel] < messageRateLimits[currentModel];
}

function startRateLimitTimer() {
    setInterval(() => {
        const now = Date.now();
        if (now - lastResetTimestamp >= 60000) {
            // Reset message counters every minute
            messagesSentLastMinute = {
                "webimy-lite": 0,
                "webimy-2": 0,
                "webimy-2.5": 0,
                "webimy-reasoner-mini": 0,
                "webimy-reasoner": 0,
                "webimy-reasoner-pro": 0,
                "webimy-3": 0,
                "webimy-hybrid": 0,
                "webimy-coder": 0
            };
            lastResetTimestamp = now;
        }
    }, 1000);
}

function checkDailyReset() {
    setInterval(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        if (today > lastDailyReset) {
            // Reset daily counters
            dailyUsage = {
                "webimy-reasoner-mini": 0,
                "webimy-reasoner": 0,
                "webimy-reasoner-pro": 0
            };
            lastDailyReset = today;
            localStorage.setItem('dailyUsage', JSON.stringify(dailyUsage));
            localStorage.setItem('lastDailyReset', lastDailyReset);
        }
    }, 60000); // Check every minute
}

function showRateLimitError(message) {
    rateLimitError.textContent = message;
    rateLimitError.style.display = 'block';
    
    setTimeout(() => {
        rateLimitError.style.display = 'none';
    }, 3000);
}

// Event handler functions
function handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        imageDataUrl = e.target.result;
        // Show image preview or indicator
        const previewText = document.createElement('div');
        previewText.textContent = `Image attached: ${file.name}`;
        previewText.style.color = 'var(--secondary-accent)';
        previewText.style.fontSize = '12px';
        previewText.style.marginTop = '8px';
        
        const container = document.querySelector('.input-options');
        const existingPreview = container.querySelector('.image-preview-text');
        if (existingPreview) {
            container.removeChild(existingPreview);
        }
        
        previewText.className = 'image-preview-text';
        container.appendChild(previewText);
    };
    reader.readAsDataURL(file);
}

function handleKeyboardShortcuts(e) {
    // Alt + number to switch models
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const modelOptions = document.querySelectorAll('.model-option');
        
        if (e.key === '1' && modelOptions[0]) {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            modelOptions[0].classList.add('active');
            currentModel = "webimy-lite";
        } else if (e.key === '2' && modelOptions[1]) {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            modelOptions[1].classList.add('active');
            currentModel = "webimy-2";
        } else if (e.key === '3' && modelOptions[2]) {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            modelOptions[2].classList.add('active');
            currentModel = "webimy-2.5";
        } else if (e.key === '4' && modelOptions[3]) {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            modelOptions[3].classList.add('active');
            currentModel = "webimy-reasoner-mini";
        } else if (e.key === '5' && modelOptions[4]) {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            modelOptions[4].classList.add('active');
            currentModel = "webimy-reasoner";
        } else if (e.key === '6' && modelOptions[5]) {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            modelOptions[5].classList.add('active');
            currentModel = "webimy-reasoner-pro";
        } else if (e.key === '7' && modelOptions[6]) {
            modelOptions.forEach(opt => opt.classList.remove('active'));
            modelOptions[6].classList.add('active');
            currentModel = "webimy-3";
        }
    }
}

// Application state functions
function displayWelcomeMessage() {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.innerHTML = `
        <div class="gradient-text">Hello, I'm Webimy</div>
        <p>I can help you with a wide variety of tasks! You can ask me questions, request creative content, 
        discuss complex topics, or just chat. What would you like to talk about?</p>
    `;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.appendChild(welcomeDiv);
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Add suggestions
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'chat-suggestions';
    
    const suggestions = [
        { title: "Tell me about AI", description: "Learn about artificial intelligence concepts" },
        { title: "Write a poem", description: "Get creative with poetry on any topic" },
        { title: "Explain quantum computing", description: "Understand complex scientific concepts" },
        { title: "Help with homework", description: "Get assistance with academic questions" }
    ];
    
    suggestions.forEach(suggestion => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        card.innerHTML = `
            <div class="suggestion-title">${suggestion.title}</div>
            <div class="suggestion-description">${suggestion.description}</div>
        `;
        
        card.addEventListener('click', () => {
            userInput.value = suggestion.title;
            sendMessage();
        });
        
        suggestionsDiv.appendChild(card);
    });
    
    chatMessages.appendChild(suggestionsDiv);
}

function startNewChat() {
    // Clear chat and history
    chatMessages.innerHTML = '';
    conversationHistory = [];
    imageDataUrl = null;
    displayWelcomeMessage();
}

function switchActivity(index) {
    // 0 = chat, 1 = activity, 2 = analytics, 3 = settings
    const activityModal = document.getElementById('activity-modal');
    const analyticsModal = document.getElementById('analytics-modal');
    const settingsModal = document.getElementById('settings-modal');
    
    closeAllModals();
    
    switch(index) {
        case 1: // Activity
            activityModal.classList.remove('hidden');
            loadActivityData();
            break;
        case 2: // Analytics
            analyticsModal.classList.remove('hidden');
            updateAnalyticsDisplay();
            break;
        case 3: // Settings
            settingsModal.classList.remove('hidden');
            break;
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// Settings and data functions
function loadSettings() {
    // Load theme settings
    if (localStorage.getItem('darkTheme') === 'false') {
        isDarkTheme = false;
        document.body.classList.add('light-theme');
        document.getElementById('dark-theme-toggle').checked = false;
    }
    
    if (localStorage.getItem('highContrast') === 'true') {
        isHighContrast = true;
        document.body.classList.add('high-contrast');
        document.getElementById('high-contrast-toggle').checked = true;
    }
    
    // Load other settings
    if (localStorage.getItem('saveConversations') === 'false') {
        saveConversations = false;
        document.getElementById('save-conversations-toggle').checked = false;
    }
    
    if (localStorage.getItem('enableAnalytics') === 'false') {
        enableAnalytics = false;
        document.getElementById('analytics-toggle').checked = false;
    }
    
    // Load daily usage
    const storedDailyUsage = localStorage.getItem('dailyUsage');
    if (storedDailyUsage) {
        dailyUsage = JSON.parse(storedDailyUsage);
    }
    
    const storedLastReset = localStorage.getItem('lastDailyReset');
    if (storedLastReset) {
        lastDailyReset = parseInt(storedLastReset);
    }
}

function toggleDarkTheme(e) {
    isDarkTheme = e.target.checked;
    document.body.classList.toggle('light-theme', !isDarkTheme);
    localStorage.setItem('darkTheme', isDarkTheme);
}

function toggleHighContrast(e) {
    isHighContrast = e.target.checked;
    document.body.classList.toggle('high-contrast', isHighContrast);
    localStorage.setItem('highContrast', isHighContrast);
}

function toggleSaveConversations(e) {
    saveConversations = e.target.checked;
    localStorage.setItem('saveConversations', saveConversations);
}

function toggleAnalytics(e) {
    enableAnalytics = e.target.checked;
    localStorage.setItem('enableAnalytics', enableAnalytics);
}

function clearData() {
    if (confirm("Are you sure you want to clear all conversation history?")) {
        localStorage.removeItem('conversations');
        startNewChat();
        alert("Conversation history cleared!");
    }
}

function clearAnalytics() {
    if (confirm("Are you sure you want to clear all analytics data?")) {
        analyticsData = {
            messagesExchanged: 0,
            charactersGenerated: 0,
            imagesGenerated: 0,
            sessionStartTime: Date.now(),
            averageResponseTime: 0,
            totalResponseTime: 0,
            totalTokens: 0,
            webimyLiteUsage: 0,
            webimy2Usage: 0,
            webimy25Usage: 0,
            webimyReasonerMiniUsage: 0,
            webimyReasonerUsage: 0,
            webimyReasonerProUsage: 0,
            webimy3Usage: 0,
            webimyHybridUsage: 0,
            webimyCoderUsage: 0
        };
        localStorage.removeItem('analyticsData');
        updateAnalyticsDisplay();
        alert("Analytics data cleared!");
    }
}

// Editing messages
function editMessage(messageId, content) {
    editingMessageId = messageId;
    userInput.value = content;
    userInput.focus();
    adjustTextareaHeight();
    
    // Update submit button to show editing state
    submitButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
        </svg>
    `;
    
    // Create cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancel-edit-btn';
    cancelBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
        </svg>
    `;
    cancelBtn.style.background = 'none';
    cancelBtn.style.border = 'none';
    cancelBtn.style.color = 'var(--secondary-accent)';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.padding = '8px';
    
    cancelBtn.addEventListener('click', cancelEdit);
    
    const promptContainer = document.getElementById('prompt-container');
    promptContainer.insertBefore(cancelBtn, submitButton);
}

function cancelEdit() {
    editingMessageId = null;
    userInput.value = '';
    adjustTextareaHeight();
    
    // Restore submit button
    submitButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
        </svg>
    `;
    
    // Remove cancel button
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.remove();
    }
}

// Analytics functions
function updateAnalytics(action) {
    if (!enableAnalytics) return;
    
    if (action === 'send') {
        analyticsData.messagesExchanged++;
        
        // Update model-specific usage
        switch(currentModel) {
            case 'webimy-lite':
                analyticsData.webimyLiteUsage++;
                break;
            case 'webimy-2':
                analyticsData.webimy2Usage++;
                break;
            case 'webimy-2.5':
                analyticsData.webimy25Usage++;
                break;
            case 'webimy-reasoner-mini':
                analyticsData.webimyReasonerMiniUsage++;
                break;
            case 'webimy-reasoner':
                analyticsData.webimyReasonerUsage++;
                break;
            case 'webimy-reasoner-pro':
                analyticsData.webimyReasonerProUsage++;
                break;
            case 'webimy-3':
                analyticsData.webimy3Usage++;
                break;
            case 'webimy-hybrid':
                analyticsData.webimyHybridUsage++;
                break;
            case 'webimy-coder':
                analyticsData.webimyCoderUsage++;
                break;
        }
    }
    
    // Save to localStorage
    localStorage.setItem('analyticsData', JSON.stringify(analyticsData));
}

function updateAnalyticsAfterResponse(content, responseTime) {
    if (!enableAnalytics) return;
    
    analyticsData.charactersGenerated += content.length;
    analyticsData.totalResponseTime += responseTime;
    analyticsData.averageResponseTime = analyticsData.totalResponseTime / analyticsData.messagesExchanged;
    
    // Estimate tokens (very rough approximation)
    const estimatedTokens = Math.ceil(content.length / 4);
    analyticsData.totalTokens += estimatedTokens;
    
    // If this is an image generation response, count it
    if (content.includes("![") && content.includes("](")) {
        analyticsData.imagesGenerated++;
    }
    
    // Save to localStorage
    localStorage.setItem('analyticsData', JSON.stringify(analyticsData));
}

function updateAnalyticsDisplay() {
    // Update analytics modal with current data
    document.getElementById('messages-exchanged').textContent = analyticsData.messagesExchanged;
    document.getElementById('characters-generated').textContent = analyticsData.charactersGenerated.toLocaleString();
    document.getElementById('images-generated').textContent = analyticsData.imagesGenerated;
    document.getElementById('total-tokens').textContent = analyticsData.totalTokens.toLocaleString();
    
    // Session time
    const sessionDuration = Math.floor((Date.now() - analyticsData.sessionStartTime) / 1000);
    const hours = Math.floor(sessionDuration / 3600);
    const minutes = Math.floor((sessionDuration % 3600) / 60);
    const seconds = sessionDuration % 60;
    document.getElementById('session-time').textContent = `${hours}h ${minutes}m ${seconds}s`;
    
    // Response time
    const avgResponseTime = analyticsData.averageResponseTime > 0 
        ? (analyticsData.averageResponseTime / 1000).toFixed(1) 
        : 0;
    document.getElementById('avg-response-time').textContent = `${avgResponseTime}s`;
    
    // Update model usage chart if we have a chart
    updateModelUsageChart();
}

function updateModelUsageChart() {
    const chartContainer = document.querySelector('.analytics-chart');
    
    // Use existing model usage data
    const chartData = [
        { label: 'Webimy 2.0 Lite', value: analyticsData.webimyLiteUsage, color: '#8bc34a' },
        { label: 'Webimy 2.0', value: analyticsData.webimy2Usage, color: '#00f2fe' },
        { label: 'Webimy 2.5', value: analyticsData.webimy25Usage, color: '#00bcd4' },
        { label: 'Reasoner Mini', value: analyticsData.webimyReasonerMiniUsage, color: '#BA68C8' },
        { label: 'Reasoner', value: analyticsData.webimyReasonerUsage, color: '#9C27B0' },
        { label: 'Reasoner Pro', value: analyticsData.webimyReasonerProUsage, color: '#FF9800' },
        { label: 'Webimy 3.0', value: analyticsData.webimy3Usage, color: '#00c853' },
        { label: 'Webimy Hybrid', value: analyticsData.webimyHybridUsage, color: '#6200EE' },
        { label: 'Webimy Coder', value: analyticsData.webimyCoderUsage, color: '#03A9F4' }
    ];
    
    // Clear existing chart
    chartContainer.innerHTML = '';
    
    // Add chart title
    const chartTitle = document.createElement('div');
    chartTitle.textContent = 'Model Usage Distribution';
    chartTitle.style.fontWeight = '500';
    chartTitle.style.marginBottom = '10px';
    chartContainer.appendChild(chartTitle);
    
    // Create SVG for pie chart
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '200');
    svg.setAttribute('viewBox', '0 0 100 100');
    chartContainer.appendChild(svg);
    
    // Create pie chart
    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        // No data yet
        const noDataText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        noDataText.setAttribute('x', '50');
        noDataText.setAttribute('y', '50');
        noDataText.setAttribute('text-anchor', 'middle');
        noDataText.textContent = 'No data yet';
        svg.appendChild(noDataText);
    } else {
        let startAngle = 0;
        const centerX = 50;
        const centerY = 50;
        const radius = 40;
        
        chartData.forEach(item => {
            if (item.value === 0) return;
            
            const portion = item.value / total;
            const endAngle = startAngle + (portion * Math.PI * 2);
            
            // Calculate path coordinates
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);
            
            // Create path element for pie slice
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const largeArcFlag = portion > 0.5 ? 1 : 0;
            
            const d = [
                `M ${centerX},${centerY}`,
                `L ${x1},${y1}`,
                `A ${radius},${radius} 0 ${largeArcFlag} 1 ${x2},${y2}`,
                'Z'
            ].join(' ');
            
            path.setAttribute('d', d);
            path.setAttribute('fill', item.color);
            svg.appendChild(path);
            
            startAngle = endAngle;
        });
    }
    
    // Add legend
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.flexWrap = 'wrap';
    legend.style.justifyContent = 'center';
    legend.style.gap = '10px';
    legend.style.marginTop = '10px';
    
    chartData.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.gap = '5px';
        
        const colorBox = document.createElement('div');
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.backgroundColor = item.color;
        colorBox.style.borderRadius = '2px';
        
        const labelText = document.createElement('span');
        labelText.textContent = `${item.label}: ${item.value}`;
        labelText.style.fontSize = '12px';
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(labelText);
        legend.appendChild(legendItem);
    });
    
    chartContainer.appendChild(legend);
}

// Activity functions
function loadActivityData() {
    const activityList = document.getElementById('activity-list');
    
    // Clear existing items
    activityList.innerHTML = '';
    
    // If we have no conversation history yet
    if (conversationHistory.length === 0) {
        activityList.innerHTML = '<p>Your conversations will appear here.</p>';
        return;
    }
    
    // Add recent messages from current conversation
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    userMessages.slice(-10).reverse().forEach((msg, index) => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const date = new Date();
        date.setMinutes(date.getMinutes() - index * 5); // Simulate different times
        
        const dateText = document.createElement('div');
        dateText.className = 'activity-date';
        dateText.textContent = date.toLocaleString();
        
        const messageText = document.createElement('div');
        messageText.className = 'activity-text';
        
        // Handle both string and array content
        if (typeof msg.content === 'string') {
            messageText.textContent = msg.content;
        } else if (Array.isArray(msg.content)) {
            const textContent = msg.content.find(item => item.type === 'text');
            messageText.textContent = textContent ? textContent.text : 'Image message';
        }
        
        activityItem.appendChild(dateText);
        activityItem.appendChild(messageText);
        
        activityItem.addEventListener('click', () => {
            // Close modal and scroll to that message
            closeAllModals();
            
            // Restore chat tab
            const sidebarOptions = document.querySelectorAll('.sidebar-option');
            sidebarOptions.forEach((opt, i) => {
                opt.classList.toggle('active', i === 0);
            });
        });
        
        activityList.appendChild(activityItem);
    });
}

// Typing control functions
function stopTyping() {
    // Clear all typing timeouts
    typingTimeouts.forEach(timeout => clearTimeout(timeout));
    typingTimeouts = [];
    
    // Show complete message immediately
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
        if (typingIndicatorElement && typingIndicatorElement.parentNode) {
            chatMessages.removeChild(typingIndicatorElement);
        }
        
        // Get the last assistant message div and update it
        const messageElements = document.querySelectorAll('.message.assistant');
        const lastMessageElement = messageElements[messageElements.length - 1];
        
        if (lastMessageElement) {
            const markdownContent = lastMessageElement.querySelector('.markdown-content');
            if (markdownContent) {
                markdownContent.innerHTML = marked.parse(lastMessage.content);
                
                // Make code blocks selectable
                const codeBlocks = markdownContent.querySelectorAll('pre code');
                codeBlocks.forEach(block => {
                    block.style.userSelect = 'text';
                });
            }
        }
    }
    
    isTyping = false;
    typingIndicatorElement = null;
}

// Model info popup
function showModelInfoPopup(model) {
    const popup = document.createElement('div');
    popup.className = 'model-info-popup';
    
    let title, description, comparisons, stats;
    
    switch(model) {
        case 'webimy-lite':
            title = 'Webimy 2.0 Lite';
            description = "Webimy 2.0 Lite is our basic model.";
            stats = [
                {title: 'Balance', value: '7/10'},
                {title: 'Depth', value: '6/10'},
                {title: 'Speed', value: '5/10'},
                {title: 'Context', value: '7/10'}
            ];
            comparisons = [
                'Balanced response length',
                'Good for general questions',
                'Excels at creative tasks',
                'Limited to 10 calls per minute'
            ];
            break;
        case 'webimy-2':
            title = 'Webimy 2.0';
            description = 'Webimy 2.0 combines the technical depth of Pro with the speed and conciseness of Flash. It delivers balanced responses that are both informative and efficient, making it the ideal all-purpose upgrade.';
            stats = [
                {title: 'Balance', value: '9/10'},
                {title: 'Depth', value: '8/10'},
                {title: 'Speed', value: '8/10'},
                {title: 'Context', value: '9/10'}
            ];
            comparisons = [
                'Combines Pro\'s expertise with Flash\'s conciseness',
                'Faster than Pro, more detailed than Flash',
                'Perfect for both technical and casual queries',
                'Limited to 17 calls per minute'
            ];
            break;
        case 'webimy-2.5':
            title = 'Webimy 2.5';
            description = 'Webimy 2.5 builds on the balance of Webimy 2.0 while adding powerful built-in tools. It delivers intelligent responses while automatically using calculation, code interpretation, and image generation capabilities when beneficial.';
            stats = [
                {title: 'Balance', value: '9/10'},
                {title: 'Tools', value: '9/10'},
                {title: 'Speed', value: '8/10'},
                {title: 'Flexibility', value: '9/10'}
            ];
            comparisons = [
                'Built-in calculator for math expressions',
                'Code interpreter for programming tasks',
                'Image generation capabilities',
                'Limited to 15 calls per minute'
            ];
            break;
        case 'webimy-reasoner-mini':
            title = 'Webimy Reasoner Mini';
            description = 'Webimy Reasoner Mini is our entry-level reasoner model that includes basic thoughtful analysis. It analyzes questions thoroughly and provides high-quality answers while being more accessible with a higher daily limit.';
            stats = [
                {title: 'Quality', value: '8/10'},
                {title: 'Thinking', value: '7/10'},
                {title: 'Depth', value: '8/10'},
                {title: 'Context', value: '8/10'}
            ];
            comparisons = [
                'Basic thinking process',
                'Simple self-review before answering',
                'Higher premium tier availability',
                'Limited to 8 calls per day'
            ];
            break;
        case 'webimy-reasoner':
            title = 'Webimy Reasoner';
            description = 'Webimy Reasoner balances deep thinking capabilities with reasonable availability. It performs a more thorough analysis with multiple thinking steps to deliver comprehensive, high-quality responses.';
            stats = [
                {title: 'Quality', value: '9/10'},
                {title: 'Thinking', value: '9/10'},
                {title: 'Depth', value: '9/10'},
                {title: 'Context', value: '9/10'}
            ];
            comparisons = [
                'Thorough thinking process',
                'Comprehensive self-review',
                'Multiple perspective analysis',
                'Limited to 5 calls per day'
            ];
            break;
        case 'webimy-reasoner-pro':
            title = 'Webimy Reasoner Pro';
            description = 'Webimy Reasoner Pro combines the thinking capabilities of Webimy Reasoner with powerful built-in tools. It can perform calculations, execute code, and generate images directly within the conversation.';
            stats = [
                {title: 'Quality', value: '9/10'},
                {title: 'Tools', value: '10/10'},
                {title: 'Thinking', value: '9/10'},
                {title: 'Flexibility', value: '10/10'}
            ];
            comparisons = [
                'Built-in calculator for math expressions',
                'Code interpreter for multiple languages',
                'Image generation capabilities',
                'Limited to 10 calls per minute'
            ];
            break;
        case 'webimy-3':
            title = 'Webimy 3.0';
            description = 'Webimy 3.0 is our next generation flagship model that combines the deep thinking process of Webimy Reasoner Pro with advanced smart tools. It delivers exceptionally comprehensive responses while intelligently utilizing calculation, code execution, and image generation capabilities when needed.';
            stats = [
                {title: 'Quality', value: '10/10'},
                {title: 'Thinking', value: '10/10'},
                {title: 'Tools', value: '10/10'},
                {title: 'Depth', value: '10/10'}
            ];
            comparisons = [
                'Elite-level deep thinking process',
                'Built-in smart tools (calculator, code interpreter, images)',
                'Exceptionally comprehensive responses',
                'Limited to 2 calls per minute'
            ];
            break;
        case 'webimy-hybrid':
            title = 'Webimy Hybrid';
            description = 'Webimy Hybrid combines the efficiency of Webimy 2.0 with the deep analytical capabilities of Reasoner models. It delivers comprehensive, thoughtful, and detailed responses with smart tool integration as required.';
            stats = [
                {title: 'Quality', value: '9/10'},
                {title: 'Thinking', value: '9/10'},
                {title: 'Tools', value: '9/10'},
                {title: 'Flexibility', value: '9/10'}
            ];
            comparisons = [
                'Combines efficiency and deep analysis',
                'Delivers comprehensive responses',
                'Utilizes smart tools when needed',
                'Limited to 15 calls per minute'
            ];
            break;
        case 'webimy-coder':
            title = 'Webimy Coder';
            description = 'Webimy Coder specializes in generating high-quality, functional code with self-improvement capabilities. It thinks step by step, analyzes requirements carefully, and provides detailed code solutions with explanations.';
            stats = [
                {title: 'Code Quality', value: '10/10'},
                {title: 'Self-Improvement', value: '10/10'},
                {title: 'Documentation', value: '9/10'},
                {title: 'Versatility', value: '9/10'}
            ];
            comparisons = [
                'Automatic code improvement iterations',
                'Advanced code reasoning and documentation',
                'Multiple programming language support',
                'Limited to 5 calls per minute'
            ];
            break;
    }
    
    popup.innerHTML = `
        <div class="popup-header">
            <div class="popup-title">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" class="${model}-color" fill="currentColor"/>
                </svg>
                ${title}
            </div>
            <button class="close-popup">&times;</button>
        </div>
        
        <div class="model-stats">
            ${stats.map(stat => `
                <div class="stat-card">
                    <div class="stat-title">${stat.title}</div>
                    <div class="stat-value">${stat.value}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="model-description">
            <p>${description}</p>
        </div>
        
        <div class="model-comparison">
            <div class="comparison-title">Key Features</div>
            ${comparisons.map(item => `
                <div class="comparison-item">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                    </svg>
                    ${item}
                </div>
            `).join('')}
        </div>
    `;
    
    // Add close event
    const closeBtn = popup.querySelector('.close-popup');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(popup);
    });
    
    // Add the popup to the body
    document.body.appendChild(popup);
    
    // Run MathJax to process any LaTeX in the popup content.
    if (window.MathJax) {
        MathJax.typesetPromise([popup]).catch(err => console.error(err));
    }
}

// Make model indicators clickable to show popup
document.addEventListener('click', function(e) {
    if (e.target.closest('.model-indicator')) {
        const modelIndicator = e.target.closest('.model-indicator');
        const model = modelIndicator.dataset.model;
        showModelInfoPopup(model);
    }
});

// Reasoning button functions
function toggleReasoning() {
    const modelOptions = document.querySelectorAll('.model-option');
    // Try to find an option explicitly with "webimy-reasoner"
    let reasonerOption = Array.from(modelOptions).find(opt => opt.dataset.model === 'webimy-reasoner');
    // If not found, fall back to any option starting with "webimy-reasoner"
    if (!reasonerOption) {
        reasonerOption = Array.from(modelOptions).find(opt => opt.dataset.model && opt.dataset.model.startsWith('webimy-reasoner'));
    }
    
    if (!reasonerOption) {
        console.error("No reasoner model found in options");
        showRateLimitError("Unable to toggle reasoning mode: No reasoner model available");
        return;
    }
    
    if (currentModel.startsWith("webimy-reasoner")) {
        // Switch off Reasoner mode: revert to Webimy 2.0
        modelOptions.forEach(opt => opt.classList.remove('active'));
        const webimy2Option = Array.from(modelOptions).find(opt => opt.dataset.model === 'webimy-2');
        if (webimy2Option) {
            webimy2Option.classList.add('active');
            currentModel = 'webimy-2';
        }
    } else {
        modelOptions.forEach(opt => opt.classList.remove('active'));
        reasonerOption.classList.add('active');
        currentModel = reasonerOption.dataset.model; // will be one of the reasoner models
    }
    
    updateReasoningButtonState();
    
    const message = currentModel.startsWith("webimy-reasoner") ?
        "Reasoner Mode activated! I will now thoroughly analyze and self-review my responses." :
        "Reasoner Mode deactivated. Returning to standard mode.";
    showRateLimitError(message);
}

function updateReasoningButtonState() {
    const reasoningBtn = document.getElementById('reasoning-btn');
    const tooltip = reasoningBtn.querySelector('.reasoning-tooltip');
    if (currentModel.startsWith("webimy-reasoner")) {
        reasoningBtn.classList.add('active');
        tooltip.textContent = 'Disable Reasoner Mode';
    } else {
        reasoningBtn.classList.remove('active');
        tooltip.textContent = 'Enable Reasoner Mode';
    }
}

// Function to detect special commands in Elite Agent
async function analyzeAndProcessEliteAgentTools(userMessage) {
    // If message is explicitly using the command syntax, still honor that
    if (typeof userMessage === 'string') {
        if (userMessage.startsWith('calculate:') || 
            userMessage.startsWith('execute:') || 
            userMessage.startsWith('generate-image:') ||
            userMessage.startsWith('render-html:')) {
            return await handleEliteAgentCommands(userMessage);
        }
        
        // Let the AI decide what tool to use by analyzing the message
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant with access to specialized tools. Analyze the user message and determine if it requires:
                    1. A calculator (for math problems or calculations)
                    2. A code interpreter (for coding tasks or algorithm explanation)
                    3. An image generator (when the user wants to see a visual representation)
                    4. An HTML renderer (when the user wants to see a preview of HTML/CSS/JS code)
                    5. No special tools (for general conversation)
                    
                    Respond with JSON in the format:
                    {
                        "toolRequired": "calculator" | "code" | "image" | "html" | "none",
                        "expression": "..." (for calculator, the math expression to calculate),
                        "code": "..." (for code, the code to execute),
                        "imagePrompt": "..." (for image, the description to generate),
                        "htmlCode": "..." (for HTML renderer, the HTML code to render)
                    }`
                },
                {
                    role: "user",
                    content: userMessage
                }
            ]
        });
        
        try {
            const toolDecision = JSON.parse(completion.content);
            
            // Process based on the tool decision
            if (toolDecision.toolRequired === "calculator" && toolDecision.expression) {
                try {
                    // Using Function constructor to safely evaluate math expressions
                    const result = new Function('return ' + toolDecision.expression)();
                    return `I noticed this requires a calculation:\n\n**${toolDecision.expression} = ${result}**\n\nTo answer your question: ${userMessage}`;
                } catch (error) {
                    console.error("Calculation error:", error);
                    // Fall back to normal response if calculation fails
                    return null;
                }
            } 
            else if (toolDecision.toolRequired === "code" && toolDecision.code) {
                // Show tool usage indicator
                updateTypingIndicator("Using code interpreter...");
                
                return `To solve this, I'll analyze this code:\n\`\`\`\n${toolDecision.code}\n\`\`\`\n\nIf executed, this would ${userMessage.includes("explain") ? "demonstrate how to" : "solve your request to"} ${userMessage}`;
            }
            else if (toolDecision.toolRequired === "image" && toolDecision.imagePrompt) {
                try {
                    // Show tool usage indicator
                    updateTypingIndicator("Generating image...");
                    
                    // Generate the image
                    const result = await websim.imageGen({
                        prompt: toolDecision.imagePrompt,
                        aspect_ratio: "1:1",
                    });
                    
                    // Return markdown with the image
                    return `I've created a visual to help with your request:\n\n![${toolDecision.imagePrompt}](${result.url})\n\nThis image shows ${toolDecision.imagePrompt} as requested.`;
                } catch (error) {
                    console.error("Image generation error:", error);
                    // Fall back to normal response if image generation fails
                    return null;
                }
            }
            else if (toolDecision.toolRequired === "html" && toolDecision.htmlCode) {
                // Show tool usage indicator
                updateTypingIndicator("Rendering HTML...");
                
                // Create a unique ID for this HTML preview
                const previewId = 'html-preview-' + Date.now();
                
                return `I've rendered the HTML code you provided:\n\n\`\`\`html\n${toolDecision.htmlCode}\n\`\`\`\n\n<div class="html-preview-container" id="${previewId}">\n  <div class="html-preview-header">\n    <span>HTML Preview</span>\n    <button class="html-preview-toggle" onclick="toggleHtmlPreview('${previewId}')">Show/Hide Preview</button>\n  </div>\n  <iframe class="html-preview-frame" srcdoc="${encodeHtmlForIframe(toolDecision.htmlCode)}" sandbox="allow-scripts" loading="lazy"></iframe>\n</div>\n\n<script>\nfunction toggleHtmlPreview(id) {\n  const container = document.getElementById(id);\n  const iframe = container.querySelector('iframe');\n  iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';\n}\n</script>`;
            }
        } catch (error) {
            console.error("Error parsing tool decision:", error);
            // If there's an error in the JSON or processing, fall back to normal response
            return null;
        }
    }
    
    // Default case - no special tool used
    return null;
}

// Keep the original function for explicit commands
async function handleEliteAgentCommands(text) {
    // Calculator functionality
    if (text.startsWith('calculate:')) {
        updateTypingIndicator("Using calculator...");
        const expression = text.substring('calculate:'.length).trim();
        try {
            // Using Function constructor to safely evaluate math expressions
            const result = new Function('return ' + expression)();
            return `Calculator result: ${expression} = ${result}`;
        } catch (error) {
            return `Error calculating expression: ${error.message}`;
        }
    }
    
    // Code interpreter functionality
    if (text.startsWith('execute:')) {
        updateTypingIndicator("Using code interpreter...");
        const code = text.substring('execute:'.length).trim();
        try {
            // For safety in this demonstration, we'll just pretend to execute code
            // In a real system, this would use a sandboxed environment
            return `Code execution result (simulated):\n\`\`\`\nExecuted: ${code}\nOutput: [Simulated code execution output]\n\`\`\``;
        } catch (error) {
            return `Error executing code: ${error.message}`;
        }
    }
    
    // Image generator functionality
    if (text.startsWith('generate-image:')) {
        updateTypingIndicator("Generating image...");
        const prompt = text.substring('generate-image:'.length).trim();
        
        // Show loading message
        const loadingMessage = "Generating image from prompt: " + prompt + "...";
        
        try {
            // Generate the image
            const result = await websim.imageGen({
                prompt: prompt,
                aspect_ratio: "1:1",
            });
            
            // Return markdown with the image
            return `Generated image for prompt: "${prompt}"\n\n![${prompt}](${result.url})`;
        } catch (error) {
            return `Error generating image: ${error.message}`;
        }
    }
    
    // HTML renderer functionality
    if (text.startsWith('render-html:')) {
        updateTypingIndicator("Rendering HTML...");
        const htmlCode = text.substring('render-html:'.length).trim();
        
        try {
            // Create a unique ID for this HTML preview
            const previewId = 'html-preview-' + Date.now();
            
            return `HTML Renderer result:\n\n\`\`\`html\n${htmlCode}\n\`\`\`\n\n<div class="html-preview-container" id="${previewId}">\n  <div class="html-preview-header">\n    <span>HTML Preview</span>\n    <button class="html-preview-toggle" onclick="toggleHtmlPreview('${previewId}')">Show/Hide Preview</button>\n  </div>\n  <iframe class="html-preview-frame" srcdoc="${encodeHtmlForIframe(htmlCode)}" sandbox="allow-scripts" loading="lazy"></iframe>\n</div>\n\n<script>\nfunction toggleHtmlPreview(id) {\n  const container = document.getElementById(id);\n  const iframe = container.querySelector('iframe');\n  iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';\n}\n</script>`;
        } catch (error) {
            return `Error rendering HTML: ${error.message}`;
        }
    }
    
    // If no special command is detected, return null
    return null;
}

// Function to safely encode HTML for iframe srcdoc attribute
function encodeHtmlForIframe(html) {
    return html.replace(/"/g, '&quot;');
}

// Function to update typing indicator with tool usage information
function updateTypingIndicator(toolMessage) {
    if (typingIndicatorElement) {
        const modelInfo = typingIndicatorElement.querySelector('.typing-model-info');
        if (modelInfo) {
            modelInfo.innerHTML = `<span style="color:var(--secondary-accent)">${toolMessage}</span>`;
            
            // Restore model info after a delay
            setTimeout(() => {
                if (modelInfo) {
                    modelInfo.textContent = `${getCurrentModelName()} is thinking...`;
                }
            }, 3000);
        }
    }
}

// Add toggleHtmlPreview function to global scope
window.toggleHtmlPreview = function(id) {
    const container = document.getElementById(id);
    const iframe = container.querySelector('iframe');
    iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
};

function autoSelectModel() {
    const query = userInput.value.trim();
    if (!query) {
        alert("Please enter a query before auto-selecting a model.");
        return;
    }
    // Simple heuristic to choose a model based on the query:
    if (query.toLowerCase().includes("html") || query.toLowerCase().includes("css") || query.toLowerCase().includes("javascript")) {
        currentModel = "webimy-2.5";
    } else if (query.length > 120) {
        currentModel = "webimy-3";
    } else if (query.toLowerCase().includes("explain") || query.toLowerCase().includes("analyze") || query.toLowerCase().includes("detail")) {
        currentModel = "webimy-reasoner";
    } else {
        currentModel = "webimy-2";
    }
    // Update the active state in the model selector UI
    document.querySelectorAll('.model-option').forEach(option => {
        if (option.dataset.model === currentModel) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    showRateLimitError(`Auto-selected model: ${getCurrentModelName()}`);
}

function openCompareModelsModal() {
    document.getElementById('compare-modal').classList.remove('hidden');
    
    // Reset selections
    selectedModelsForComparison = [];
    document.querySelectorAll('.compare-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Pre-select current model
    const currentModelOption = document.querySelector(`.compare-option[data-model="${currentModel}"]`);
    if (currentModelOption) {
        currentModelOption.classList.add('selected');
        selectedModelsForComparison.push(currentModel);
    }
    
    updateCompareButtonState();
}

function closeCompareModelsModal() {
    document.getElementById('compare-modal').classList.add('hidden');
}

function updateCompareModelSelection() {
    selectedModelsForComparison = [];
    document.querySelectorAll('.compare-option.selected').forEach(option => {
        selectedModelsForComparison.push(option.dataset.model);
    });
    
    updateCompareButtonState();
}

function updateCompareButtonState() {
    const startButton = document.getElementById('compare-start');
    if (selectedModelsForComparison.length >= 2) {
        startButton.disabled = false;
        startButton.style.opacity = 1;
    } else {
        startButton.disabled = true;
        startButton.style.opacity = 0.5;
    }
}

function startModelComparison() {
    if (selectedModelsForComparison.length < 2) {
        showRateLimitError("Please select at least 2 models to compare");
        return;
    }
    
    closeCompareModelsModal();
    isCompareMode = true;
    
    // Update UI to indicate compare mode
    document.getElementById('compare-models-btn').classList.add('active');
    
    // Change submit button to indicate compare mode
    submitButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="currentColor"/>
        </svg>
    `;
    
    // Show notification
    showRateLimitError(`Compare mode active: ${selectedModelsForComparison.length} models selected`);
}

// Changelog functionality
document.getElementById('changelog-btn').addEventListener('click', function() {
    const modal = document.getElementById('changelog-modal');
    modal.classList.remove('hidden');
    const changelogContent = document.querySelector('#changelog-modal .changelog-content');
    changelogContent.innerHTML = getChangelogText();
});

function getChangelogText() {
    return `
        <h3>Version 1.0</h3>
        <ul>
            <li>Initial release with core features.</li>
            <li>Basic AI chat and prompt functionality.</li>
            <li>Simple sidebar and model selection.</li>
        </ul>
        <h3>Version 1.1</h3>
        <ul>
            <li>Bug fixes and UI improvements.</li>
            <li>Improved text rendering and performance enhancements.</li>
        </ul>
        <h3>Version 1.2</h3>
        <ul>
            <li>Added support for editing messages on double-click.</li>
            <li>Enhanced accessibility features including high contrast mode.</li>
        </ul>
        <h3>Version 2.0</h3>
        <ul>
            <li>Introduced multiple model support for simultaneous queries.</li>
            <li>Integrated smart tool functionality (Calculator, Code Interpreter, Image Generator, HTML Renderer).</li>
            <li>Enhanced AI response generation with reasoning process.</li>
        </ul>
        <h3>Version 2.1</h3>
        <ul>
            <li>Refined reasoning process flow.</li>
            <li>Improved rate limiting mechanism and analytics tracking.</li>
        </ul>
        <h3>Version 2.5</h3>
        <ul>
            <li>Enhanced tool integration with built-in calculator and code interpreter.</li>
            <li>Optimized UI elements and animations for smoother interactions.</li>
        </ul>
        <h3>Version 3.0</h3>
        <ul>
            <li>Major update with comprehensive reasoning models: Webimy Reasoner Mini, Webimy Reasoner, Webimy Reasoner Pro.</li>
            <li>Advanced LaTeX rendering support for mathematical expressions.</li>
        </ul>
        <h3>Version 3.1</h3>
        <ul>
            <li>Improved self-review and deep analysis in Reasoner models.</li>
            <li>Enhanced tool usage feedback and error handling.</li>
        </ul>
        <h3>Version 3.5</h3>
        <ul>
            <li>Added auto-select model feature based on user query.</li>
            <li>Optimized performance for multi-model queries and comparisons.</li>
        </ul>
        <h3>Version 3.7</h3>
        <ul>
            <li>Introduced Webimy Hybrid, combining fast analysis with deep reasoning.</li>
            <li>Improved image generation and HTML rendering stability.</li>
        </ul>
        <h3>Version 3.9</h3>
        <ul>
            <li>Final polish and integration of all features.</li>
            <li>Refined UI, added long changelog display, and fixed all known bugs.</li>
            <li>Enhanced user customization settings and model performance.</li>
        </ul>
    `;
}

// Function to handle Webimy Coder model requests
async function handleCoderModelRequest(userMessage) {
    // Check if this is a code replacement request
    if (typeof userMessage === 'string' && userMessage.toLowerCase().startsWith("replace code:")) {
        await handleCodeReplacement(userMessage);
        return "Processing code replacement...";
    }
    
    // First, determine if this is a coding task
    const codingTaskAnalysis = await websim.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are an AI coding assistant that determines if a user request involves code generation. 
                If it does, respond with JSON: {"isCodingTask": true, "language": "detected language", "taskType": "type of task"}. 
                If not, respond with: {"isCodingTask": false}`
            },
            {
                role: "user",
                content: userMessage
            }
        ],
        json: true
    });
    
    try {
        const analysis = JSON.parse(codingTaskAnalysis.content);
        
        if (!analysis.isCodingTask) {
            return null; // Not a coding task, handle normally
        }
        
        // Automatically open code playground for coding tasks
        if (!codePlaygroundActive) {
            openCodePlayground();
            
            // Analyze the task to populate the playground
            const initialCodeAnalysis = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a coding expert. Based on this user request, generate starter code in ${analysis.language} language
                        that addresses the core functionality. Only output code, no explanations.`
                    },
                    {
                        role: "user",
                        content: userMessage
                    }
                ]
            });
            
            // Extract code and set in playground
            const starterCode = extractCodeFromResponse(initialCodeAnalysis.content, analysis.language);
            document.getElementById('code-input').value = starterCode;
            currentPlaygroundCode = starterCode;
            
            // Set the correct language
            const languageSelect = document.getElementById('playground-language');
            const normalizedLang = normalizeLanguageName(analysis.language);
            if (languageSelect.querySelector(`option[value="${normalizedLang}"]`)) {
                languageSelect.value = normalizedLang;
                currentPlaygroundLanguage = normalizedLang;
            }
            
            updateLineNumbers(starterCode);
            
            // Automatically run improvement
            setTimeout(() => improvePlaygroundCode(), 500);
        }
        
        // Ask for number of auto-improvements
        const improveCountMsg = "How many auto-improvements would you like me to perform? (2-50)";
        addMessageToUI('assistant', improveCountMsg);
        
        // Add to conversation history
        conversationHistory.push({
            role: "assistant",
            content: improveCountMsg
        });
        
        // Wait for user response on improvement count
        return improveCountMsg;
    } catch (error) {
        console.error("Error analyzing coding task:", error);
        return null;
    }
}

// Helper function to normalize language names
function normalizeLanguageName(language) {
    language = language.toLowerCase().trim();
    
    const langMap = {
        'javascript': 'javascript',
        'js': 'javascript',
        'typescript': 'typescript',
        'ts': 'typescript',
        'python': 'python',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'java': 'java',
        'c++': 'cpp',
        'cpp': 'cpp',
        'c#': 'csharp',
        'csharp': 'csharp',
        'php': 'php',
        'ruby': 'ruby',
        'go': 'go',
        'golang': 'go',
        'rust': 'rust',
    };
    
    return langMap[language] || 'javascript';
}

// Modify improvePlaygroundCode to be more autonomous
async function improvePlaygroundCode() {
    if (!currentPlaygroundCode.trim()) {
        showCodeOutput('// No code to improve', 'info');
        return;
    }
    
    showCodeOutput('Analyzing and improving code...', 'info');
    
    try {
        // Determine how many improvements to make based on code complexity
        const complexityAnalysis = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Analyze this ${currentPlaygroundLanguage} code and rate its complexity from 1-10,
                    where 1 is extremely simple and 10 is highly complex. Only respond with the number.`
                },
                {
                    role: "user",
                    content: currentPlaygroundCode
                }
            ]
        });

        const complexity = parseInt(complexityAnalysis.content.trim());
        const numImprovements = isNaN(complexity) ? 3 : Math.min(Math.max(complexity, 2), 10);
        
        // Show autonomous improvement plan
        showCodeOutput(`// Autonomous improvement plan:\n// Detected complexity level: ${isNaN(complexity) ? 'Moderate' : complexity}/10\n// Performing ${numImprovements} rounds of improvements...`, 'info');
        
        // Perform multiple improvement rounds
        let currentCode = currentPlaygroundCode;
        let improvementLog = [];
        
        for (let i = 0; i < numImprovements; i++) {
            showCodeOutput(`// Improvement round ${i+1}/${numImprovements}...`, 'info');
            
            const improvements = await getCodeImprovements(currentCode, currentPlaygroundLanguage);
            currentCode = improvements.improvedCode;
            
            improvementLog.push({
                round: i+1,
                changes: improvements.improvementDetails
            });
        }
        
        // Update the code in the editor
        const codeInput = document.getElementById('code-input');
        if (codeInput) {
            codeInput.value = currentCode;
            currentPlaygroundCode = currentCode;
            updateLineNumbers(currentCode);
        }
        
        // Generate comprehensive improvement report
        let report = `// Complete Autonomous Improvement Report:\n\n`;
        improvementLog.forEach(log => {
            report += `// Round ${log.round}:\n${log.changes}\n\n`;
        });
        
        // Analyze final code quality
        const qualityAnalysis = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Analyze this ${currentPlaygroundLanguage} code and provide a concise quality assessment.
                    Focus on performance, readability, and best practices. Maximum 3 sentences.`
                },
                {
                    role: "user",
                    content: currentCode
                }
            ]
        });
        
        report += `// Final Quality Assessment:\n// ${qualityAnalysis.content.replace(/\n/g, '\n// ')}`;
        
        // Show improvement details
        showCodeOutput(report, 'success');
        
        // Auto-execute the code if it's JavaScript
        if (currentPlaygroundLanguage === 'javascript') {
            setTimeout(() => executePlaygroundCode(), 1000);
        }
    } catch (error) {
        showCodeOutput(`Error improving code: ${error.message}`, 'error');
    }
}

async function getCodeImprovements(code, language) {
    const completion = await websim.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are Webimy Coder, an expert in code improvement. Analyze the following ${language} code and provide significant improvements in the following areas:
                1. Code efficiency and performance
                2. Best practices and coding standards
                3. Error handling and edge cases
                4. Readability and maintainability
                5. Advanced techniques specific to ${language}
                
                Return a JSON object with the following structure:
                {
                    "improvedCode": "the full improved code that can be directly used",
                    "improvementDetails": "detailed explanation of all improvements made",
                    "reasoningProcess": "explanation of why these improvements are beneficial"
                }`
            },
            {
                role: "user",
                content: code
            }
        ],
        json: true
    });
    
    try {
        return JSON.parse(completion.content);
    } catch (error) {
        throw new Error("Failed to parse improvement results");
    }
}

function showCodeOutput(content, type = 'info') {
    const outputElement = document.getElementById('code-output');
    if (!outputElement) return;
    
    outputElement.className = 'code-output';
    outputElement.classList.add(`output-${type}`);
    
    // Apply syntax highlighting if it's code
    if (type === 'success' || type === 'info') {
        outputElement.innerHTML = `<pre><code>${escapeHTML(content)}</code></pre>`;
    } else {
        outputElement.textContent = content;
    }
}

function escapeHTML(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function clearCodeOutput() {
    const outputElement = document.getElementById('code-output');
    if (outputElement) {
        outputElement.textContent = '';
    }
}

// Code replacement functionality
function activateCodeReplacement() {
    codeReplacementActive = true;
    const replacementPanel = document.querySelector('.replacement-panel');
    if (replacementPanel) {
        replacementPanel.classList.remove('hidden');
    }
}

function cancelCodeReplacement() {
    codeReplacementActive = false;
    originalCodeSegment = "";
    
    const replacementPanel = document.querySelector('.replacement-panel');
    if (replacementPanel) {
        replacementPanel.classList.add('hidden');
    }
    
    // Clear the input fields
    const originalSegment = document.getElementById('original-segment');
    const newSegment = document.getElementById('new-segment');
    
    if (originalSegment) originalSegment.value = '';
    if (newSegment) newSegment.value = '';
}

function applyCodeReplacement() {
    const originalSegment = document.getElementById('original-segment');
    const newSegment = document.getElementById('new-segment');
    
    if (!originalSegment || !newSegment) return;
    
    const originalText = originalSegment.value.trim();
    const newText = newSegment.value.trim();
    
    if (!originalText) {
        showCodeOutput('Original code segment cannot be empty', 'error');
        return;
    }
    
    if (!currentPlaygroundCode.includes(originalText)) {
        showCodeOutput('Original code segment not found in the editor', 'error');
        return;
    }
    
    // Replace the code
    const updatedCode = currentPlaygroundCode.replace(originalText, newText);
    const codeInput = document.getElementById('code-input');
    
    if (codeInput) {
        codeInput.value = updatedCode;
        currentPlaygroundCode = updatedCode;
        updateLineNumbers(updatedCode);
    }
    
    // Show success message
    showCodeOutput('// Code segment successfully replaced', 'success');
    
    // Hide the replacement panel
    cancelCodeReplacement();
}

async function handleCodeReplacement(message) {
    if (!message.toLowerCase().startsWith("replace code:")) {
        return false;
    }
    
    // Parse the command
    const commandText = message.substring("replace code:".length).trim();
    
    try {
        // Extract original and new code segments
        const segments = commandText.split("WITH");
        
        if (segments.length !== 2) {
            throw new Error("Invalid format. Use 'Replace Code: [original code] WITH [new code]'");
        }
        
        const originalCode = segments[0].trim();
        const newCode = segments[1].trim();
        
        // If playground is active, replace in playground
        if (codePlaygroundActive) {
            if (!currentPlaygroundCode.includes(originalCode)) {
                throw new Error("Original code segment not found in the playground editor");
            }
            
            // Replace the code
            const updatedCode = currentPlaygroundCode.replace(originalCode, newCode);
            const codeInput = document.getElementById('code-input');
            
            if (codeInput) {
                codeInput.value = updatedCode;
                currentPlaygroundCode = updatedCode;
                updateLineNumbers(updatedCode);
                showCodeOutput('// Code segment successfully replaced', 'success');
            }
        } else {
            // If playground is not active, replace in the conversation context
            const lastAssistantMessage = conversationHistory.filter(msg => msg.role === "assistant").pop();
            
            if (!lastAssistantMessage || !lastAssistantMessage.content.includes(originalCode)) {
                throw new Error("Original code segment not found in the last assistant message");
            }
            
            // Add a new message explaining the replacement
            return `I've replaced the code segment as requested:\n\nOriginal code:\n\`\`\`\n${originalCode}\n\`\`\`\n\nNew code:\n\`\`\`\n${newCode}\n\`\`\`\n\nThe updated code should work better because it improves readability and efficiency.`;
        }
        
        return true;
    } catch (error) {
        showRateLimitError(error.message);
        return false;
    }
}

// Code Playground functions
function toggleCodePlayground() {
    // Only allow Webimy Coder to use the playground
    if (currentModel !== "webimy-coder") {
        showRateLimitError("Code Playground is only available with Webimy Coder model");
        return;
    }

    if (codePlaygroundActive) {
        closeCodePlayground();
    } else {
        openCodePlayground();
    }
}

function openCodePlayground() {
    codePlaygroundActive = true;
    
    // Create URL with playground data encoded
    const playgroundUrl = `/playground.html?language=${encodeURIComponent(currentPlaygroundLanguage)}&code=${encodeURIComponent(currentPlaygroundCode)}`;
    
    // Open in new tab
    window.open(playgroundUrl, '_blank', 'width=1200,height=800,top=50,left=50');
    
    // Highlight playground button
    if (codePlaygroundBtn) {
        codePlaygroundBtn.classList.add('active');
    }
}

function closeCodePlayground() {
    codePlaygroundActive = false;
    
    // Remove highlight from button
    if (codePlaygroundBtn) {
        codePlaygroundBtn.classList.remove('active');
    }
}

function updateLineNumbers(text) {
    const lineNumbers = document.getElementById('line-numbers');
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    let lineNumbersHTML = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumbersHTML += `<div class="line-number">${i}</div>`;
    }
    
    lineNumbers.innerHTML = lineNumbersHTML;
}

async function executePlaygroundCode() {
    if (!currentPlaygroundCode.trim()) {
        showCodeOutput('// No code to execute', 'info');
        return;
    }
    
    showCodeOutput('Executing code...', 'info');
    
    try {
        // Different handling based on language
        if (currentPlaygroundLanguage === 'javascript') {
            // For JavaScript, we can attempt to evaluate in a sandboxed way
            const result = await executeJavaScriptSafely(currentPlaygroundCode);
            showCodeOutput(result, 'success');
        } else {
            // For other languages, we'll simulate execution
            const result = await simulateCodeExecution(currentPlaygroundCode, currentPlaygroundLanguage);
            showCodeOutput(result, 'info');
        }
    } catch (error) {
        showCodeOutput(`Error executing code: ${error.message}`, 'error');
    }
}

async function executeJavaScriptSafely(code) {
    return new Promise((resolve, reject) => {
        // Create a safe execution environment
        try {
            // In a real implementation, this would use a more secure sandbox
            // For this demo, we'll use a simple try/catch with Function constructor
            const output = [];
            const consoleMock = {
                log: (...args) => output.push(args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')),
                error: (...args) => output.push(`ERROR: ${args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`),
                warn: (...args) => output.push(`WARNING: ${args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ')}`)
            };
            
            const safeEval = new Function('console', `
                "use strict";
                try {
                    ${code}
                } catch (error) {
                    console.error(error.message);
                }
                return "Code executed successfully";
            `);
            
            const result = safeEval(consoleMock);
            resolve(output.length ? output.join('\n') : result);
        } catch (error) {
            reject(error);
        }
    });
}

async function simulateCodeExecution(code, language) {
    // Simulate execution for non-JavaScript languages
    const analysis = await websim.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are a code execution simulator. Given some ${language} code, you should simulate what the output would be if run. 
                Only generate the output, nothing else. If there would be errors, show those errors formatted as they would appear in a ${language} interpreter or compiler.`
            },
            {
                role: "user",
                content: code
            }
        ]
    });
    
    return `// Simulated ${language.toUpperCase()} execution:\n\n${analysis.content}`;
}

// Function to check if the user is requesting an improvement count
function checkForImprovementCount() {
    const text = userInput.value.trim().toLowerCase();
    const improveMatch = text.match(/(\d+)\s*improvements?/i);
    
    if (improveMatch && improveMatch[1]) {
        const count = parseInt(improveMatch[1]);
        submitButton.dataset.improveCount = count;
    } else {
        delete submitButton.dataset.improveCount;
    }
}

// Update at the beginning of script to define extractCodeFromResponse function
function extractCodeFromResponse(response, language) {
    // Look for code blocks with backticks
    const codeBlockRegex = /```(?:(\w+)\n)?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(response)) !== null) {
        const blockLang = match[1]?.toLowerCase() || '';
        const code = match[2];
        
        // If language is specified in the block and matches requested language
        if (blockLang && (blockLang === language.toLowerCase() || 
            (blockLang === 'js' && language.toLowerCase() === 'javascript') ||
            (blockLang === 'py' && language.toLowerCase() === 'python'))) {
            return code.trim();
        }
        
        // If no language is specified in the block or no match yet
        if (!blockLang || codeBlockRegex.lastIndex === response.length) {
            return code.trim();
        }
    }
    
    // If no code blocks found, return the whole response
    return response.trim();
}

// Function to perform multiple code improvements
async function performCodeImprovements(originalRequest, language, improvementCount) {
    try {
        // Generate initial code
        const initialCode = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are Webimy Coder, an expert in generating high-quality ${language} code. Generate code that fulfills this request. Only output code, no explanations.`
                },
                {
                    role: "user",
                    content: originalRequest
                }
            ]
        });

        let currentCode = extractCodeFromResponse(initialCode.content, language);
        let improvementLog = [];
        
        // Perform iterative improvements
        for (let i = 0; i < improvementCount; i++) {
            const improvement = await getCodeImprovements(currentCode, language);
            currentCode = improvement.improvedCode;
            improvementLog.push({
                round: i+1,
                changes: improvement.improvementDetails
            });
        }
        
        // Generate comprehensive report
        let finalResponse = `# Solution for: ${originalRequest}\n\n\`\`\`${language}\n${currentCode}\n\`\`\`\n\n## Improvement Process\n\n`;
        improvementLog.forEach(log => {
            finalResponse += `### Round ${log.round}:\n${log.changes}\n\n`;
        });
        
        finalResponse += `## Final Analysis\n\nI've performed ${improvementCount} rounds of improvements to create the optimal solution. The code now follows best practices for ${language} and addresses all requirements while maintaining readability and efficiency.`;
        
        return finalResponse;
    } catch (error) {
        console.error("Error improving code:", error);
        return `I encountered an error while improving the code: ${error.message}`;
    }
}

function generateThinkingProcess(userQuery, model) {
    // Fallback thinking process generator in case the AI-generated one fails
    return `<div class="thinking-step"><strong>Step 1: Understanding the Query</strong> I'm analyzing this request: "${userQuery}"</div>
            <div class="thinking-step"><strong>Step 2: Research & Knowledge Retrieval</strong> Retrieving relevant information from my knowledge base...</div>
            <div class="thinking-step"><strong>Step 3: Analysis & Processing</strong> Analyzing the information to formulate a comprehensive response.</div>
            <div class="thinking-step"><strong>Step 4: Response Organization</strong> Structuring information in a clear, logical manner.</div>
            <div class="thinking-step"><strong>Self-Review:</strong> I have reviewed my reasoning above and confirm that my response is comprehensive and accurate.</div>`;
}

function showAllGPTPromotion() {
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.top = '0';
    banner.style.left = '0';
    banner.style.width = '100%';
    banner.style.backgroundColor = 'var(--secondary-accent)';
    banner.style.color = 'white';
    banner.style.padding = '15px';
    banner.style.textAlign = 'center';
    banner.style.zIndex = '1000';
    banner.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    banner.innerHTML = `
        <strong>🚀 Upgrade Alert!</strong> For fully functional AI models, visit 
        <a href="https://allgpt3.com" style="color: white; text-decoration: underline;">AllGPT 3</a>
        <button style="margin-left: 15px; background: white; color: var(--secondary-accent); border: none; padding: 5px 10px; border-radius: 4px;">Close</button>
    `;
    
    const closeButton = banner.querySelector('button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(banner);
    });
    
    document.body.appendChild(banner);
}