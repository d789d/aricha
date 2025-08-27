const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// ===========================================
// מאגר פונקציות - כאן תוסיף פונקציות חדשות
// ===========================================

const FUNCTIONS_LIBRARY = {
    // פונקציות בסיסיות קיימות
    punctuation: {
        name: "פיסוק מלא",
        description: "הוספת פסיקים, נקודות ונקודותיים",
        icon: "✨",
        model: "claude-sonnet-4-20250514",
        maxTokens: 4000,
        temperature: 0.1,
        systemPrompt: `פיסוק 3 - פיסוק מלא

עם סימני שאלה וקריאה. הגדרה: כולל פסיקים, נקודות, נקודותיים, מרכאות.

**הערת עצמאות**: בביצוע שלב זה, יטופלו אך ורק ענייני פיסוק. אין לשנות מילים בגוף הטקסט, שום מילה ושום אות. אין לגעת במבנה הקטעים, במראי המקומות או בכותרות הקיימות.

1. סימני פיסוק - כללים ועקרונות:
- פיסוק כולל: פסיקים, נקודות, ונקודותיים
- שימוש מינימלי בסימני פיסוק
- שמירה על סגנון הכתיבה המסורתי

2. שימוש בנקודה:
- בסוף משפט
- לאחר ראשי תיבות
- בסיום רעיון
- לפני התחלת נושא חדש

3. שימוש בפסיק:
- בין חלקי משפט
- ברשימות
- לפני מילות קישור
- להפרדה בין רעיונות משניים

4. שימוש בנקודתיים:
בציטוט של פסוקים
דוגמא: כמו שנאמר: 'בראשית ברא אלקים'.

5. סימני מרכאות:
בציטוט פסוקים ומדרשים, השתמש במרכאה אחת.
לדוגמא: 'ברכות אביך גברו'.

6. סימני שאלה וקריאה:
- הימנעות כמעט מוחלטת משימוש בסימן קריאה
- סימן שאלה רק בקושיות מפורשות`
    },

    nikud: {
        name: "הוספת ניקוד",
        description: "ניקוד מלא לטקסט עברי",
        icon: "📖",
        model: "claude-sonnet-4-20250514",
        maxTokens: 3000,
        temperature: 0.1,
        systemPrompt: "הוסף ניקוד מלא ומדויק לטקסט העברי הבא. הקפד על דיוק בהברות ובהטעמות, ושמור על המבנה המקורי של הטקסט:"
    },

    sources: {
        name: "מראי מקומות",
        description: "הוספת מקורות ואסמכתאות",
        icon: "📚",
        model: "claude-sonnet-4-20250514",
        maxTokens: 4000,
        temperature: 0.2,
        systemPrompt: "הוסף מראי מקומות ומקורות רלוונטיים לטקסט הבא. כלול פסוקים, גמרא, מדרשים ומקורות רלוונטיים בפורמט מתאים:"
    },

    // ==========================================
    // כאן תוסיף פונקציות חדשות - פשוט העתק ושנה!
    // ==========================================
    
    // דוגמה לפונקציה חדשה:
    /*
    translation_aramaic: {
        name: "תרגום לארמית",
        description: "תרגום טקסט עברי לארמית",
        icon: "🔤",
        model: "claude-sonnet-4-20250514",
        maxTokens: 3000,
        temperature: 0.3,
        systemPrompt: "תרגם את הטקסט העברי הבא לארמית תלמודית, תוך שמירה על המשמעות והסגנון:"
    },
    */
};

// ===========================================
// מערכת אוטומטית - אל תשנה את החלק הזה
// ===========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        message: 'השרת פועל תקין',
        functionsCount: Object.keys(FUNCTIONS_LIBRARY).length
    });
});

// Get all available functions - עבור הדף HTML
app.get('/api/functions', (req, res) => {
    const functions = Object.keys(FUNCTIONS_LIBRARY).map(key => ({
        id: key,
        ...FUNCTIONS_LIBRARY[key]
    }));
    res.json({ functions });
});

// Models endpoint
app.get('/api/models', (req, res) => {
    const models = [
        {
            id: 'claude-sonnet-4-20250514',
            name: 'Claude Sonnet 4',
            description: 'המודל המתקדם ביותר'
        },
        {
            id: 'claude-3-5-sonnet-20241022',
            name: 'Claude 3.5 Sonnet',
            description: 'מודל מאוזן לשימוש כללי'
        }
    ];
    res.json({ models });
});

// Main processing endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, action, customPrompt, model, max_tokens, temperature } = req.body;
        
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'מפתח API חסר - הוסף ANTHROPIC_API_KEY לקובץ .env' 
            });
        }

        // Get function config or use custom
        const functionConfig = FUNCTIONS_LIBRARY[action];
        if (!functionConfig && !customPrompt) {
            return res.status(400).json({ error: 'פונקציה לא קיימת' });
        }

        const finalConfig = functionConfig ? {
            model: model || functionConfig.model,
            max_tokens: max_tokens || functionConfig.maxTokens,
            temperature: temperature || functionConfig.temperature,
            systemPrompt: customPrompt || functionConfig.systemPrompt
        } : {
            model: model || 'claude-sonnet-4-20250514',
            max_tokens: max_tokens || 2000,
            temperature: temperature || 0.3,
            systemPrompt: customPrompt || 'עבד את הטקסט הבא:'
        };

        // Call Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: finalConfig.model,
                max_tokens: finalConfig.max_tokens,
                temperature: finalConfig.temperature,
                system: finalConfig.systemPrompt,
                messages: [{
                    role: 'user',
                    content: message
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        
        res.json({
            response: data.content[0].text,
            usage: data.usage,
            model: data.model,
            function: functionConfig?.name || 'מותאם אישית'
        });

    } catch (error) {
        console.error('שגיאה בעיבוד הבקשה:', error);
        res.status(500).json({
            error: error.message || 'שגיאה פנימית בשרת'
        });
    }
});

// Default route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 השרת פועל על פורט ${PORT}`);
    console.log(`🌐 פתח בדפדפן: http://localhost:${PORT}`);
    console.log(`📦 פונקציות זמינות: ${Object.keys(FUNCTIONS_LIBRARY).length}`);
});
