// Game state variables
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let usedQuestionSets = [];
const MAX_HISTORY = 10; // Track last 10 games to prevent repeats
const QUESTIONS_PER_GAME = 12; // Number of questions per game

// User state variables
let currentUser = null;
let users = []; // We'll load/save this later if needed
const avatars = [ // Updated avatar paths
    './avatars/Anna.png',
    './avatars/Dana.png',
    './avatars/Jane.png',
    './avatars/Mick.png',
];
let selectedAvatar = null;
let isLoading = false; // Flag to prevent issues during async confirm

// Sound effects
const clickSound = new Audio('audio/correct.mp3');
const fanfareSound = new Audio('audio/fanfare.mp3');
const correctSound = new Audio('audio/correct.mp3');

// Play sound function
function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

// DOM Elements
const startBtn = document.getElementById('start-btn');
const gameContainer = document.getElementById('game-container');
const questionText = document.getElementById('question-text');
const showHintBtn = document.getElementById('show-hint-btn');
const hintContainer = document.getElementById('hint-container');
const hintText = document.getElementById('hint-text');
const showAnswerBtn = document.getElementById('show-answer-btn');
const answerContainer = document.getElementById('answer-container');
const answerText = document.getElementById('answer-text');
const knewBtn = document.getElementById('knew-btn');
const didntKnowBtn = document.getElementById('didnt-know-btn');
const resultsContainer = document.getElementById('results-container');
const scoreElement = document.getElementById('score');
const scoreMessage = document.getElementById('score-message');
const restartBtn = document.getElementById('restart-btn');
const currentQuestionElement = document.getElementById('current-question');
const progressFill = document.getElementById('progress-fill');
const totalQuestionsElement = document.getElementById('total-questions');
// const quitBtn = document.getElementById('quit-btn'); // Remove reference for Quit button

// User selection DOM Elements
const userSelectionContainer = document.getElementById('user-selection-container');
const existingUsersDiv = document.getElementById('existing-users');
const newUserNameInput = document.getElementById('new-user-name');
const avatarSelectionDiv = document.getElementById('avatar-selection');
const confirmUserBtn = document.getElementById('confirm-user-btn');

// Current user display DOM Elements
const currentUserDisplay = document.getElementById('current-user-display');
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');
const avatarMenu = document.getElementById('avatar-menu'); // Get menu element
const saveProgressBtn = document.getElementById('save-progress-btn');
const startOverBtn = document.getElementById('start-over-btn');
const quitMenuBtn = document.getElementById('quit-menu-btn');

// Load previous question history from localStorage
function loadQuestionHistory() {
    const savedHistory = localStorage.getItem('questionHistory');
    if (savedHistory) {
        usedQuestionSets = JSON.parse(savedHistory);
    }
}

// Save current question history to localStorage
function saveQuestionHistory() {
    localStorage.setItem('questionHistory', JSON.stringify(usedQuestionSets));
}

// Event Listeners
confirmUserBtn.addEventListener('click', handleUserConfirmation);
showHintBtn.addEventListener('click', () => {
    playSound(clickSound);
    showHint();
});
showAnswerBtn.addEventListener('click', () => {
    playSound(clickSound);
    showAnswer();
});
knewBtn.addEventListener('click', () => {
    playSound(correctSound);
    handleAnswer(true);
});
didntKnowBtn.addEventListener('click', () => {
    playSound(clickSound);
    handleAnswer(false);
});
restartBtn.addEventListener('click', () => {
    playSound(clickSound);
    startGame();
});
// quitBtn.addEventListener('click', quitGame); // Remove listener for Quit button

// Listener for the main user display area to toggle the menu
currentUserDisplay.addEventListener('click', () => {
    // Only toggle if game is active (game container is visible)
    if (!gameContainer.classList.contains('hidden')) {
        avatarMenu.classList.toggle('hidden');
    }
});

// Listeners for the avatar menu buttons
saveProgressBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent click from bubbling up to currentUserDisplay
    saveUserProgress();
});

startOverBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    playSound(clickSound);
    avatarMenu.classList.add('hidden');
    startGame(); // Restart game for current user
});

quitMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarMenu.classList.add('hidden');
    quitGame(); // Go back to user selection
});

// Initialize the game
async function startGame() { 
    currentQuestionIndex = 0;
    score = 0;
    loadQuestionHistory();
    
    let fetchedQuestions;
    try {
        fetchedQuestions = await fetchQuestionsFromGeminiAPI(QUESTIONS_PER_GAME);
    } catch (apiError) {
        // This catch block might be redundant if fetchQuestionsFromGeminiAPI handles its own errors and returns a fallback.
        // However, it can catch errors if fetchQuestionsFromGeminiAPI itself throws an unhandled exception before returning.
        console.error("Critical error calling fetchQuestionsFromGeminiAPI:", apiError);
        fetchedQuestions = [ 
            { question: "API Call Error: What planet is known for its rings?", answer: "Saturn", hint: "It\'s a gas giant." }
        ];
    }

    if (!fetchedQuestions || fetchedQuestions.length === 0) {
        console.warn("API returned no questions or an error occurred. Using fallback questions for game logic.");
        fetchedQuestions = [ 
            { question: "What do bees make?", answer: "Honey", hint: "It\'s sweet." },
            { question: "How many days are in a week?", answer: "Seven", hint: "Starts with S." }
        ];
    }
    
    currentQuestions = getUniqueQuestions(fetchedQuestions, QUESTIONS_PER_GAME); 

    if (!currentQuestions || currentQuestions.length === 0) {
         console.error("After filtering, no questions are available. This might happen if all API questions were recently used or API failed critically. Providing emergency fallback.");
         alert("Could not load unique questions for the game. Please try restarting.");
         currentQuestions = [{ question: "Emergency Fallback: What is 1+1?", answer: "2", hint: "A basic sum."}];
    }
    
    const currentQuestionTexts = currentQuestions.map(q => q.question);
    usedQuestionSets.push(currentQuestionTexts);
    
    if (usedQuestionSets.length > MAX_HISTORY) {
        usedQuestionSets = usedQuestionSets.slice(-MAX_HISTORY);
    }
    saveQuestionHistory();
    
    // Updated UI setup with cleaner hiding/showing
    userSelectionContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    currentUserDisplay.classList.remove('hidden');
    
    // Make sure hint and answer containers are properly hidden
    answerContainer.classList.add('hidden');
    hintContainer.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');
    showHintBtn.classList.remove('hidden');
    avatarMenu.classList.add('hidden'); 
    
    totalQuestionsElement.textContent = currentQuestions.length > 0 ? currentQuestions.length : QUESTIONS_PER_GAME;

    if (currentQuestions.length > 0) {
        showQuestion();
    } else {
        // Handle the case where no questions could be loaded at all.
        questionText.textContent = "No questions available to display. Please try again later.";
        // Disable game buttons or show an appropriate message
        console.error("No questions loaded to start the game.");
    }
}

// Modified getUniqueQuestions to work with API-fetched questions
function getUniqueQuestions(questionsFromApi, count = QUESTIONS_PER_GAME) {
    if (!questionsFromApi || questionsFromApi.length === 0) {
        console.warn("getUniqueQuestions called with an empty or null list of questions.");
        return [];
    }

    const recentlyUsedQuestionTexts = usedQuestionSets.flat();
    let availableQuestions = questionsFromApi.filter(q => q && q.question && !recentlyUsedQuestionTexts.includes(q.question));
    
    if (availableQuestions.length < count && questionsFromApi.length > 0) {
        // If filtering made the list too short, but the original API list had items
        console.warn(`Only ${availableQuestions.length} unique (not recently used) questions found from API set of ${questionsFromApi.length}. If this is less than ${count}, some questions might be repeated from recent global history or API provided fewer unique ones than desired after filtering.`);
        // If not enough unique questions, and we need to fill up to 'count', we might reuse from the original API set, preferring those not in 'recentlyUsedQuestionTexts'
        if (availableQuestions.length === 0 && questionsFromApi.length > 0) {
             console.warn("All questions from the API batch were in usedQuestionSets. Re-using directly from API batch for this game.");
             availableQuestions = [...questionsFromApi]; // Use the API questions, will be shuffled next
        }
    }
    
    // Shuffle the (filtered or fallback) available questions
    for (let i = availableQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
    }
    
    return availableQuestions.slice(0, Math.min(count, availableQuestions.length));
}

// Display the current question
function showQuestion() {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    
    const questionContainer = document.getElementById('question-container');
    
    // Animation effect
    questionContainer.style.opacity = "0";
    questionContainer.style.transform = "translateY(20px)";
    
    setTimeout(() => {
        questionText.textContent = currentQuestion.question;
        
        // Show with animation
        questionContainer.style.opacity = "1";
        questionContainer.style.transform = "translateY(0)";
        questionContainer.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    }, 100);
    
    // Reset containers - modified for our new approach
    answerContainer.classList.add('hidden');
    hintContainer.classList.add('hidden');
    showAnswerBtn.classList.remove('hidden');
    showHintBtn.classList.remove('hidden');
    
    // Update progress
    currentQuestionElement.textContent = currentQuestionIndex + 1;
    const progressPercentage = ((currentQuestionIndex) / QUESTIONS_PER_GAME) * 100;
    progressFill.style.width = `${progressPercentage}%`;
}

// Show hint for the current question
function showHint() {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    
    if (currentQuestion.hint) {
        hintText.textContent = currentQuestion.hint;
        
        // Simplified to use CSS transitions
        hintContainer.classList.remove('hidden');
        showHintBtn.classList.add('hidden');
    }
}

// Reveal the answer
function showAnswer() {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    
    answerText.textContent = currentQuestion.answer;
    
    // Simplified to use CSS transitions
    answerContainer.classList.remove('hidden');
    showAnswerBtn.classList.add('hidden');
    showHintBtn.classList.add('hidden');
}

// Handle user feedback about whether they knew the answer
function handleAnswer(knew) {
    if (knew) {
        score++;
    }
    
    // Move to next question or end game
    currentQuestionIndex++;
    
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        endGame();
    }
}

// End the game and show results
function endGame() {
    gameContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    avatarMenu.classList.add('hidden');
    
    // Play fanfare sound
    playSound(fanfareSound);
    
    // Update score
    scoreElement.textContent = score;
    
    // Personalized message with name
    let messagePrefix = `כל הכבוד, ${currentUser.name}!`; 
    if (currentQuestions.length > 0) { // Avoid division by zero if no questions
      messagePrefix += ` ${score}/${currentQuestions.length}.`;
    } else {
      messagePrefix += ` ציון: ${score}.`;
    }

    // Provide feedback based on score (Reverting to original Hebrew messages)
    let feedbackMessage = "";
    if (score >= 11) {
        feedbackMessage = "מצוין! אתה ממש חכם!";
    } else if (score >= 9) {
        feedbackMessage = "כל הכבוד! אתה יודע הרבה דברים!";
    } else if (score >= 6) {
        feedbackMessage = "טוב מאוד! למדת דברים חדשים?";
    } else if (score >= 3) {
        feedbackMessage = "נחמד! עכשיו אתה יודע יותר!";
    } else {
        feedbackMessage = "זה בסדר, בפעם הבאה תצליח יותר!";
    }
    scoreMessage.textContent = `${messagePrefix} ${feedbackMessage}`; // Combine personalized prefix and feedback
    
    // Clear saved progress for this user upon completion
    if (currentUser) {
        const storageKey = `userProgress_${currentUser.name}`;
        localStorage.removeItem(storageKey);
        console.log(`Cleared saved progress for ${currentUser.name} upon game completion.`);
    }
}

// Populate avatar choices in the UI
function populateAvatars() {
    avatarSelectionDiv.innerHTML = '<h4>בחר תמונה:</h4>'; // Translate title
    avatars.forEach(avatarSrc => {
        const avatarWrapper = document.createElement('div');
        avatarWrapper.classList.add('avatar-choice');
        const img = document.createElement('img');
        img.src = avatarSrc;
        img.alt = 'תמונה'; // Translate alt text
        img.addEventListener('click', () => {
            // Remove selected class from previously selected avatar
            const currentlySelected = avatarSelectionDiv.querySelector('.selected');
            if (currentlySelected) {
                currentlySelected.classList.remove('selected');
            }
            // Add selected class to clicked avatar
            avatarWrapper.classList.add('selected');
            selectedAvatar = avatarSrc;
        });
        avatarWrapper.appendChild(img);
        avatarSelectionDiv.appendChild(avatarWrapper);
    });
}

// --- NEW Load and Resume Game Logic ---
function checkForSavedGame(userName) {
    const storageKey = `userProgress_${userName}`;
    try {
        const savedDataString = localStorage.getItem(storageKey);
        if (savedDataString) {
            const savedData = JSON.parse(savedDataString);
            // Basic validation: check if essential properties exist
            if (savedData && typeof savedData.currentQuestionIndex === 'number' && savedData.currentQuestions) {
                console.log(`Found saved game for ${userName}:`, savedData);
                return { exists: true, data: savedData, key: storageKey };
            } else {
                console.warn(`Invalid saved data found for ${userName}, removing.`);
                localStorage.removeItem(storageKey); // Clean up invalid data
                return { exists: false };
            }
        } 
    } catch (error) {
        console.error("Error reading or parsing saved game:", error);
        // Optional: Clean up potentially corrupted data
        // localStorage.removeItem(storageKey);
    }
    return { exists: false };
}

function resumeGame(savedData) {
    console.log("Resuming game...");
    // Restore game state
    score = savedData.score || 0;
    currentQuestionIndex = savedData.currentQuestionIndex || 0;
    currentQuestions = savedData.currentQuestions || [];
    // Restore used questions history (if saved)
    if (savedData.usedQuestionSets) {
        usedQuestionSets = savedData.usedQuestionSets;
    }
    
    // Ensure currentQuestions is not empty if index is > 0
    if (currentQuestions.length === 0 && currentQuestionIndex > 0) {
        console.error("Cannot resume game: Saved question list is empty.");
        alert("שגיאה בטעינת המשחק השמור. מתחיל משחק חדש."); // Error loading saved game. Starting new game.
        startGame(); // Fallback to a new game
        return;
    }

    // Update UI elements
    userSelectionContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    currentUserDisplay.classList.remove('hidden');
    avatarMenu.classList.add('hidden');
    
    // Update user display (already set in handleUserConfirmation)
    // currentUserAvatar.src = currentUser.avatar;
    // currentUserName.textContent = currentUser.name;

    // Update total questions display
    totalQuestionsElement.textContent = currentQuestions.length > 0 ? currentQuestions.length : QUESTIONS_PER_GAME;

    // Show the question user was on
    showQuestion(); 
}

// --- MODIFIED Handle User Confirmation ---
async function handleUserConfirmation() { 
    if (isLoading) return; 
    isLoading = true;

    const userName = newUserNameInput.value.trim();

    if (!userName) {
        alert('אנא הכנס שם!');
        isLoading = false;
        return;
    }
    if (!selectedAvatar) {
        alert('אנא בחר תמונה!');
        isLoading = false;
        return;
    }

    currentUser = {
        name: userName,
        avatar: selectedAvatar
    };

    currentUserAvatar.src = currentUser.avatar;
    currentUserName.textContent = currentUser.name;

    const savedGameCheck = checkForSavedGame(userName);

    if (savedGameCheck.exists) {
        const wantsToResume = confirm("נמצא משחק שמור. האם תרצה להמשיך?"); 

        if (wantsToResume) {
            resumeGame(savedGameCheck.data);
        } else {
            localStorage.removeItem(savedGameCheck.key);
            console.log("User declined resume. Starting new game.");
            playSound(clickSound);
            await startGame(); 
        }
    } else {
        playSound(clickSound);
        await startGame(); 
    }
    
    isLoading = false;
}

// Check if the DOM is loaded and initialize the game
document.addEventListener('DOMContentLoaded', () => {
    totalQuestionsElement.textContent = QUESTIONS_PER_GAME;
    populateAvatars();

    // Initial state: Show user selection, hide game/results/user display
    userSelectionContainer.classList.remove('hidden');
    gameContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    currentUserDisplay.classList.add('hidden');
    startBtn.classList.add('hidden');
});

// --- NEW Save User Progress --- 
function saveUserProgress() {
    if (!currentUser) return; // Should not happen if menu is visible, but safety check

    const progressData = {
        score: score,
        currentQuestionIndex: currentQuestionIndex,
        // Storing full question objects might be large, consider storing only IDs/texts if needed
        currentQuestions: currentQuestions, 
        usedQuestionSets: usedQuestionSets // Save global history for now, could be user-specific later
        // timestamp: Date.now() // Optional: add a timestamp
    };

    try {
        // Use a key specific to the user
        const storageKey = `userProgress_${currentUser.name}`;
        localStorage.setItem(storageKey, JSON.stringify(progressData));
        alert('ההתקדמות נשמרה!'); // Progress Saved!
        console.log(`Progress saved for ${currentUser.name}`, progressData);
    } catch (error) {
        console.error("Error saving progress to localStorage:", error);
        alert('אירעה שגיאה בשמירת ההתקדמות.'); // Error saving progress.
    }
    avatarMenu.classList.add('hidden'); // Hide menu after action
}

// --- Quit Game Function ---
function quitGame() {
    playSound(clickSound);
    gameContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    currentUserDisplay.classList.add('hidden');
    avatarMenu.classList.add('hidden'); // Hide avatar menu too
    userSelectionContainer.classList.remove('hidden');
    // Reset selected avatar highlight
    const currentlySelected = avatarSelectionDiv.querySelector('.selected');
    if (currentlySelected) {
        currentlySelected.classList.remove('selected');
    }
    selectedAvatar = null;
    // Maybe clear the name input? 
    // newUserNameInput.value = ''; 
    currentUser = null; // Reset current user
}

// NEW: Function to fetch questions from your Netlify Function
async function fetchQuestionsFromGeminiAPI(count = QUESTIONS_PER_GAME) {
    // The URL now points to your Netlify Function.
    // We pass the desired count as a query parameter.
    const netlifyFunctionUrl = `/.netlify/functions/get-questions?count=${count}`;

    try {
        const response = await fetch(netlifyFunctionUrl);

        if (!response.ok) {
            // Try to parse error response from our Netlify function, which should be JSON
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // If error response isn't JSON, use text
                errorData = { error: await response.text() };
            }
            console.error('Netlify function request failed:', response.status, errorData);
            throw new Error(`Failed to fetch questions: ${errorData.error || response.statusText}`);
        }

        // The Netlify function's body is expected to be a JSON string
        // containing the array of questions.
        const questionsJsonString = await response.text();
        const questions = JSON.parse(questionsJsonString);

        if (!Array.isArray(questions) || !questions.every(q => q.question && q.answer)) {
            console.error("Parsed questions from Netlify function are not in the expected format:", questions);
            throw new Error("Formatted questions from server are invalid.");
        }
        // The Netlify function should already slice to count, but we can be defensive
        return questions.slice(0, count);

    } catch (error) {
        console.error('Error fetching questions from Netlify function:', error);
        alert('Could not load questions. Using sample questions. Error: ' + error.message);
        // Fallback to default questions
        return [
            { question: "Fallback: What is the capital of France?", answer: "Paris", hint: "Has a famous tower." },
            { question: "Fallback: Which animal is the King of the Jungle?", answer: "Lion", hint: "It has a large mane." }
        ].slice(0, count);
    }
} 