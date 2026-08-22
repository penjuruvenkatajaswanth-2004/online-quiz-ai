const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");

dotenv.config();

const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());


// =====================================================
// JWT MIDDLEWARE
// =====================================================

const authenticateToken = (req, res, next) => {

    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Access token required"
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {

        if (err) {
            return res.status(403).json({
                message: "Invalid or expired token"
            });
        }

        req.user = decoded;
        next();
    });
};

const requireAdmin = (req, res, next) => {

    if (req.user.role !== "admin") {
        return res.status(403).json({
            message: "Admin access required"
        });
    }

    next();
};


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.json({
        message: "Online Quiz API is running"
    });
});


// =====================================================
// TEST DATABASE
// =====================================================

app.get("/test-db", (req, res) => {

    db.query("SELECT 1 AS result", (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database connection failed",
                error: err.message
            });
        }

        res.json({
            message: "Database connection is working",
            result: results
        });
    });

});


// =====================================================
// REGISTER
// =====================================================

app.post("/register", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        db.query(
            "SELECT * FROM users WHERE email = ?",
            [email],
            async (err, results) => {

                if (err) {
                    return res.status(500).json({
                        message: "Database error",
                        error: err.message
                    });
                }

                if (results.length > 0) {
                    return res.status(409).json({
                        message: "Email already registered"
                    });
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                const sql = `
                    INSERT INTO users (name, email, password)
                    VALUES (?, ?, ?)
                `;

                db.query(
                    sql,
                    [name, email, hashedPassword],
                    (err, result) => {

                        if (err) {
                            return res.status(500).json({
                                message: "Failed to register user",
                                error: err.message
                            });
                        }

                        res.status(201).json({
                            message: "User registered successfully",
                            userId: result.insertId
                        });
                    }
                );
            }
        );

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }

});


// =====================================================
// LOGIN
// =====================================================

app.post("/login", (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const user = results[0];

            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            if (!process.env.JWT_SECRET) {
                return res.status(500).json({
                    message: "JWT_SECRET is missing from .env"
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: "2h" }
            );

            res.json({
                message: "Login successful",
                token: token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        }
    );

});


// =====================================================
// USER DASHBOARD
// =====================================================

app.get("/user/dashboard", authenticateToken, (req, res) => {

    const userId = req.user.id;

    const statsSql = `
        SELECT
            COUNT(*) as total_quizzes,
            COALESCE(ROUND(AVG(score * 100.0 / total_questions)), 0) as avg_percentage,
            COALESCE(ROUND(MAX(score * 100.0 / total_questions)), 0) as best_percentage,
            COALESCE(SUM(score), 0) as total_correct,
            COALESCE(SUM(total_questions), 0) as total_answered
        FROM results
        WHERE user_id = ?
    `;

    const resultsSql = `
        SELECT
            r.id,
            r.quiz_id,
            r.score,
            r.total_questions,
            ROUND(r.score * 100.0 / r.total_questions) as percentage,
            r.submitted_at AS created_at,
            q.title as quiz_title
        FROM results r
        JOIN quizzes q ON r.quiz_id = q.id
        WHERE r.user_id = ?
        ORDER BY r.id DESC
        LIMIT 20
    `;

    db.query(statsSql, [userId], (err, statsRows) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch stats",
                error: err.message
            });
        }

        db.query(resultsSql, [userId], (err, resultRows) => {

            if (err) {
                return res.status(500).json({
                    message: "Failed to fetch results",
                    error: err.message
                });
            }

            res.json({
                stats: statsRows[0],
                recentResults: resultRows
            });
        });
    });

});


// =====================================================
// USER RESULT REVIEW
// =====================================================

app.get("/user/results/:resultId", authenticateToken, (req, res) => {

    const resultId = req.params.resultId;
    const userId = req.user.id;

    const verifySql = `
        SELECT r.*, q.title as quiz_title
        FROM results r
        JOIN quizzes q ON r.quiz_id = q.id
        WHERE r.id = ? AND r.user_id = ?
    `;

    db.query(verifySql, [resultId, userId], (err, resultRows) => {

        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        if (resultRows.length === 0) {
            return res.status(404).json({
                message: "Result not found"
            });
        }

        const resultData = resultRows[0];

        const reviewSql = `
            SELECT
                q.id as question_id,
                q.question,
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                q.correct_answer,
                ua.user_answer,
                ua.is_correct
            FROM questions q
            LEFT JOIN user_answers ua
                ON q.id = ua.question_id AND ua.result_id = ?
            WHERE q.quiz_id = ?
            ORDER BY q.id
        `;

        db.query(
            reviewSql,
            [resultId, resultData.quiz_id],
            (err, reviewRows) => {

                if (err) {
                    return res.status(500).json({
                        message: "Failed to fetch review",
                        error: err.message
                    });
                }

                res.json({
                    result: {
                        id: resultData.id,
                        quiz_title: resultData.quiz_title,
                        score: resultData.score,
                        total_questions: resultData.total_questions,
                        percentage: Math.round(
                            resultData.score * 100 / resultData.total_questions
                        ),
                        created_at: resultData.submitted_at
                    },
                    questions: reviewRows
                });
            }
        );
    });

});


// =====================================================
// CREATE QUIZ (Admin Only)
// =====================================================

app.post("/quizzes", authenticateToken, requireAdmin, (req, res) => {

    const { title, description } = req.body;

    if (!title) {
        return res.status(400).json({
            message: "Quiz title is required"
        });
    }

    const sql = `
        INSERT INTO quizzes (title, description)
        VALUES (?, ?)
    `;

    db.query(
        sql,
        [title, description || null],
        (err, result) => {

            if (err) {
                return res.status(500).json({
                    message: "Failed to create quiz",
                    error: err.message
                });
            }

            res.status(201).json({
                message: "Quiz created successfully",
                quizId: result.insertId
            });
        }
    );

});


// =====================================================
// CREATE QUESTION (Admin Only)
// =====================================================

app.post("/questions", authenticateToken, requireAdmin, (req, res) => {

    const {
        quiz_id,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer
    } = req.body;

    if (
        !quiz_id || !question ||
        !option_a || !option_b ||
        !option_c || !option_d ||
        !correct_answer
    ) {
        return res.status(400).json({
            message: "All question fields are required"
        });
    }

    db.query(
        "SELECT * FROM quizzes WHERE id = ?",
        [quiz_id],
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Quiz not found"
                });
            }

            const sql = `
                INSERT INTO questions
                (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
                sql,
                [
                    quiz_id, question,
                    option_a, option_b,
                    option_c, option_d,
                    correct_answer.toUpperCase()
                ],
                (err, result) => {

                    if (err) {
                        return res.status(500).json({
                            message: "Failed to create question",
                            error: err.message
                        });
                    }

                    res.status(201).json({
                        message: "Question created successfully",
                        questionId: result.insertId
                    });
                }
            );
        }
    );

});


// =====================================================
// GET ALL QUIZZES (Authenticated)
// =====================================================

app.get("/quizzes", authenticateToken, (req, res) => {

    db.query(
        "SELECT * FROM quizzes ORDER BY id DESC",
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Failed to fetch quizzes",
                    error: err.message
                });
            }

            res.json({
                message: "Quizzes fetched successfully",
                quizzes: results
            });
        }
    );

});


// =====================================================
// GET QUESTIONS FOR QUIZ (No correct_answer)
// =====================================================

app.get("/quizzes/:id/questions", authenticateToken, (req, res) => {

    const quizId = req.params.id;

    const sql = `
        SELECT
            id, quiz_id, question,
            option_a, option_b,
            option_c, option_d
        FROM questions
        WHERE quiz_id = ?
    `;

    db.query(sql, [quizId], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch questions",
                error: err.message
            });
        }

        res.json({
            quizId: quizId,
            questions: results
        });
    });

});


// =====================================================
// SUBMIT QUIZ (Fixed — saves user_answers)
// =====================================================

app.post("/submit-quiz", authenticateToken, (req, res) => {

    const userId = req.user.id;
    const { quiz_id, answers } = req.body;

    if (!quiz_id || !answers || typeof answers !== "object") {
        return res.status(400).json({
            message: "quiz_id and answers object are required"
        });
    }

    const sql = `
        SELECT id, correct_answer
        FROM questions
        WHERE quiz_id = ?
    `;

    db.query(sql, [quiz_id], (err, questions) => {

        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        if (questions.length === 0) {
            return res.status(404).json({
                message: "No questions found for this quiz"
            });
        }

        // Grade the quiz
        let score = 0;
        const answerDetails = [];

        questions.forEach((q) => {

            const studentAnswer = answers[q.id];

            const isCorrect =
                studentAnswer &&
                studentAnswer.toUpperCase() ===
                q.correct_answer.toUpperCase();

            if (isCorrect) score++;

            answerDetails.push({
                question_id: q.id,
                user_answer: studentAnswer
                    ? studentAnswer.toUpperCase()
                    : null,
                is_correct: isCorrect ? 1 : 0
            });
        });

        const totalQuestions = questions.length;

        // Save result
        const insertResultSql = `
            INSERT INTO results
            (user_id, quiz_id, score, total_questions)
            VALUES (?, ?, ?, ?)
        `;

        db.query(
            insertResultSql,
            [userId, quiz_id, score, totalQuestions],
            (err, resultRow) => {

                if (err) {
                    return res.status(500).json({
                        message: "Failed to save result",
                        error: err.message
                    });
                }

                const resultId = resultRow.insertId;

                // Save each individual answer
                let insertCount = 0;

                const answerSql = `
                    INSERT INTO user_answers
                    (result_id, question_id, user_answer, is_correct)
                    VALUES (?, ?, ?, ?)
                `;

                answerDetails.forEach((detail) => {

                    db.query(
                        answerSql,
                        [
                            resultId,
                            detail.question_id,
                            detail.user_answer,
                            detail.is_correct
                        ],
                        (err) => {

                            if (err) {
                                console.error(
                                    "Failed to save answer:",
                                    err.message
                                );
                            }

                            insertCount++;

                            // Respond after all answers saved
                            if (insertCount === answerDetails.length) {

                                res.status(201).json({
                                    message:
                                        "Quiz submitted successfully",
                                    resultId: resultId,
                                    score: score,
                                    totalQuestions: totalQuestions,
                                    percentage: Math.round(
                                        (score / totalQuestions) * 100
                                    )
                                });
                            }
                        }
                    );
                });
            }
        );
    });

});


// =====================================================
// LEADERBOARD
// =====================================================

app.get("/leaderboard", authenticateToken, (req, res) => {

    const sql = `
        SELECT
            u.id,
            u.name,
            ROUND(MAX(r.score * 100.0 / r.total_questions)) as best_percentage,
            COUNT(r.id) as total_quizzes,
            SUM(r.score) as total_correct,
            SUM(r.total_questions) as total_answered
        FROM users u
        JOIN results r ON u.id = r.user_id
        WHERE u.role != 'admin'
        GROUP BY u.id, u.name
        ORDER BY best_percentage DESC, total_quizzes DESC
        LIMIT 20
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch leaderboard",
                error: err.message
            });
        }

        res.json({ leaderboard: results });
    });

});


// =====================================================
// ADMIN — STATS
// =====================================================

app.get("/admin/stats", authenticateToken, requireAdmin, (req, res) => {

    const queries = {
        users: "SELECT COUNT(*) as count FROM users",
        quizzes: "SELECT COUNT(*) as count FROM quizzes",
        questions: "SELECT COUNT(*) as count FROM questions",
        attempts: "SELECT COUNT(*) as count FROM results"
    };

    const stats = {};
    let completed = 0;
    const keys = Object.keys(queries);

    keys.forEach((key) => {

        db.query(queries[key], (err, results) => {

            stats[key] = err ? 0 : results[0].count;
            completed++;

            if (completed === keys.length) {
                res.json({ stats });
            }
        });
    });

});


// =====================================================
// ADMIN — ALL USERS
// =====================================================

app.get("/admin/users", authenticateToken, requireAdmin, (req, res) => {

    db.query(
        "SELECT id, name, email, role, created_at FROM users ORDER BY id DESC",
        (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Failed to fetch users",
                    error: err.message
                });
            }

            res.json({ users: results });
        }
    );

});


// =====================================================
// ADMIN — ALL QUIZZES (with question counts)
// =====================================================

app.get("/admin/quizzes", authenticateToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT
            q.*,
            COUNT(qu.id) as question_count
        FROM quizzes q
        LEFT JOIN questions qu ON q.id = qu.quiz_id
        GROUP BY q.id
        ORDER BY q.id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch quizzes",
                error: err.message
            });
        }

        res.json({ quizzes: results });
    });

});


// =====================================================
// ADMIN — ALL RESULTS
// =====================================================

app.get("/admin/results", authenticateToken, requireAdmin, (req, res) => {

    const sql = `
        SELECT
            r.id,
            r.score,
            r.total_questions,
            ROUND(r.score * 100.0 / r.total_questions) as percentage,
            r.submitted_at AS created_at,
            u.name as user_name,
            u.email as user_email,
            q.title as quiz_title
        FROM results r
        JOIN users u ON r.user_id = u.id
        JOIN quizzes q ON r.quiz_id = q.id
        ORDER BY r.id DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Failed to fetch results",
                error: err.message
            });
        }

        res.json({ results });
    });

});


// =====================================================
// ADMIN — DELETE QUIZ
// =====================================================

app.delete(
    "/admin/quizzes/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const quizId = req.params.id;

        // Delete related user_answers first
        const deleteAnswersSql = `
            DELETE ua FROM user_answers ua
            JOIN questions q ON ua.question_id = q.id
            WHERE q.quiz_id = ?
        `;

        db.query(deleteAnswersSql, [quizId], (err) => {

            // Delete related results
            db.query(
                "DELETE FROM results WHERE quiz_id = ?",
                [quizId],
                (err) => {

                    // Delete questions
                    db.query(
                        "DELETE FROM questions WHERE quiz_id = ?",
                        [quizId],
                        (err) => {

                            // Delete quiz
                            db.query(
                                "DELETE FROM quizzes WHERE id = ?",
                                [quizId],
                                (err, result) => {

                                    if (err) {
                                        return res.status(500).json({
                                            message: "Failed to delete quiz",
                                            error: err.message
                                        });
                                    }

                                    if (result.affectedRows === 0) {
                                        return res.status(404).json({
                                            message: "Quiz not found"
                                        });
                                    }

                                    res.json({
                                        message: "Quiz deleted successfully"
                                    });
                                }
                            );
                        }
                    );
                }
            );
        });
    }
);


// =====================================================
// ADMIN — DELETE QUESTION
// =====================================================

app.delete(
    "/admin/questions/:id",
    authenticateToken,
    requireAdmin,
    (req, res) => {

        const questionId = req.params.id;

        // Delete related user_answers first
        db.query(
            "DELETE FROM user_answers WHERE question_id = ?",
            [questionId],
            (err) => {

                db.query(
                    "DELETE FROM questions WHERE id = ?",
                    [questionId],
                    (err, result) => {

                        if (err) {
                            return res.status(500).json({
                                message: "Failed to delete question",
                                error: err.message
                            });
                        }

                        if (result.affectedRows === 0) {
                            return res.status(404).json({
                                message: "Question not found"
                            });
                        }

                        res.json({
                            message: "Question deleted successfully"
                        });
                    }
                );
            }
        );
    }
);


// =====================================================
// AI QUIZ GENERATOR (Authenticated)
// =====================================================

app.post("/generate-quiz", authenticateToken, async (req, res) => {

    try {

        const {
            topic,
            difficulty = "medium",
            numberOfQuestions = 5
        } = req.body;


        // Validate input

        if (!topic) {
            return res.status(400).json({
                message: "Topic is required"
            });
        }

        const questionCount = Number(numberOfQuestions);

        if (
            !Number.isInteger(questionCount) ||
            questionCount < 1 ||
            questionCount > 20
        ) {
            return res.status(400).json({
                message:
                    "numberOfQuestions must be between 1 and 20"
            });
        }

        const cleanDifficulty = String(difficulty).toLowerCase();

        if (!["easy", "medium", "hard"].includes(cleanDifficulty)) {
            return res.status(400).json({
                message:
                    "Difficulty must be easy, medium or hard"
            });
        }


        // Check API key

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({
                message:
                    "OPENROUTER_API_KEY is missing from .env"
            });
        }


        // AI prompt

        const prompt = `
Generate exactly ${questionCount} multiple-choice quiz questions about "${topic}".

Difficulty: ${cleanDifficulty}

Return ONLY valid JSON.

Do not use Markdown.
Do not use code blocks.
Do not add explanations.

Use EXACTLY this structure:

{
  "questions": [
    {
      "question": "Question text",
      "option_a": "Option A",
      "option_b": "Option B",
      "option_c": "Option C",
      "option_d": "Option D",
      "correct_answer": "A"
    }
  ]
}

Rules:

1. Generate exactly ${questionCount} questions.

2. Every question must be about ${topic}.

3. Every question must have exactly four options.

4. Each option must be different.

5. correct_answer must be exactly A, B, C or D.

6. Do not repeat questions.

7. Do not repeat options within a question.

8. Questions must match ${cleanDifficulty} difficulty.

9. Return syntactically valid JSON.

10. Every JSON property must be separated by commas correctly.

11. The final response must be directly parseable using JSON.parse().
`;


        // OpenRouter request

        const response = await axios.post(

            "https://openrouter.ai/api/v1/chat/completions",

            {
                model: "openrouter/free",

                messages: [
                    {
                        role: "system",
                        content:
                            "You are a quiz generation API. Return valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],

                temperature: 0.7
            },

            {
                headers: {
                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type":
                        "application/json",
                    "HTTP-Referer":
                        "http://localhost:5000",
                    "X-Title":
                        "Online Quiz Application"
                }
            }
        );


        // Get AI response

        let aiText =
            response.data?.choices?.[0]?.message?.content;

        if (!aiText) {
            return res.status(500).json({
                message: "OpenRouter returned an empty response"
            });
        }

        console.log("\n==============================");
        console.log("RAW AI RESPONSE");
        console.log("==============================");
        console.log(aiText);


        // Remove Markdown code fences

        aiText = aiText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();


        // Extract JSON object

        const start = aiText.indexOf("{");
        const end = aiText.lastIndexOf("}");

        if (start === -1 || end === -1) {
            return res.status(500).json({
                message: "AI did not return a JSON object",
                rawResponse: aiText
            });
        }

        aiText = aiText.substring(start, end + 1);


        // Parse JSON

        let quizData;

        try {

            quizData = JSON.parse(aiText);

        } catch (firstError) {

            console.log("First JSON parsing failed.");

            // Repair common missing commas
            aiText = aiText.replace(
                /("option_d"\s*:\s*"[^"]*")\s*("correct_answer"\s*:)/g,
                "$1,$2"
            );

            aiText = aiText.replace(
                /("option_[a-d]"\s*:\s*"[^"]*")\s*("option_[a-d]"\s*:)/g,
                "$1,$2"
            );

            try {
                quizData = JSON.parse(aiText);
            } catch (secondError) {
                console.error("Second JSON parsing failed:");
                console.error(secondError.message);

                return res.status(500).json({
                    message: "AI returned invalid JSON",
                    rawResponse: aiText,
                    error: secondError.message
                });
            }
        }


        // Validate questions array

        if (
            !quizData.questions ||
            !Array.isArray(quizData.questions) ||
            quizData.questions.length === 0
        ) {
            return res.status(500).json({
                message: "AI returned an invalid quiz structure",
                rawResponse: quizData
            });
        }


        // Validate each question

        for (const question of quizData.questions) {

            const requiredFields = [
                "question",
                "option_a", "option_b",
                "option_c", "option_d",
                "correct_answer"
            ];

            for (const field of requiredFields) {
                if (
                    question[field] === undefined ||
                    question[field] === null ||
                    question[field] === ""
                ) {
                    return res.status(500).json({
                        message: `AI question is missing field: ${field}`,
                        question: question
                    });
                }
            }

            question.correct_answer =
                String(question.correct_answer).trim().toUpperCase();

            if (!["A", "B", "C", "D"].includes(question.correct_answer)) {
                return res.status(500).json({
                    message: "AI generated invalid correct_answer",
                    question: question
                });
            }
        }


        // Save quiz to MySQL

        const quizTitle =
            `${topic} - ${cleanDifficulty} AI Quiz`;

        const quizDescription =
            `AI generated ${cleanDifficulty} quiz about ${topic}`;

        const quizSql = `
            INSERT INTO quizzes (title, description)
            VALUES (?, ?)
        `;

        db.query(
            quizSql,
            [quizTitle, quizDescription],
            async (err, quizResult) => {

                if (err) {
                    console.error("Quiz insert error:", err.message);
                    return res.status(500).json({
                        message: "Failed to save AI quiz",
                        error: err.message
                    });
                }

                const quizId = quizResult.insertId;

                const questionSql = `
                    INSERT INTO questions
                    (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;

                try {

                    for (const question of quizData.questions) {

                        await new Promise((resolve, reject) => {

                            db.query(
                                questionSql,
                                [
                                    quizId,
                                    question.question,
                                    question.option_a,
                                    question.option_b,
                                    question.option_c,
                                    question.option_d,
                                    question.correct_answer
                                ],
                                (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                }
                            );
                        });
                    }

                    // Success
                    res.status(201).json({
                        message: "AI quiz generated successfully",
                        quizId: quizId,
                        title: quizTitle,
                        topic: topic,
                        difficulty: cleanDifficulty,
                        numberOfQuestions: quizData.questions.length
                    });

                } catch (error) {

                    console.error(
                        "Question insertion error:",
                        error.message
                    );

                    // Rollback — remove incomplete quiz
                    db.query(
                        "DELETE FROM quizzes WHERE id = ?",
                        [quizId],
                        () => { }
                    );

                    return res.status(500).json({
                        message: "Failed to save generated questions",
                        error: error.message
                    });
                }
            }
        );

    } catch (error) {

        console.error("AI QUIZ ERROR:");
        console.error(error.response?.data || error.message);

        res.status(500).json({
            message: "Failed to generate AI quiz",
            error: error.response?.data || error.message
        });
    }

});


// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});