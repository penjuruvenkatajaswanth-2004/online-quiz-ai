import { useEffect, useState, useRef, useCallback } from "react";
import "./App.css";

const API = "http://localhost:5000";

function App() {

  // ==================== STATE ====================

  const [page, setPage] = useState("login");

  // Auth
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Quiz setup
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);

  // Quiz taking
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Results
  const [result, setResult] = useState(null);
  const [reviewData, setReviewData] = useState(null);

  // Dashboard
  const [dashStats, setDashStats] = useState(null);
  const [recentResults, setRecentResults] = useState([]);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);

  // Admin
  const [adminStats, setAdminStats] = useState(null);
  const [adminTab, setAdminTab] = useState("quizzes");
  const [adminQuizzes, setAdminQuizzes] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminResults, setAdminResults] = useState([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Refs for timer auto-submit
  const answersRef = useRef({});
  const selectedQuizRef = useRef(null);
  const tokenRef = useRef("");
  const userRef = useRef(null);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { selectedQuizRef.current = selectedQuiz; }, [selectedQuiz]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { userRef.current = user; }, [user]);


  // ==================== HELPERS ====================

  const showMessage = (text, type = "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const getHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  }), [token]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getPerformance = (pct) => {
    if (pct >= 90) return {
      label: "Excellent!",
      icon: (
        <svg className="result-svg-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
          <path d="M4 22h16"></path>
          <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path>
          <path d="M12 2a6 6 0 0 1 6 6v3.58a6 6 0 0 1-1.92 4.41L12 20l-4.08-4.01A6 6 0 0 1 6 11.58V8a6 6 0 0 1 6-6z"></path>
        </svg>
      ),
      class: "badge-excellent"
    };
    if (pct >= 70) return {
      label: "Good Job!",
      icon: (
        <svg className="result-svg-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="6"></circle>
          <circle cx="12" cy="12" r="2"></circle>
        </svg>
      ),
      class: "badge-good"
    };
    if (pct >= 50) return {
      label: "Average",
      icon: (
        <svg className="result-svg-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      ),
      class: "badge-average"
    };
    return {
      label: "Keep Trying",
      icon: (
        <svg className="result-svg-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      ),
      class: "badge-poor"
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric"
    });
  };


  // ==================== TIMER ====================

  const submitQuizRef = useRef(null);

  const doSubmitQuiz = useCallback(async (isAuto = false) => {
    const currentAnswers = answersRef.current;
    const currentQuiz = selectedQuizRef.current;
    const currentToken = tokenRef.current;
    const currentUser = userRef.current;

    if (!currentUser || !currentQuiz) return;

    setTimerActive(false);
    setLoading(true);

    try {
      const res = await fetch(`${API}/submit-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          quiz_id: currentQuiz.id,
          answers: currentAnswers
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || "Failed to submit quiz");
        return;
      }

      setResult(data);
      setPage("result");
      if (isAuto) {
        showMessage("Time's up! Quiz auto-submitted.", "info");
      }
    } catch {
      showMessage("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  }, []);

  submitQuizRef.current = doSubmitQuiz;

  useEffect(() => {
    if (!timerActive || page !== "quiz") return;
    if (timeLeft <= 0) {
      setTimerActive(false);
      submitQuizRef.current(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, timerActive, page]);


  // ==================== AUTH ====================

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.message || "Login failed");
        return;
      }
      setToken(data.token);
      setUser(data.user);
      showMessage("Login successful!", "success");
      setPage("dashboard");
    } catch {
      showMessage("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.message || "Registration failed");
        return;
      }
      showMessage("Registration successful! Please login.", "success");
      setName("");
      setEmail("");
      setPassword("");
      setPage("login");
    } catch {
      showMessage("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken("");
    setTimerActive(false);
    setPage("login");
    setQuestions([]);
    setAnswers({});
    setSelectedQuiz(null);
    setResult(null);
    setReviewData(null);
    setEmail("");
    setPassword("");
    setName("");
    setTopic("");
    setDashStats(null);
    setRecentResults([]);
  };


  // ==================== DASHBOARD ====================

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/user/dashboard`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setDashStats(data.stats);
        setRecentResults(data.recentResults || []);
      }
    } catch {
      showMessage("Failed to load dashboard");
    }
  }, [getHeaders]);

  useEffect(() => {
    if (page === "dashboard" && token) loadDashboard();
  }, [page, token, loadDashboard]);


  // ==================== QUIZ GENERATION ====================

  const generateQuiz = async () => {
    if (!topic.trim()) {
      showMessage("Please enter a topic");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch(`${API}/generate-quiz`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          numberOfQuestions: questionCount
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(data.message || "Failed to generate quiz");
        return;
      }

      // Fetch questions (without correct answers)
      const qRes = await fetch(`${API}/quizzes/${data.quizId}/questions`, {
        headers: getHeaders()
      });
      const qData = await qRes.json();

      setSelectedQuiz({ id: data.quizId, title: data.title });
      setQuestions(qData.questions || []);
      setAnswers({});
      setCurrentQ(0);

      // Timer: 2 minutes per question
      const totalTime = (qData.questions?.length || questionCount) * 120;
      setTimeLeft(totalTime);
      setTimerActive(true);

      setPage("quiz");
      showMessage("Quiz generated! Good luck!", "success");
    } catch {
      showMessage("Failed to generate quiz. Check your connection.");
    } finally {
      setGenerating(false);
    }
  };


  // ==================== QUIZ TAKING ====================

  const selectAnswer = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = () => {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      const confirmed = window.confirm(
        `You have ${unanswered} unanswered question(s). Submit anyway?`
      );
      if (!confirmed) return;
    }
    doSubmitQuiz(false);
  };


  // ==================== REVIEW ====================

  const loadReview = async (resultId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/user/results/${resultId}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        setReviewData(data);
        setPage("review");
      } else {
        showMessage(data.message || "Failed to load review");
      }
    } catch {
      showMessage("Failed to load review");
    } finally {
      setLoading(false);
    }
  };


  // ==================== LEADERBOARD ====================

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/leaderboard`, {
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) setLeaderboard(data.leaderboard || []);
    } catch {
      showMessage("Failed to load leaderboard");
    }
  }, [getHeaders]);

  useEffect(() => {
    if (page === "leaderboard" && token) loadLeaderboard();
  }, [page, token, loadLeaderboard]);


  // ==================== ADMIN ====================

  const loadAdminData = useCallback(async () => {
    try {
      const hdrs = getHeaders();
      const [sRes, qRes, uRes, rRes] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: hdrs }),
        fetch(`${API}/admin/quizzes`, { headers: hdrs }),
        fetch(`${API}/admin/users`, { headers: hdrs }),
        fetch(`${API}/admin/results`, { headers: hdrs })
      ]);

      const sData = await sRes.json();
      const qData = await qRes.json();
      const uData = await uRes.json();
      const rData = await rRes.json();

      if (sRes.ok) setAdminStats(sData.stats);
      if (qRes.ok) setAdminQuizzes(qData.quizzes || []);
      if (uRes.ok) setAdminUsers(uData.users || []);
      if (rRes.ok) setAdminResults(rData.results || []);
    } catch {
      showMessage("Failed to load admin data");
    }
  }, [getHeaders]);

  useEffect(() => {
    if (page === "admin" && token && user?.role === "admin") loadAdminData();
  }, [page, token, user, loadAdminData]);

  const deleteQuiz = async (quizId) => {
    if (!window.confirm("Delete this quiz and all related data?")) return;
    try {
      const res = await fetch(`${API}/admin/quizzes/${quizId}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (res.ok) {
        showMessage("Quiz deleted", "success");
        loadAdminData();
      } else {
        showMessage("Failed to delete quiz");
      }
    } catch {
      showMessage("Failed to delete quiz");
    }
  };


  // ==================== RENDER: NAVBAR ====================

  const renderNavbar = () => (
    <>
      <nav className="navbar">
        <div className="nav-brand" onClick={() => setPage("dashboard")}>
          <svg className="nav-logo-svg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span className="nav-title">QuizAI</span>
        </div>

        <div className="nav-links">
          <button
            className={`nav-link ${page === "dashboard" ? "active" : ""}`}
            onClick={() => setPage("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${page === "leaderboard" ? "active" : ""}`}
            onClick={() => setPage("leaderboard")}
          >
            Leaderboard
          </button>
          {user?.role === "admin" && (
            <button
              className={`nav-link ${page === "admin" ? "active" : ""}`}
              onClick={() => setPage("admin")}
            >
              Admin
            </button>
          )}
        </div>

        <div className="nav-user">
          <span className="nav-username">{user?.name}</span>
          <button className="btn-logout" onClick={logout}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <div className="mobile-nav">
        <button
          className={`mobile-nav-btn ${page === "dashboard" ? "active" : ""}`}
          onClick={() => setPage("dashboard")}
        >
          <svg className="mob-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
          Dashboard
        </button>
        <button
          className={`mobile-nav-btn ${page === "quiz-setup" ? "active" : ""}`}
          onClick={() => setPage("quiz-setup")}
        >
          <svg className="mob-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
          New Quiz
        </button>
        <button
          className={`mobile-nav-btn ${page === "leaderboard" ? "active" : ""}`}
          onClick={() => setPage("leaderboard")}
        >
          <svg className="mob-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          Ranks
        </button>
        {user?.role === "admin" && (
          <button
            className={`mobile-nav-btn ${page === "admin" ? "active" : ""}`}
            onClick={() => setPage("admin")}
          >
            <svg className="mob-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Admin
          </button>
        )}
      </div>
    </>
  );


  // ==================== RENDER: LOGIN ====================

  const renderLogin = () => (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <svg className="nav-logo-svg" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{margin: "0 auto 12px", display: "block"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <h1>QuizAI</h1>
          <p>Test your knowledge with AI-powered quizzes</p>
        </div>

        <form className="auth-form" onSubmit={handleLogin}>
          <input
            className="form-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="form-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <span>Don&apos;t have an account? </span>
          <button onClick={() => { setMessage({ text: "", type: "" }); setPage("register"); }}>
            Create one
          </button>
        </div>
      </div>
    </div>
  );


  // ==================== RENDER: REGISTER ====================

  const renderRegister = () => (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <svg className="nav-logo-svg" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{margin: "0 auto 12px", display: "block"}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <h1>Create Account</h1>
          <p>Join QuizAI and start learning</p>
        </div>

        <form className="auth-form" onSubmit={handleRegister}>
          <input
            className="form-input"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="form-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="form-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <button onClick={() => { setMessage({ text: "", type: "" }); setPage("login"); }}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  );


  // ==================== RENDER: DASHBOARD ====================

  const renderDashboard = () => (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, <span className="gradient-text">{user?.name}</span></h1>
        <p>Ready for your next challenge?</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
          </div>
          <div className="stat-value">{dashStats?.total_quizzes || 0}</div>
          <div className="stat-label">Quizzes Taken</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <div className="stat-value">{dashStats?.avg_percentage || 0}%</div>
          <div className="stat-label">Average Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6 6 0 0 1 6 6v3.58a6 6 0 0 1-1.92 4.41L12 20l-4.08-4.01A6 6 0 0 1 6 11.58V8a6 6 0 0 1 6-6z"></path></svg>
          </div>
          <div className="stat-value">{dashStats?.best_percentage || 0}%</div>
          <div className="stat-label">Best Score</div>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-card">
        <div className="cta-content">
          <h2>Start a New AI Quiz</h2>
          <p>Pick any topic and let AI generate questions for you</p>
        </div>
        <button className="cta-btn" onClick={() => setPage("quiz-setup")}>
          Generate Quiz →
        </button>
      </div>

      {/* Recent Results */}
      <h3 className="section-title">Recent Attempts</h3>

      {recentResults.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
          </div>
          <p>No quiz attempts yet. Start your first quiz!</p>
          <button className="btn-primary" style={{ width: "auto", padding: "12px 28px" }}
            onClick={() => setPage("quiz-setup")}>
            Take a Quiz
          </button>
        </div>
      ) : (
        <table className="results-table">
          <thead>
            <tr>
              <th>Quiz</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentResults.map((r) => {
              const pct = r.percentage || Math.round(r.score * 100 / r.total_questions);
              const perf = getPerformance(pct);
              return (
                <tr key={r.id}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{r.quiz_title}</td>
                  <td>{r.score}/{r.total_questions}</td>
                  <td><span className={`badge ${perf.class}`}>{pct}%</span></td>
                  <td>{formatDate(r.created_at)}</td>
                  <td>
                    <button className="btn-sm" onClick={() => loadReview(r.id)}>
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );


  // ==================== RENDER: QUIZ SETUP ====================

  const renderQuizSetup = () => (
    <div className="setup-page">
      <h1>Create Your <span className="gradient-text">AI Quiz</span></h1>
      <p>Choose a topic and let artificial intelligence generate unique questions for you</p>

      {/* Topic */}
      <div className="setup-section">
        <label className="setup-label">Topic</label>
        <input
          className="topic-input"
          type="text"
          placeholder="e.g. Python, World History, Space Science..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      {/* Difficulty */}
      <div className="setup-section">
        <label className="setup-label">Difficulty</label>
        <div className="difficulty-grid">
          <button
            className={`difficulty-card ${difficulty === "easy" ? "selected-easy" : ""}`}
            onClick={() => setDifficulty("easy")}
          >
            <div className="difficulty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div className="difficulty-name">Easy</div>
            <div className="difficulty-desc">Basic concepts</div>
          </button>
          <button
            className={`difficulty-card ${difficulty === "medium" ? "selected-medium" : ""}`}
            onClick={() => setDifficulty("medium")}
          >
            <div className="difficulty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div className="difficulty-name">Medium</div>
            <div className="difficulty-desc">Intermediate level</div>
          </button>
          <button
            className={`difficulty-card ${difficulty === "hard" ? "selected-hard" : ""}`}
            onClick={() => setDifficulty("hard")}
          >
            <div className="difficulty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div className="difficulty-name">Hard</div>
            <div className="difficulty-desc">Expert challenge</div>
          </button>
        </div>
      </div>

      {/* Question Count */}
      <div className="setup-section">
        <label className="setup-label">Number of Questions</label>
        <div className="count-selector">
          {[3, 5, 7, 10, 15, 20].map((n) => (
            <button
              key={n}
              className={`count-btn ${questionCount === n ? "active" : ""}`}
              onClick={() => setQuestionCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Generate */}
      <div className="setup-section">
        <button
          className="generate-btn"
          onClick={generateQuiz}
          disabled={generating || !topic.trim()}
        >
          {generating ? (
            <>
              <span className="spinner"></span>
              Generating Quiz...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8}}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              Generate Quiz
            </>
          )}
        </button>

        {generating && (
          <p className="generating-text">
            AI is creating {questionCount} {difficulty} questions about &quot;{topic}&quot;...
          </p>
        )}
      </div>

      {/* Back button */}
      <button
        className="btn-secondary"
        style={{ marginTop: 12 }}
        onClick={() => setPage("dashboard")}
      >
        ← Back to Dashboard
      </button>
    </div>
  );


  // ==================== RENDER: QUIZ ====================

  const renderQuiz = () => {
    if (questions.length === 0) {
      return (
        <div className="loading-overlay">
          <div className="loading-spinner-lg"></div>
          <span className="loading-text">Loading questions...</span>
        </div>
      );
    }

    const q = questions[currentQ];
    const progress = ((Object.keys(answers).length) / questions.length) * 100;
    const isLastQuestion = currentQ === questions.length - 1;

    return (
      <div className="quiz-page">
        {/* Top Bar */}
        <div className="quiz-top-bar">
          <div className="quiz-info">
            <h2>{selectedQuiz?.title}</h2>
            <p>{Object.keys(answers).length} of {questions.length} answered</p>
          </div>
          <div className={`timer ${timeLeft < 60 ? "warning" : ""}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 6}}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress */}
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Question */}
        <div className="question-area" key={currentQ}>
          <div className="question-number">
            Question {currentQ + 1} of {questions.length}
          </div>

          <div className="question-text">{q.question}</div>

          <div className="options-grid">
            {["A", "B", "C", "D"].map((letter) => {
              const optionKey = `option_${letter.toLowerCase()}`;
              return (
                <button
                  key={letter}
                  className={`option-card ${answers[q.id] === letter ? "selected" : ""}`}
                  onClick={() => selectAnswer(q.id, letter)}
                >
                  <span className="option-letter">{letter}</span>
                  <span className="option-text">{q[optionKey]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Dots */}
        <div className="question-dots">
          {questions.map((question, i) => (
            <button
              key={question.id}
              className={`q-dot ${i === currentQ ? "current" : ""} ${answers[question.id] ? "answered" : ""}`}
              onClick={() => setCurrentQ(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="nav-buttons">
          <button
            className="btn-nav btn-prev"
            onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
            disabled={currentQ === 0}
          >
            ← Previous
          </button>

          {isLastQuestion ? (
            <button
              className="btn-submit-quiz"
              onClick={handleSubmitQuiz}
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit Quiz ✓"}
            </button>
          ) : (
            <button
              className="btn-nav btn-next"
              onClick={() => setCurrentQ((c) => Math.min(questions.length - 1, c + 1))}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    );
  };


  // ==================== RENDER: RESULT ====================

  const renderResult = () => {
    if (!result) return null;

    const pct = result.percentage || Math.round(result.score * 100 / result.totalQuestions);
    const perf = getPerformance(pct);
    const wrong = result.totalQuestions - result.score;

    return (
      <div className="result-page">
        <div className="result-card">
          <div className="result-emoji">{perf.icon}</div>
          <h1>Quiz Complete!</h1>
          <p className="quiz-name">{selectedQuiz?.title}</p>

          <div className="score-display">
            <div className="score-circle">
              <span className="score-number">{pct}%</span>
              <span className="score-percent">{result.score}/{result.totalQuestions}</span>
            </div>
          </div>

          <span className={`performance-badge ${perf.class}`}>
            {perf.label}
          </span>

          <div className="result-stats">
            <div>
              <div className="result-stat-value" style={{ color: "var(--success)" }}>
                {result.score}
              </div>
              <div className="result-stat-label">Correct</div>
            </div>
            <div>
              <div className="result-stat-value" style={{ color: "var(--error)" }}>
                {wrong}
              </div>
              <div className="result-stat-label">Wrong</div>
            </div>
            <div>
              <div className="result-stat-value">{result.totalQuestions}</div>
              <div className="result-stat-label">Total</div>
            </div>
          </div>

          <div className="result-actions">
            <button className="btn-review" onClick={() => loadReview(result.resultId)}>
              Review Answers
            </button>
            <button className="btn-secondary" onClick={() => setPage("quiz-setup")}>
              Try Another Quiz
            </button>
            <button className="btn-secondary" onClick={() => setPage("dashboard")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  };


  // ==================== RENDER: REVIEW ====================

  const renderReview = () => {
    if (!reviewData) {
      return (
        <div className="loading-overlay">
          <div className="loading-spinner-lg"></div>
          <span className="loading-text">Loading review...</span>
        </div>
      );
    }

    const { result: rInfo, questions: rQuestions } = reviewData;
    const pct = rInfo.percentage;
    const perf = getPerformance(pct);

    return (
      <div className="review-page">
        <h1>Answer Review</h1>
        <p className="review-subtitle">
          {rInfo.quiz_title} — <span className={`badge ${perf.class}`}>{pct}% ({rInfo.score}/{rInfo.total_questions})</span>
        </p>

        {rQuestions.map((q, i) => (
          <div className="review-question" key={q.question_id}>
            <div className="review-q-header">
              <span className="review-q-text">
                {i + 1}. {q.question}
              </span>
              <span className={`review-badge ${q.is_correct ? "correct" : "wrong"}`}>
                {q.is_correct ? "✓ Correct" : "✗ Wrong"}
              </span>
            </div>

            <div className="review-options">
              {["A", "B", "C", "D"].map((letter) => {
                const optKey = `option_${letter.toLowerCase()}`;
                const isCorrect = q.correct_answer === letter;
                const isUserAnswer = q.user_answer === letter;
                const isWrongPick = isUserAnswer && !isCorrect;

                let className = "review-option";
                if (isCorrect) className += " correct-answer";
                else if (isWrongPick) className += " wrong-answer";

                return (
                  <div key={letter} className={className}>
                    <span className="opt-letter">{letter}</span>
                    <span>{q[optKey]}</span>
                    {isCorrect && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓ Correct</span>}
                    {isWrongPick && <span style={{ marginLeft: "auto", fontSize: 12 }}>✗ Your answer</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="review-back">
          <button className="btn-secondary" onClick={() => setPage("dashboard")}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  };


  // ==================== RENDER: LEADERBOARD ====================

  const renderLeaderboard = () => (
    <div className="leaderboard-page">
      <h1>
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 10, color: "var(--gold)"}}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path><path d="M12 2a6 6 0 0 1 6 6v3.58a6 6 0 0 1-1.92 4.41L12 20l-4.08-4.01A6 6 0 0 1 6 11.58V8a6 6 0 0 1 6-6z"></path></svg>
        Leaderboard
      </h1>
      <p>Top performers ranked by their best quiz score</p>

      {leaderboard.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
          </div>
          <p>No scores yet. Be the first to take a quiz!</p>
        </div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Best Score</th>
              <th>Quizzes Taken</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, i) => {
              const isCurrentUser = entry.id === user?.id;
              const medals = ["🥇", "🥈", "🥉"];

              return (
                <tr
                  key={entry.id}
                  className={isCurrentUser ? "current-user-row" : ""}
                >
                  <td className="rank-cell">
                    {i === 0 ? (
                      <svg className="medal-svg gold" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                    ) : i === 1 ? (
                      <svg className="medal-svg silver" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                    ) : i === 2 ? (
                      <svg className="medal-svg bronze" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {entry.name} {isCurrentUser && "(You)"}
                  </td>
                  <td>
                    <span className={`badge ${getPerformance(entry.best_percentage).class}`}>
                      {entry.best_percentage}%
                    </span>
                  </td>
                  <td>{entry.total_quizzes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );


  // ==================== RENDER: ADMIN ====================

  const renderAdmin = () => {
    if (user?.role !== "admin") {
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <p>Admin access required</p>
        </div>
      );
    }

    return (
      <div className="admin-page">
        <h1>Admin Dashboard</h1>
        <p>Manage quizzes, users, and view system statistics</p>

        {/* Stats */}
        {adminStats && (
          <div className="admin-stats">
            <div className="admin-stat">
              <div className="stat-icon" style={{marginBottom: 8}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <div className="admin-stat-value">{adminStats.users}</div>
              <div className="admin-stat-label">Users</div>
            </div>
            <div className="admin-stat">
              <div className="stat-icon" style={{marginBottom: 8}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              </div>
              <div className="admin-stat-value">{adminStats.quizzes}</div>
              <div className="admin-stat-label">Quizzes</div>
            </div>
            <div className="admin-stat">
              <div className="stat-icon" style={{marginBottom: 8}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div className="admin-stat-value">{adminStats.questions}</div>
              <div className="admin-stat-label">Questions</div>
            </div>
            <div className="admin-stat">
              <div className="stat-icon" style={{marginBottom: 8}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 8 8 12 12 16"></polyline><line x1="16" y1="12" x2="8" y2="12"></line></svg>
              </div>
              <div className="admin-stat-value">{adminStats.attempts}</div>
              <div className="admin-stat-label">Attempts</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${adminTab === "quizzes" ? "active" : ""}`}
            onClick={() => setAdminTab("quizzes")}
          >
            Quizzes
          </button>
          <button
            className={`admin-tab ${adminTab === "users" ? "active" : ""}`}
            onClick={() => setAdminTab("users")}
          >
            Users
          </button>
          <button
            className={`admin-tab ${adminTab === "results" ? "active" : ""}`}
            onClick={() => setAdminTab("results")}
          >
            Results
          </button>
        </div>

        {/* Quizzes Tab */}
        {adminTab === "quizzes" && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Questions</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {adminQuizzes.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: 32 }}>No quizzes</td></tr>
              ) : (
                adminQuizzes.map((q) => (
                  <tr key={q.id}>
                    <td>{q.id}</td>
                    <td style={{ color: "var(--text-primary)" }}>{q.title}</td>
                    <td>{q.question_count}</td>
                    <td>{formatDate(q.created_at)}</td>
                    <td>
                      <button className="btn-danger" onClick={() => deleteQuiz(q.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Users Tab */}
        {adminTab === "users" && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: 32 }}>No users</td></tr>
              ) : (
                adminUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td style={{ color: "var(--text-primary)" }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role === "admin" ? "role-admin" : "role-user"}`}>
                        {u.role || "user"}
                      </span>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Results Tab */}
        {adminTab === "results" && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Quiz</th>
                <th>Score</th>
                <th>%</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {adminResults.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: "center", padding: 32 }}>No results</td></tr>
              ) : (
                adminResults.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td style={{ color: "var(--text-primary)" }}>{r.user_name}</td>
                    <td>{r.quiz_title}</td>
                    <td>{r.score}/{r.total_questions}</td>
                    <td>
                      <span className={`badge ${getPerformance(r.percentage).class}`}>
                        {r.percentage}%
                      </span>
                    </td>
                    <td>{formatDate(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    );
  };


  // ==================== MAIN RENDER ====================

  // Auth pages (no navbar)
  if (page === "login") return (
    <div className="app">
      <div className="bg-glow-blob-1"></div>
      <div className="bg-glow-blob-2"></div>
      <div className="bg-glow-blob-3"></div>
      {message.text && <div className={`toast toast-${message.type}`}>{message.text}</div>}
      {renderLogin()}
    </div>
  );

  if (page === "register") return (
    <div className="app">
      <div className="bg-glow-blob-1"></div>
      <div className="bg-glow-blob-2"></div>
      <div className="bg-glow-blob-3"></div>
      {message.text && <div className={`toast toast-${message.type}`}>{message.text}</div>}
      {renderRegister()}
    </div>
  );

  // All other pages (with navbar)
  return (
    <div className="app">
      <div className="bg-glow-blob-1"></div>
      <div className="bg-glow-blob-2"></div>
      <div className="bg-glow-blob-3"></div>
      {renderNavbar()}
      {message.text && <div className={`toast toast-${message.type}`}>{message.text}</div>}
      <main className="main-content">
        {page === "dashboard" && renderDashboard()}
        {page === "quiz-setup" && renderQuizSetup()}
        {page === "quiz" && renderQuiz()}
        {page === "result" && renderResult()}
        {page === "review" && renderReview()}
        {page === "leaderboard" && renderLeaderboard()}
        {page === "admin" && renderAdmin()}
      </main>
    </div>
  );
}

export default App;