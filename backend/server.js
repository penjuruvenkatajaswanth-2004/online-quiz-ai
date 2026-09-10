const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

dotenv.config();

const connectDB = require("./config/db");
const User = require("./models/User");
const Quiz = require("./models/Quiz");
const Question = require("./models/Question");
const Result = require("./models/Result");
const OTP = require("./models/OTP");

const app = express();

app.use(cors());
app.use(express.json());


// =====================================================
// CONNECT TO MONGODB
// =====================================================

connectDB();


// =====================================================
// EMAIL TRANSPORTER
// =====================================================

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {
    res.json({
        message: "Online Quiz API is running"
    });
});


// =====================================================
// TEST DATABASE
// =====================================================

app.get("/test-db", async (req, res) => {

    try {

        const state = mongoose.connection.readyState;

        if (state === 1) {
            res.json({
                message: "Database connection is working",
                result: [{ result: 1 }]
            });
        } else {
            res.status(500).json({
                message: "Database connection failed",
                error: "MongoDB is not connected"
            });
        }

    } catch (err) {

        res.status(500).json({
            message: "Database connection failed",
            error: err.message
        });

    }

});


// =====================================================
// REGISTER
// =====================================================

app.post("/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "User registered successfully",
            userId: newUser._id
        });

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

app.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

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
                id: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.json({
            message: "Login successful",

            token: token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error: error.message
        });

    }

});


// =====================================================
// FORGOT PASSWORD — SEND OTP
// =====================================================

app.post("/forgot-password", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                message: "No account found with this email"
            });
        }

        await OTP.deleteMany({ email: normalizedEmail });

        const otp = generateOTP();

        await OTP.create({
            email: normalizedEmail,
            otp: otp,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            verified: false
        });

        const mailOptions = {
            from: `"QuizAI" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: "QuizAI — Password Reset OTP",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1e2030; border-radius: 12px; color: #f1f5f9;">
                    <h2 style="text-align: center; color: #ec4899;">⚡ QuizAI</h2>
                    <p style="text-align: center; color: #94a3b8;">Password Reset Request</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <div style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #ec4899, #f97316); border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: white;">
                            ${otp}
                        </div>
                    </div>
                    <p style="text-align: center; color: #94a3b8; font-size: 14px;">This OTP is valid for <strong>5 minutes</strong>.</p>
                    <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">If you did not request this, please ignore this email.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({
                message: "OTP sent to your email"
            });
        } catch (mailErr) {
            console.error("Email send error:", mailErr.message);
            return res.status(500).json({
                message: "Failed to send OTP email",
                error: mailErr.message
            });
        }

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error: error.message
        });

    }

});


// =====================================================
// VERIFY OTP
// =====================================================

app.post("/verify-otp", async (req, res) => {

    try {

        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const stored = await OTP.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });

        if (!stored) {
            return res.status(400).json({
                message: "No OTP found. Please request a new one."
            });
        }

        if (new Date() > stored.expiresAt) {
            await OTP.deleteMany({ email: normalizedEmail });
            return res.status(400).json({
                message: "OTP has expired. Please request a new one."
            });
        }

        if (stored.otp !== String(otp).trim()) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }

        stored.verified = true;
        await stored.save();

        res.json({
            message: "OTP verified successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error: error.message
        });

    }

});


// =====================================================
// RESET PASSWORD
// =====================================================

app.post("/reset-password", async (req, res) => {

    try {

        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                message: "Email and new password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const stored = await OTP.findOne({ email: normalizedEmail, verified: true });

        if (!stored) {
            return res.status(400).json({
                message: "Please verify OTP first"
            });
        }

        if (new Date() > stored.expiresAt) {
            await OTP.deleteMany({ email: normalizedEmail });
            return res.status(400).json({
                message: "OTP has expired. Please request a new one."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.updateOne(
            { email: normalizedEmail },
            { password: hashedPassword }
        );

        await OTP.deleteMany({ email: normalizedEmail });

        res.json({
            message: "Password reset successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: "Server error",
            error: error.message
        });

    }

});


// =====================================================
// CREATE QUIZ MANUALLY
// =====================================================

app.post("/quizzes", async (req, res) => {

    try {

        const {
            title,
            description
        } = req.body;

        if (!title) {
            return res.status(400).json({
                message: "Quiz title is required"
            });
        }

        const newQuiz = await Quiz.create({
            title,
            description: description || null
        });

        res.status(201).json({
            message: "Quiz created successfully",
            quizId: newQuiz._id
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to create quiz",
            error: error.message
        });

    }

});


// =====================================================
// CREATE QUESTION MANUALLY
// =====================================================

app.post("/questions", async (req, res) => {

    try {

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
            !quiz_id ||
            !question ||
            !option_a ||
            !option_b ||
            !option_c ||
            !option_d ||
            !correct_answer
        ) {
            return res.status(400).json({
                message: "All question fields are required"
            });
        }

        const quiz = await Quiz.findById(quiz_id);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        const newQuestion = await Question.create({
            quiz_id,
            question,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer: correct_answer.toUpperCase()
        });

        res.status(201).json({
            message: "Question created successfully",
            questionId: newQuestion._id
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to create question",
            error: error.message
        });

    }

});


// =====================================================
// GET ALL QUIZZES
// =====================================================

app.get("/quizzes", async (req, res) => {

    try {

        const quizzes = await Quiz.find()
            .sort({ createdAt: -1 });

        res.json({
            message: "Quizzes fetched successfully",
            quizzes: quizzes
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch quizzes",
            error: error.message
        });

    }

});


// =====================================================
// GET QUESTIONS FOR QUIZ
// =====================================================

app.get("/quizzes/:id/questions", async (req, res) => {

    try {

        const quizId = req.params.id;

        const rawQuestions = await Question.find({ quiz_id: quizId });

        const questions = rawQuestions.map((q) => ({
            id: q._id.toString(),
            _id: q._id.toString(),
            quiz_id: q.quiz_id,
            question: q.question,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d
        }));

        res.json({
            quizId: quizId,
            questions: questions
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch questions",
            error: error.message
        });

    }

});


// =====================================================
// SUBMIT QUIZ
// =====================================================

app.post("/submit-quiz", async (req, res) => {

    try {

        const {
            user_id,
            quiz_id,
            answers
        } = req.body;

        if (
            !user_id ||
            !quiz_id ||
            !answers
        ) {
            return res.status(400).json({
                message:
                    "user_id, quiz_id and answers are required"
            });
        }

        const questions = await Question.find(
            { quiz_id: quiz_id }
        );

        if (questions.length === 0) {
            return res.status(404).json({
                message:
                    "No questions found for this quiz"
            });
        }

        let score = 0;

        questions.forEach((question) => {
            const qIdStr = question._id.toString();
            const studentAnswer = answers[qIdStr] || answers[question.id];

            if (
                studentAnswer &&
                studentAnswer.trim().toUpperCase() ===
                question.correct_answer.trim().toUpperCase()
            ) {
                score++;
            }

        });

        const totalQuestions =
            questions.length;

        const newResult = await Result.create({
            user_id,
            quiz_id,
            score,
            total_questions: totalQuestions,
            answers: answers
        });

        res.status(201).json({

            message:
                "Quiz submitted successfully",

            resultId:
                newResult._id,

            score:
                score,

            totalQuestions:
                totalQuestions,

            percentage:
                Math.round(
                    (score /
                        totalQuestions) *
                    100
                )

        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to submit quiz",
            error: error.message
        });

    }

});


// =====================================================
// QUIZ REVIEW (View submitted quiz with correct answers)
// =====================================================

app.get("/quiz-review/:resultId", async (req, res) => {

    try {

        const resultId = req.params.resultId;

        const result = await Result.findById(resultId);

        if (!result) {
            return res.status(404).json({
                message: "Result not found"
            });
        }

        const quiz = await Quiz.findById(result.quiz_id);

        const questions = await Question.find(
            { quiz_id: result.quiz_id }
        );

        // Build review data with user answers vs correct answers
        const reviewQuestions = questions.map((q) => {
            const qIdStr = q._id.toString();
            let userAnswer = null;

            if (result.answers) {
                if (typeof result.answers.get === "function") {
                    userAnswer = result.answers.get(qIdStr) || result.answers.get(q.id);
                }
                if (!userAnswer && typeof result.answers === "object") {
                    userAnswer = result.answers[qIdStr] || result.answers[q.id];
                }
            }

            const isCorrect = userAnswer
                ? userAnswer.trim().toUpperCase() === q.correct_answer.trim().toUpperCase()
                : false;

            return {
                id: qIdStr,
                _id: qIdStr,
                question: q.question,
                option_a: q.option_a,
                option_b: q.option_b,
                option_c: q.option_c,
                option_d: q.option_d,
                correct_answer: q.correct_answer,
                user_answer: userAnswer || null,
                is_correct: isCorrect
            };

        });

        res.json({
            resultId: result._id,
            quiz_title: quiz ? quiz.title : "AI Generated Quiz",
            score: result.score,
            total_questions: result.total_questions,
            percentage: Math.round(
                (result.score / result.total_questions) * 100
            ),
            submitted_at: result.submitted_at,
            questions: reviewQuestions
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch quiz review",
            error: error.message
        });

    }

});


// =====================================================
// AI QUIZ GENERATOR
// =====================================================

app.post("/generate-quiz", async (req, res) => {

    try {

        const {
            topic,
            difficulty = "medium",
            numberOfQuestions = 5
        } = req.body;


        // ---------------------------------------------
        // Validate input
        // ---------------------------------------------

        if (!topic) {
            return res.status(400).json({
                message: "Topic is required"
            });
        }

        const questionCount =
            Number(numberOfQuestions);

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


        const cleanDifficulty =
            String(difficulty).toLowerCase();

        if (
            !["easy", "medium", "hard"]
                .includes(cleanDifficulty)
        ) {
            return res.status(400).json({
                message:
                    "Difficulty must be easy, medium or hard"
            });
        }


        // ---------------------------------------------
        // Check API key
        // ---------------------------------------------

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({
                message:
                    "OPENROUTER_API_KEY is missing from .env"
            });
        }


        // ---------------------------------------------
        // AI prompt
        // ---------------------------------------------

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


        // ---------------------------------------------
        // OpenRouter request
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Get AI response
        // ---------------------------------------------

        let aiText =
            response.data
                ?.choices?.[0]
                ?.message?.content;


        if (!aiText) {
            return res.status(500).json({
                message:
                    "OpenRouter returned an empty response"
            });
        }


        console.log("\n==============================");
        console.log("RAW AI RESPONSE");
        console.log("==============================");
        console.log(aiText);


        // ---------------------------------------------
        // Remove Markdown code fences
        // ---------------------------------------------

        aiText = aiText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();


        // ---------------------------------------------
        // Extract JSON object
        // ---------------------------------------------

        const start =
            aiText.indexOf("{");

        const end =
            aiText.lastIndexOf("}");


        if (start === -1 || end === -1) {

            return res.status(500).json({

                message:
                    "AI did not return a JSON object",

                rawResponse:
                    aiText

            });

        }


        aiText =
            aiText.substring(
                start,
                end + 1
            );


        // ---------------------------------------------
        // Parse JSON
        // ---------------------------------------------

        let quizData;

        try {

            quizData =
                JSON.parse(aiText);

        } catch (firstError) {

            console.log(
                "First JSON parsing failed."
            );


            // -----------------------------------------
            // Repair common missing comma
            // -----------------------------------------

            aiText =
                aiText.replace(

                    /("option_d"\s*:\s*"[^"]*")\s*("correct_answer"\s*:)/g,

                    "$1,$2"

                );


            // Repair missing commas between options

            aiText =
                aiText.replace(

                    /("option_[a-d]"\s*:\s*"[^"]*")\s*("option_[a-d]"\s*:)/g,

                    "$1,$2"

                );


            try {

                quizData =
                    JSON.parse(aiText);

            } catch (secondError) {

                console.error(
                    "Second JSON parsing failed:"
                );

                console.error(
                    secondError.message
                );


                return res.status(500).json({

                    message:
                        "AI returned invalid JSON",

                    rawResponse:
                        aiText,

                    error:
                        secondError.message

                });

            }

        }


        // ---------------------------------------------
        // Validate questions array
        // ---------------------------------------------

        if (
            !quizData.questions ||
            !Array.isArray(
                quizData.questions
            ) ||
            quizData.questions.length === 0
        ) {

            return res.status(500).json({

                message:
                    "AI returned an invalid quiz structure",

                rawResponse:
                    quizData

            });

        }


        // ---------------------------------------------
        // Validate each question
        // ---------------------------------------------

        for (
            const question
            of quizData.questions
        ) {

            const requiredFields = [

                "question",

                "option_a",

                "option_b",

                "option_c",

                "option_d",

                "correct_answer"

            ];


            for (
                const field
                of requiredFields
            ) {

                if (
                    question[field] === undefined ||
                    question[field] === null ||
                    question[field] === ""
                ) {

                    return res.status(500).json({

                        message:
                            `AI question is missing field: ${field}`,

                        question:
                            question

                    });

                }

            }


            question.correct_answer =
                String(
                    question.correct_answer
                )
                    .trim()
                    .toUpperCase();


            if (
                !["A", "B", "C", "D"]
                    .includes(
                        question.correct_answer
                    )
            ) {

                return res.status(500).json({

                    message:
                        "AI generated invalid correct_answer",

                    question:
                        question

                });

            }

        }


        // ---------------------------------------------
        // Save quiz to MongoDB
        // ---------------------------------------------

        const quizTitle =
            `${topic} - ${cleanDifficulty} AI Quiz`;

        const quizDescription =
            `AI generated ${cleanDifficulty} quiz about ${topic}`;


        const newQuiz = await Quiz.create({
            title: quizTitle,
            description: quizDescription
        });

        const quizId = newQuiz._id;


        try {

            // Insert every AI question
            const questionDocs = quizData.questions.map(
                (question) => ({
                    quiz_id: quizId,
                    question: question.question,
                    option_a: question.option_a,
                    option_b: question.option_b,
                    option_c: question.option_c,
                    option_d: question.option_d,
                    correct_answer: question.correct_answer
                })
            );

            await Question.insertMany(questionDocs);


            // ---------------------------------
            // Success
            // ---------------------------------

            res.status(201).json({

                message:
                    "AI quiz generated successfully",

                quizId:
                    quizId,

                title:
                    quizTitle,

                topic:
                    topic,

                difficulty:
                    cleanDifficulty,

                numberOfQuestions:
                    quizData.questions.length,

                questions:
                    quizData.questions

            });


        } catch (error) {

            console.error(
                "Question insertion error:",
                error.message
            );


            // Remove incomplete quiz
            await Quiz.findByIdAndDelete(quizId);


            return res.status(500).json({

                message:
                    "Failed to save generated questions",

                error:
                    error.message

            });

        }

    } catch (error) {

        console.error(
            "AI QUIZ ERROR:"
        );

        console.error(
            error.response?.data ||
            error.message
        );


        res.status(500).json({

            message:
                "Failed to generate AI quiz",

            error:
                error.response?.data ||
                error.message

        });

    }

});


// =====================================================
// USER STATS (for Dashboard - Individual User Only)
// =====================================================

app.get("/user-stats/:userId", async (req, res) => {

    try {

        const userId = req.params.userId;

        const stats = await Result.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $group: {
                    _id: null,
                    quizzesTaken: { $sum: 1 },
                    totalCorrect: { $sum: "$score" },
                    totalQuestions: { $sum: "$total_questions" },
                    averageScore: {
                        $avg: {
                            $multiply: [
                                { $divide: ["$score", "$total_questions"] },
                                100
                            ]
                        }
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.json({
                quizzesTaken: 0,
                averageScore: 0,
                totalCorrect: 0,
                totalQuestions: 0
            });
        }

        res.json({
            quizzesTaken: stats[0].quizzesTaken,
            averageScore: Math.round(stats[0].averageScore * 10) / 10,
            totalCorrect: stats[0].totalCorrect,
            totalQuestions: stats[0].totalQuestions
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch user stats",
            error: error.message
        });

    }

});


// =====================================================
// USER QUIZ HISTORY (Individual User Recent Quizzes)
// =====================================================

app.get("/user-history/:userId", async (req, res) => {

    try {

        const userId = req.params.userId;

        const history = await Result.aggregate([
            {
                $match: {
                    user_id: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $sort: { submitted_at: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: "quizzes",
                    localField: "quiz_id",
                    foreignField: "_id",
                    as: "quiz"
                }
            },
            {
                $unwind: {
                    path: "$quiz",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    id: "$_id",
                    quiz_id: 1,
                    quiz_title: {
                        $ifNull: ["$quiz.title", "AI Generated Quiz"]
                    },
                    score: 1,
                    total_questions: 1,
                    percentage: {
                        $round: [
                            {
                                $multiply: [
                                    { $divide: ["$score", "$total_questions"] },
                                    100
                                ]
                            },
                            0
                        ]
                    },
                    submitted_at: 1
                }
            }
        ]);

        res.json({
            history: history
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch user history",
            error: error.message
        });

    }

});


// =====================================================
// LEADERBOARD (Global Student Rankings)
// =====================================================

app.get("/leaderboard", async (req, res) => {

    try {

        const leaderboard = await Result.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $unwind: "$user"
            },
            {
                $match: {
                    "user.role": { $ne: "admin" }
                }
            },
            {
                $lookup: {
                    from: "quizzes",
                    localField: "quiz_id",
                    foreignField: "_id",
                    as: "quiz"
                }
            },
            {
                $unwind: {
                    path: "$quiz",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    id: "$_id",
                    user_id: "$user._id",
                    name: "$user.name",
                    quiz_id: 1,
                    quiz_title: {
                        $ifNull: ["$quiz.title", "AI Generated Quiz"]
                    },
                    score: 1,
                    total_questions: 1,
                    percentage: {
                        $round: [
                            {
                                $multiply: [
                                    { $divide: ["$score", "$total_questions"] },
                                    100
                                ]
                            },
                            1
                        ]
                    },
                    submitted_at: 1
                }
            },
            {
                $sort: {
                    percentage: -1,
                    submitted_at: -1
                }
            }
        ]);

        res.json({
            leaderboard: leaderboard
        });

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch leaderboard",
            error: error.message
        });

    }

});


// =====================================================
// SERVE FRONTEND & SPA FALLBACK (Local & Docker)
// =====================================================

const frontendDistPath = path.join(__dirname, "../frontend/dist");

if (!process.env.VERCEL && fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));

    app.get("/{*path}", (req, res) => {
        res.sendFile(path.join(frontendDistPath, "index.html"));
    });
} else {
    app.get("/", (req, res) => {
        res.json({
            message: "Online Quiz AI Backend API is running",
            health: "/api/health"
        });
    });
}


// =====================================================
// START SERVER & EXPORT FOR VERCEL
// =====================================================

const PORT = process.env.PORT || 5000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;