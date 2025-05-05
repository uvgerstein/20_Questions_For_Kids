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
function startGame() {
    // Reset game state
    currentQuestionIndex = 0;
    score = 0;
    
    // Get new set of questions without repeats from recent games
    loadQuestionHistory();
    currentQuestions = getUniqueQuestions(QUESTIONS_PER_GAME);
    
    // Add current question IDs to history
    const currentQuestionIds = currentQuestions.map(q => q.question);
    usedQuestionSets.push(currentQuestionIds);
    
    // Keep only the most recent MAX_HISTORY game histories
    if (usedQuestionSets.length > MAX_HISTORY) {
        usedQuestionSets = usedQuestionSets.slice(-MAX_HISTORY);
    }
    
    // Save updated history
    saveQuestionHistory();
    
    // Reset UI
    resultsContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    answerContainer.classList.add('hidden');
    hintContainer.classList.add('hidden');
    avatarMenu.classList.add('hidden'); // Ensure menu is hidden at game start
    
    // Update total questions display
    totalQuestionsElement.textContent = QUESTIONS_PER_GAME;
    
    // Show the first question
    showQuestion();
}

// Get questions that haven't been used in recent games
function getUniqueQuestions(count = QUESTIONS_PER_GAME) {
    // Create a flattened array of all recently used question texts
    const recentlyUsedQuestions = usedQuestionSets.flat();
    
    // Create a copy of all questions and filter out recently used ones if possible
    let availableQuestions = [...allQuestions];
    
    // If we have enough questions to avoid repeats
    if (allQuestions.length - recentlyUsedQuestions.length >= count) {
        availableQuestions = allQuestions.filter(q => !recentlyUsedQuestions.includes(q.question));
    }
    
    // Shuffle the available questions
    for (let i = availableQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
    }
    
    // Return the first 'count' questions, or all if we don't have enough
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
    
    // Reset containers
    document.getElementById('answer-container').classList.add('hidden');
    document.getElementById('hint-container').classList.add('hidden');
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
        
        // Set initial state for animation
        hintContainer.style.opacity = "0";
        hintContainer.style.transform = "translateY(20px)";
        
        // Show element and animate
        hintContainer.classList.remove('hidden');
        showHintBtn.classList.add('hidden');
        
        setTimeout(() => {
            hintContainer.style.opacity = "1";
            hintContainer.style.transform = "translateY(0)";
            hintContainer.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        }, 10);
    }
}

// Reveal the answer
function showAnswer() {
    const currentQuestion = currentQuestions[currentQuestionIndex];
    
    answerText.textContent = currentQuestion.answer;
    
    // Set initial state for animation
    answerContainer.style.opacity = "0";
    answerContainer.style.transform = "translateY(20px)";
    
    // Show element and animate
    answerContainer.classList.remove('hidden');
    showAnswerBtn.classList.add('hidden');
    showHintBtn.classList.add('hidden');
    
    setTimeout(() => {
        answerContainer.style.opacity = "1";
        answerContainer.style.transform = "translateY(0)";
        answerContainer.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    }, 10);
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
    
    avatarMenu.classList.add('hidden'); // Ensure menu is hidden at game end
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

// Handle user confirmation/creation
function handleUserConfirmation() {
    const userName = newUserNameInput.value.trim();

    if (!userName) {
        alert('אנא הכנס שם!'); // Translate alert
        return;
    }
    if (!selectedAvatar) {
        alert('אנא בחר תמונה!'); // Translate alert
        return;
    }

    // Simple user creation (no persistence yet)
    currentUser = {
        name: userName,
        avatar: selectedAvatar
    };
    users.push(currentUser);

    // Update current user display
    currentUserAvatar.src = currentUser.avatar;
    currentUserName.textContent = currentUser.name;
    currentUserDisplay.classList.remove('hidden');

    // Hide user selection and show game
    userSelectionContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    playSound(clickSound);
    startGame();
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