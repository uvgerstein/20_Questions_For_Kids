# ילדים סקרנים

משחק שאלות טריוויה לילדים עד גיל 8 בעברית.

## מה במשחק?

- 12 שאלות מגוונות ומעניינות בכל סיבוב משחק
- מאגר של למעלה מ-100 שאלות מגוונות שמתחלפות בכל משחק
- שאלות מותאמות לילדים ישראליים, מבוססות על עולם הידע שלהם
- אפשרות לקבל רמז אם מתקשים בשאלה
- אפשרות לחשוף תשובה ולסמן אם ידעתם או לא
- ציון מסכם בסוף המשחק
- ממשק ידידותי, צבעוני ונגיש

## איך לשחק?

1. לחצו על כפתור "התחל משחק"
2. קראו את השאלה
3. אם מתקשים, אפשר ללחוץ על "הצג רמז"
4. לאחר שחשבתם על התשובה, לחצו על "הצג תשובה" 
5. סמנו אם ידעתם את התשובה או לא
6. המשיכו ל-12 שאלות וקבלו ציון בסוף

## איך להתקין?

1. הורידו את קבצי הפרויקט
2. פתחו את קובץ `index.html` בדפדפן
3. אפשר להתחיל לשחק!

## טכנולוגיות

- HTML5
- CSS3
- JavaScript

## תכונות טכניות

- מאגר של למעלה מ-100 שאלות מעניינות שמתחלפות בכל משחק
- שאלות מסווגות לפי נושאים: מדע וטבע, גיאוגרפיה, היסטוריה, חגים, ספרות, מוסיקה ועוד
- מערכת רמזים חכמה לעזרה בפתרון השאלות
- מנגנון שמבטיח שלא תהיה חזרה על שאלות בלפחות 10 משחקים רצופים
- עיצוב תגובי שמתאים למחשב ולמכשירים ניידים
- קוד נקי ומאורגן לתחזוקה קלה והרחבות עתידיות

## רעיונות להרחבה

- קטגוריות שאלות שונות (טבע, היסטוריה, גיאוגרפיה וכו')
- רמות קושי שונות
- אפשרות לשמירת תוצאות קודמות
- אפשרות למשחק רב-משתתפים

## רישיון

חופשי לשימוש. נשמח לקרדיט.

## Deployment Instructions

### Deploying to Netlify

1. Create a Netlify account if you don't have one: https://app.netlify.com/signup

2. Create a new site from Git:
   - Go to https://app.netlify.com/start
   - Select your Git provider (GitHub, GitLab, BitBucket)
   - Select your repository
   - Use these build settings:
     - Build command: `npm install` (or leave blank)
     - Publish directory: `.` (the root directory)

3. Set up environment variables:
   - In your Netlify site dashboard, go to Site settings > Environment variables
   - Add a new variable:
     - Key: `GEMINI_API_KEY`
     - Value: Your Google Gemini API key (get one from https://ai.google.dev/)

4. Deploy the site

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. To test Netlify Functions locally, install the Netlify CLI:
   ```
   npm install -g netlify-cli
   ```

4. Run the development server:
   ```
   netlify dev
   ```

This will start a local server that simulates the Netlify Functions environment.

### Troubleshooting

If you're experiencing issues with the Netlify function:

1. Check the function logs in the Netlify dashboard (Functions > get-questions > Logs)
2. Verify your API key is correctly set in the environment variables
3. The function now includes fallback questions that will be used if the API call fails 