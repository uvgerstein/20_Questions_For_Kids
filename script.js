// Game state variables
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let usedQuestionSets = [];
const MAX_HISTORY = 10; // Track last 10 games to prevent repeats
const QUESTIONS_PER_GAME = 12; // Number of questions per game

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
startBtn.addEventListener('click', () => {
    playSound(clickSound);
    startGame();
});
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
    startBtn.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    answerContainer.classList.add('hidden');
    hintContainer.classList.add('hidden');
    
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
    
    // Provide feedback based on score
    if (score >= 11) {
        scoreMessage.textContent = "מצוין! אתה ממש חכם!";
    } else if (score >= 9) {
        scoreMessage.textContent = "כל הכבוד! אתה יודע הרבה דברים!";
    } else if (score >= 6) {
        scoreMessage.textContent = "טוב מאוד! למדת דברים חדשים?";
    } else if (score >= 3) {
        scoreMessage.textContent = "נחמד! עכשיו אתה יודע יותר!";
    } else {
        scoreMessage.textContent = "זה בסדר, בפעם הבאה תצליח יותר!";
    }
    
    // Reset progress bar for next game
    progressFill.style.width = "100%";
}

// Check if the DOM is loaded and initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Hide game and results initially
    gameContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    
    // Load question history if available
    loadQuestionHistory();
}); 