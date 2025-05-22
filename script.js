// Game state variables
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let usedQuestionSets = [];
const MAX_HISTORY = 30; // Increased from 10 to 30 to track more history
const QUESTIONS_PER_GAME = 12; // Number of questions per game

// User state variables
let currentUser = null;
let users = []; // We'll load/save this later if needed
const avatars = [ // Updated avatar paths
    './avatars/Updated avatars/Dina.jpg',
    './avatars/Updated avatars/Dan.jpg',
    './avatars/Updated avatars/Joan.jpg',
    './avatars/Updated avatars/Timmy.jpg',
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
const ageButtons = document.querySelectorAll('.age-btn');
const avatarSelectionDiv = document.getElementById('avatar-selection');
const confirmUserBtn = document.getElementById('confirm-user-btn');

// Profile confirmation DOM Elements
const profileConfirmationContainer = document.getElementById('profile-confirmation-container');
const previewAvatar = document.getElementById('preview-avatar');
const previewName = document.getElementById('preview-name');
const previewAge = document.getElementById('preview-age').querySelector('span');
const startGameBtn = document.getElementById('start-game-btn');
const backToSelectionBtn = document.getElementById('back-to-selection-btn');

// Current user display DOM Elements
const currentUserDisplay = document.getElementById('current-user-display');
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');
const avatarMenu = document.getElementById('avatar-menu'); // Get menu element
const saveProgressBtn = document.getElementById('save-progress-btn');
const startOverBtn = document.getElementById('start-over-btn');
const quitMenuBtn = document.getElementById('quit-menu-btn');

// Additional DOM Elements for loading
const loadingIndicator = document.getElementById('loading-indicator');

// Functions to handle loading states
function setButtonLoading(button, loadingText) {
    const originalText = button.textContent;
    button.classList.add('btn-loading');
    if (loadingText) {
        button.innerHTML = `<span class="loading-text">${loadingText}</span>`;
    }
    return originalText; // Return original text so we can restore it later
}

function clearButtonLoading(button, originalText) {
    button.classList.remove('btn-loading');
    if (originalText) {
        button.textContent = originalText;
    }
}

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
startGameBtn.addEventListener('click', handleStartGame);
backToSelectionBtn.addEventListener('click', () => {
    profileConfirmationContainer.classList.add('hidden');
    userSelectionContainer.classList.remove('hidden');
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
    const originalText = setButtonLoading(restartBtn, "מטעין שאלות");
    startGame().finally(() => {
        clearButtonLoading(restartBtn, originalText);
    });
});
// quitBtn.addEventListener('click', quitGame); // Remove listener for Quit button

// Listener for the main user display area to toggle the menu
currentUserDisplay.addEventListener('click', (e) => {
    console.log("Avatar clicked - game container hidden:", gameContainer.classList.contains('hidden'));
    // Make sure the menu is positioned correctly relative to the avatar
    // Prevent event bubbling if clicking on the avatar menu itself
    if (e.target.closest('#avatar-menu')) {
        return;
    }
    
    // Always toggle the menu when the profile avatar is clicked, regardless of game state
    avatarMenu.classList.toggle('hidden');
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
    const originalText = setButtonLoading(startOverBtn, "מטעין שאלות");
    startGame().finally(() => {
        clearButtonLoading(startOverBtn, originalText);
    });
});

quitMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarMenu.classList.add('hidden');
    quitGame(); // Go back to user selection
});

// Function to show loading indicator
function showLoading() {
    loadingIndicator.classList.remove('hidden');
}

// Function to hide loading indicator
function hideLoading() {
    loadingIndicator.classList.add('hidden');
}

// Initialize the game
async function startGame() {
    currentQuestionIndex = 0;
    score = 0;
    
    loadQuestionHistory();
    
    // Show loading indicator for the API call
    showLoading();
    
    // Get the user's age for question difficulty
    const userAge = currentUser && currentUser.age ? currentUser.age : 6;
    console.log(`Starting game for user: ${currentUser ? currentUser.name : 'Guest'}, Age: ${userAge}`);
    
    let fetchedQuestions;
    try {
        fetchedQuestions = await fetchQuestionsFromGeminiAPI(QUESTIONS_PER_GAME, userAge);
    } catch (apiError) {
        // This catch block might be redundant if fetchQuestionsFromGeminiAPI handles its own errors and returns a fallback.
        // However, it can catch errors if fetchQuestionsFromGeminiAPI itself throws an unhandled exception before returning.
        console.error("Critical error calling fetchQuestionsFromGeminiAPI:", apiError);
        fetchedQuestions = [ 
            { question: "API Call Error: What planet is known for its rings?", answer: "Saturn", hint: "It\'s a gas giant." }
        ];
    } finally {
        // Hide loading indicator when API call completes
        hideLoading();
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
    
    userSelectionContainer.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    currentUserDisplay.classList.remove('hidden');
    answerContainer.classList.add('hidden');
    hintContainer.classList.add('hidden');
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

    // Get all recently used question texts as a flat array
    const recentlyUsedQuestionTexts = usedQuestionSets.flat();
    
    // Weight more recent questions higher for filtering
    // Create a map to track how recently each question was used
    const questionRecencyMap = {};
    recentlyUsedQuestionTexts.forEach((questionText, index) => {
        // Calculate a recency score - higher means more recently used
        const gameIndex = Math.floor(index / QUESTIONS_PER_GAME); // Which game this question was from
        const recencyScore = usedQuestionSets.length - gameIndex; // More recent = higher score
        questionRecencyMap[questionText] = Math.max(recencyScore, questionRecencyMap[questionText] || 0);
    });

    // Filter out recently used questions
    let availableQuestions = questionsFromApi.filter(q => {
        if (!q || !q.question) return false;
        // If it's not in history at all, keep it 
        if (!questionRecencyMap[q.question]) return true;
        // If it's been used in the last 2 games, filter it out
        if (questionRecencyMap[q.question] >= (usedQuestionSets.length - 1)) return false;
        // Keep older questions
        return true;
    });
    
    if (availableQuestions.length < count && questionsFromApi.length > 0) {
        // If filtering made the list too short, but the original API list had items
        console.warn(`Only ${availableQuestions.length} unique (not recently used) questions found from API set of ${questionsFromApi.length}. If this is less than ${count}, some questions might be repeated from recent global history or API provided fewer unique ones than desired after filtering.`);
        
        // If not enough unique questions, gradually relax our filtering
        if (availableQuestions.length === 0) {
            console.warn("All questions from the API batch were too recent. Relaxing filters.");
            // Allow questions except those from the very most recent game
            availableQuestions = questionsFromApi.filter(q => {
                if (!q || !q.question) return false;
                if (!questionRecencyMap[q.question]) return true;
                // Only filter out questions from the most recent game
                return questionRecencyMap[q.question] < usedQuestionSets.length;
            });
            
            // If still empty, use the API questions, will be shuffled next
            if (availableQuestions.length === 0) {
                console.warn("All questions from the API batch were in the most recent game. Re-using directly from API batch for this game.");
                availableQuestions = [...questionsFromApi];
            }
        }
    }
    
    // Shuffle the (filtered or fallback) available questions
    for (let i = availableQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableQuestions[i], availableQuestions[j]] = [availableQuestions[j], availableQuestions[i]];
    }
    
    // Request more questions if we don't have enough after filtering
    if (availableQuestions.length < count && count > 0) {
        console.warn(`After filtering and shuffling, only have ${availableQuestions.length} questions, which is fewer than the ${count} requested.`);
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
    
    // Restore user info if available
    if (savedData.user && savedData.user.age) {
        currentUser.age = savedData.user.age;
        
        // Update the selected age button in the UI
        ageButtons.forEach(btn => {
            btn.classList.remove('selected');
            if (parseInt(btn.dataset.age) === currentUser.age) {
                btn.classList.add('selected');
            }
        });
    }
    
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
    
    // Update total questions display
    totalQuestionsElement.textContent = currentQuestions.length > 0 ? currentQuestions.length : QUESTIONS_PER_GAME;

    // Show the question user was on
    showQuestion(); 
}

// --- MODIFIED Handle User Confirmation ---
function handleUserConfirmation() {
    if (isLoading) return; // Prevent double-clicks during loading
    
    // Get user information
    const userNameInput = newUserNameInput.value.trim();
    const selectedAgeBtn = document.querySelector('.age-btn.selected');
    const userAge = selectedAgeBtn ? parseInt(selectedAgeBtn.dataset.age) : 6; // Default to 6 if no selection
    
    // Validate that a name has been entered
    if (!userNameInput) {
        alert("אנא הכנס את שמך לפני שתמשיך");
        newUserNameInput.focus();
        return;
    }
    
    // If no avatar was selected, use the first one as default
    if (!selectedAvatar && avatars.length > 0) {
        selectedAvatar = avatars[0];
    }
    
    // Set current user with age property
    currentUser = {
        name: userNameInput,
        avatar: selectedAvatar,
        age: userAge
    };
    
    // Display the profile preview
    previewAvatar.src = currentUser.avatar;
    previewName.textContent = currentUser.name;
    previewAge.textContent = currentUser.age;
    
    // Hide user selection and show profile confirmation
    userSelectionContainer.classList.add('hidden');
    profileConfirmationContainer.classList.remove('hidden');
    
    // Play a sound for the transition
    playSound(clickSound);
}

// --- NEW Handle Start Game ---
async function handleStartGame() {
    if (isLoading) return; // Prevent double-clicks during loading
    isLoading = true;
    
    // Show loading state on button
    const originalText = setButtonLoading(startGameBtn, "מטעין שאלות");
    
    // Set up display with user info for the game header
    currentUserAvatar.src = currentUser.avatar;
    currentUserName.textContent = currentUser.name;
    
    try {
        // Check for existing saved game
        const hasSavedGame = checkForSavedGame(currentUser.name);
        
        if (hasSavedGame && hasSavedGame.exists) {
            // Ask if user wants to resume
            const shouldResume = confirm(`ברוך שובך, ${currentUser.name}! רוצה להמשיך את המשחק האחרון שלך?`);
            
            if (shouldResume) {
                console.log("User chose to resume saved game");
                resumeGame(hasSavedGame.data);
            } else {
                console.log("User declined resume. Starting new game.");
                localStorage.removeItem(hasSavedGame.key);
                await startGame();
            }
        } else {
            // No saved game, so start a new game
            await startGame();
        }
    } catch (error) {
        console.error("Error starting game:", error);
        alert("אירעה שגיאה בהתחלת המשחק. נסה שוב.");
    } finally {
        clearButtonLoading(startGameBtn, originalText);
        isLoading = false;
    }
    
    // Hide profile confirmation
    profileConfirmationContainer.classList.add('hidden');
    
    // Hide start button as it's not needed anymore
    startBtn.classList.add('hidden');
}

// Check if the DOM is loaded and initialize the game
document.addEventListener('DOMContentLoaded', () => {
    totalQuestionsElement.textContent = QUESTIONS_PER_GAME;
    populateAvatars();

    // Add event listeners for age buttons
    ageButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons
            ageButtons.forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            button.classList.add('selected');
        });
    });
    
    // Select default age button (age 6)
    const defaultAgeBtn = document.querySelector('.age-btn[data-age="6"]');
    if (defaultAgeBtn) {
        defaultAgeBtn.classList.add('selected');
    }

    // Initial state: Show user selection, hide profile confirmation, game, results, user display
    userSelectionContainer.classList.remove('hidden');
    profileConfirmationContainer.classList.add('hidden');
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
        usedQuestionSets: usedQuestionSets, // Save global history for now, could be user-specific later
        // Save user details including age
        user: {
            name: currentUser.name,
            avatar: currentUser.avatar,
            age: currentUser.age || 6
        }
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
    profileConfirmationContainer.classList.add('hidden'); // Hide profile confirmation too
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

// Function to filter out bad questions that slipped through the API prompt
function filterBadQuestions(questions) {
    if (!questions || !Array.isArray(questions)) return [];
    
    return questions.filter(q => {
        if (!q || !q.question || !q.answer) return false;
        
        // Strip punctuation and normalize Hebrew text
        const normalizeHebrewText = (text) => {
            return text.replace(/[.,?!:;""''־]/g, '')  // Remove common punctuation
                      .replace(/\s+/g, ' ')           // Normalize whitespace
                      .trim()                         // Trim leading/trailing spaces
                      .toLowerCase();                 // Convert to lowercase
        };
        
        const questionText = normalizeHebrewText(q.question);
        const answerText = normalizeHebrewText(q.answer);
        
        // 1. Direct containment check
        if (questionText.includes(answerText)) {
            console.warn(`Filtering out bad question "${q.question}" - contains answer "${q.answer}"`);
            return false;
        }
        
        // 2. Check for singular form of plural answers (remove ים or ות ending)
        if (answerText.endsWith('ים')) {
            const singularForm = answerText.slice(0, -2);
            if (singularForm.length > 1 && questionText.includes(singularForm)) {
                console.warn(`Filtering out question with singular form match: "${q.question}" / "${q.answer}"`);
                return false;
            }
        } else if (answerText.endsWith('ות')) {
            const singularForm = answerText.slice(0, -2);
            if (singularForm.length > 1 && questionText.includes(singularForm)) {
                console.warn(`Filtering out question with singular form match: "${q.question}" / "${q.answer}"`);
                return false;
            }
        }
        
        // 3. Check construct state (סמיכות) - common in Hebrew
        // Examples: "מאיזה צמח מכינים שמן זית" - where זית appears in שמן זית
        const words = questionText.split(' ');
        for (let i = 0; i < words.length - 1; i++) {
            const constructState = words[i] + ' ' + words[i+1];
            if (constructState.includes(answerText) || 
                (words[i+1] === answerText) ||
                (answerText.length > 2 && words[i+1].includes(answerText))) {
                console.warn(`Filtering out question with construct state containing answer: "${q.question}" / "${q.answer}"`);
                return false;
            }
        }
        
        // 4. Check if the question is just asking for the name of something (definition questions)
        const definitionPatterns = [
            'מה שמו של', 'מה שמה של', 'איך קוראים ל', 'מהו השם של',
            'מהו שמו של', 'מהו שמה של', 'מי המציא את', 'מי גילה את'
        ];
        
        if (definitionPatterns.some(pattern => questionText.includes(pattern))) {
            // These questions are often problematic, so log them for review
            console.log(`Potential definition question (review manually): "${q.question}" / "${q.answer}"`);
        }
        
        // Keep the question if it passed all checks
        return true;
    });
}

// Function to fetch questions from Netlify Function with improved error handling
async function fetchQuestionsFromGeminiAPI(count = QUESTIONS_PER_GAME, age = 6) {
    // Determine age group for question complexity
    let ageGroup = "5-6"; // default age group
    if (age >= 5 && age <= 6) {
        ageGroup = "5-6"; // Easier questions
    } else if (age >= 7 && age <= 8) {
        ageGroup = "7-8"; // Medium difficulty
    } else if (age >= 9 && age <= 10) {
        ageGroup = "9-10"; // More complex questions
    }
    
    // Request more questions than needed to give us a buffer for filtering
    const requestCount = Math.min(count * 3, 30); // Ask for up to 3x questions (max 30)
    
    // Try both URLs - first the Netlify function URL, then fallback to our serverless function
    const netlifyFunctionUrl = `/.netlify/functions/get-questions?count=${requestCount}&ageGroup=${ageGroup}`;
    const fallbackFunctionUrl = `/api/get-questions?count=${requestCount}&ageGroup=${ageGroup}`;
    
    console.log(`Fetching ${requestCount} questions for age group: ${ageGroup}`);

    try {
        // Try Netlify function first
        let response;
        try {
            response = await fetch(netlifyFunctionUrl, {
                // Add timeout to prevent long waiting
                signal: AbortSignal.timeout(15000) // 15-second timeout
            });
        } catch (netlifyError) {
            console.warn('Error with Netlify function, trying fallback URL:', netlifyError);
            // If Netlify function fails, try the fallback URL
            response = await fetch(fallbackFunctionUrl, {
                signal: AbortSignal.timeout(15000) // 15-second timeout 
            });
        }

        if (!response.ok) {
            // Log the error but don't throw - we'll use fallback questions
            console.warn('Function request failed with status:', response.status);
            // Use fallback questions instead
            return getFallbackQuestions(ageGroup, count);
        }

        // Parse the response text as JSON
        const questionsJsonString = await response.text();
        let questions;
        try {
            questions = JSON.parse(questionsJsonString);
        } catch (parseError) {
            console.error("Failed to parse response as JSON:", parseError);
            return getFallbackQuestions(ageGroup, count);
        }

        if (!Array.isArray(questions) || !questions.every(q => q.question && q.answer)) {
            console.error("Parsed questions are not in the expected format:", questions);
            return getFallbackQuestions(ageGroup, count);
        }
        
        // Apply client-side filtering to catch any bad questions
        const filteredQuestions = filterBadQuestions(questions);
        console.log(`Filtered out ${questions.length - filteredQuestions.length} bad questions`);
        
        // Return the requested number of questions
        return filteredQuestions.slice(0, count);

    } catch (error) {
        console.error('Error fetching questions:', error);
        return getFallbackQuestions(ageGroup, count);
    }
}

// Get local fallback questions by age group
function getFallbackQuestions(ageGroup, count) {
    let fallbackQuestions = [];
    
    if (ageGroup === "5-6") {
        fallbackQuestions = [
            { question: "איזו חיה אומרת 'מיאו'?", answer: "חתול", hint: "חיית מחמד פופולרית." },
            { question: "איזה צבע השמיים ביום בהיר?", answer: "כחול", hint: "צבע חשוב בדגל ישראל." },
            { question: "מה האות הראשונה בא-ב?", answer: "א", hint: "האות הראשונה באלפבית." },
            { question: "איזה צבע העגבנייה הבשלה?", answer: "אדום", hint: "הצבע של אש." },
            { question: "איזו חיה אוהבת לאכול גזר?", answer: "ארנב", hint: "חיה עם אוזניים ארוכות." },
            { question: "כמה ימים יש בשבוע?", answer: "שבעה", hint: "אחרי שישה מגיע..." },
            { question: "איזה חג מדליקים בו נרות במשך שמונה ימים?", answer: "חנוכה", hint: "חוגגים בחורף עם סופגניות." },
            { question: "איזו חיה היא מלכת החיות?", answer: "אריה", hint: "חיה עם רעמה גדולה." },
            { question: "איזה פרי צהוב וארוך?", answer: "בננה", hint: "קוף אוהב לאכול אותו." },
            { question: "מה הצבע של העשב?", answer: "ירוק", hint: "הצבע של העלים בעצים." },
            { question: "מאיזה צבע הלימון?", answer: "צהוב", hint: "הצבע של השמש." },
            { question: "איזו חיה נותנת לנו חלב?", answer: "פרה", hint: "חיה שאומרת מו." }
        ];
    } else if (ageGroup === "7-8") {
        fallbackQuestions = [
            { question: "מה בירת צרפת?", answer: "פריז", hint: "יש בה מגדל מפורסם." },
            { question: "איזו חיה היא מלך החיות?", answer: "אריה", hint: "יש לו רעמה גדולה." },
            { question: "כמה צבעים יש בקשת?", answer: "שבעה", hint: "כמו מספר ימי השבוע." },
            { question: "מה שם ההר הגבוה בעולם?", answer: "אוורסט", hint: "נמצא בהימלאיה." },
            { question: "איזו חיה יש לה החדק הכי ארוך?", answer: "פיל", hint: "החיה היבשתית הגדולה ביותר." },
            { question: "באיזה חג מתחפשים?", answer: "פורים", hint: "אוכלים בו אוזני המן." },
            { question: "מה הצבע שמתקבל כשמערבבים צהוב וכחול?", answer: "ירוק", hint: "הצבע של העלים." },
            { question: "כמה שחקנים יש בקבוצת כדורגל?", answer: "אחד עשר", hint: "עשרה ועוד אחד." },
            { question: "באיזה חג אוכלים מצות?", answer: "פסח", hint: "חג האביב וחג החירות." },
            { question: "מה החג הראשון בשנה העברית?", answer: "ראש השנה", hint: "אוכלים בו תפוח בדבש." },
            { question: "מה הוא כוכב הלכת הקרוב ביותר לשמש?", answer: "כוכב חמה", hint: "הכוכב החם ביותר." },
            { question: "כמה רגליים יש לעכביש?", answer: "שמונה", hint: "יותר מחרק רגיל." }
        ];
    } else {
        fallbackQuestions = [
            { question: "כמה יבשות יש בעולם?", answer: "שבע", hint: "אסיה, אפריקה, אמריקה הצפונית, אמריקה הדרומית, אנטארקטיקה, אירופה, ואוסטרליה." },
            { question: "מהו כוח המושך חפצים כלפי מטה?", answer: "כוח הכבידה", hint: "כוח שמושך את התפוח מהעץ לאדמה." },
            { question: "מי כתב את 'הארי פוטר'?", answer: "ג'יי קיי רולינג", hint: "סופרת בריטית." },
            { question: "מהו החומר הנפוץ ביותר בקרום כדור הארץ?", answer: "חמצן", hint: "גז שאנחנו נושמים." },
            { question: "ממה עשוי היהלום?", answer: "פחמן", hint: "יסוד שנמצא גם בעיפרון." },
            { question: "מי הייתה ראש הממשלה הראשונה של ישראל?", answer: "גולדה מאיר", hint: "האישה היחידה שכיהנה בתפקיד זה." },
            { question: "מהי מערכת השמש החיצונית הקרובה ביותר לכדור הארץ?", answer: "פרוקסימה קנטאורי", hint: "כוכב לכת שמרוחק 4.2 שנות אור." },
            { question: "מה קרה במלחמת ששת הימים?", answer: "ישראל כבשה את סיני, רמת הגולן, יהודה ושומרון וירושלים המזרחית", hint: "מלחמה שהתרחשה ב-1967." },
            { question: "מה המספר האטומי של מימן?", answer: "אחד", hint: "המספר הראשון." },
            { question: "מה שמו של הים המלוח ביותר בעולם?", answer: "ים המלח", hint: "נמצא בישראל ובירדן." },
            { question: "איזה אלמנט הוא הנפוץ ביותר ביקום?", answer: "מימן", hint: "החומר שממנו עשויים כוכבים." },
            { question: "מי היה מנהיג תנועת אי-האלימות בהודו?", answer: "מהטמה גנדי", hint: "הוביל את מאבק העצמאות של הודו." }
        ];
    }
    
    return fallbackQuestions.slice(0, count);
} 