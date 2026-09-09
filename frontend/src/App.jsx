import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "";

const POPULAR_TOPICS = [
  { title: "Python Programming", tag: "Coding", desc: "Syntax, OOP, and data structures" },
  { title: "JavaScript & React", tag: "Web Dev", desc: "ES6+, Hooks, Async/Await" },
  { title: "Artificial Intelligence", tag: "Tech", desc: "Machine learning, LLMs & neural nets" },
  { title: "World History", tag: "History", desc: "Ancient civilizations & modern eras" },
  { title: "General Science", tag: "Science", desc: "Physics, chemistry & biology basics" },
  { title: "Cybersecurity & Networks", tag: "Security", desc: "Protocols, encryption & defense" },
];

// Clean Eye Icon for Password Visibility Toggle
const EyeIcon = ({ visible }) => (
  visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  )
);

function App() {
  const [page, setPage] = useState("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dashboard state
  const [stats, setStats] = useState({
    quizzesTaken: 0,
    averageScore: 0,
    totalCorrect: 0,
    totalQuestions: 0,
  });
  const [history, setHistory] = useState([]);

  // New Quiz state
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);

  // Quiz state
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardFilter, setLeaderboardFilter] = useState("all");

  // Review state
  const [reviewData, setReviewData] = useState(null);
  const [lastResultId, setLastResultId] = useState(null);

  // UI state
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ================================================================
  // BROWSER HISTORY & NAVIGATION
  // ================================================================

  const changePage = (newPage) => {
    setMessage("");
    if (newPage !== page) {
      window.history.pushState({ page: newPage }, "", `#${newPage}`);
      setPage(newPage);
    }
  };

  useEffect(() => {
    const handlePopState = (event) => {
      const pageFromState = event.state?.page;
      const hashPage = window.location.hash.replace("#", "");
      const targetPage = pageFromState || hashPage || (user ? "dashboard" : "login");
      setPage(targetPage);
    };

    const initialHash = window.location.hash.replace("#", "");
    const initialPage = initialHash || (user ? "dashboard" : "login");
    if (!window.history.state) {
      window.history.replaceState({ page: initialPage }, "", `#${initialPage}`);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [user]);

  // ================================================================
  // AUTH HANDLERS
  // ================================================================

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }
      setToken(data.token);
      setUser(data.user);
      setShowWelcomeModal(true);
      setMessage("");
      changePage("dashboard");
    } catch (error) {
      setMessage("Cannot connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Registration failed");
        return;
      }
      setMessage("Registration successful! Please sign in.");
      setName("");
      setEmail("");
      setPassword("");
      changePage("login");
    } catch (error) {
      setMessage("Cannot connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setMessage("Please enter your email");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Failed to send OTP");
        return;
      }
      setMessage("OTP sent to your email. Please verify.");
      changePage("verify-otp");
    } catch (error) {
      setMessage("Cannot connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setMessage("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Invalid or expired OTP");
        return;
      }
      setMessage("OTP verified! Set your new password.");
      changePage("reset-password");
    } catch (error) {
      setMessage("Cannot connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    if (newPassword.length < 4) {
      setMessage("Password must be at least 4 characters");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Password reset failed");
        return;
      }
      setMessage("Password reset successful! Please sign in.");
      setResetEmail("");
      setNewPassword("");
      setConfirmPassword("");
      changePage("login");
    } catch (error) {
      setMessage("Cannot connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken("");
    setQuestions([]);
    setAnswers({});
    setSelectedQuiz(null);
    setScore(null);
    setEmail("");
    setPassword("");
    setTopic("");
    changePage("login");
  };

  // ================================================================
  // DATA LOADERS
  // ================================================================

  const loadStats = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/user-stats/${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setStats({
          quizzesTaken: data.quizzesTaken || 0,
          averageScore: data.averageScore || 0,
          totalCorrect: data.totalCorrect || 0,
          totalQuestions: data.totalQuestions || 0,
        });
      }
    } catch (error) {
      console.error("Failed to load stats");
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/user-history/${user.id}`);
      const data = await response.json();
      if (response.ok) {
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to load user history");
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      const data = await response.json();
      if (response.ok) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error("Failed to load leaderboard");
    }
  };

  useEffect(() => {
    if (page === "dashboard" && user) {
      loadStats();
      loadHistory();
    }
    if (page === "leaderboard") {
      loadLeaderboard();
    }
  }, [page, user]);

  // ================================================================
  // QUIZ GENERATION & SUBMISSION
  // ================================================================

  const startQuizWithTopic = (customTopic, customDifficulty = "medium", count = 5) => {
    setTopic(customTopic);
    setDifficulty(customDifficulty);
    setQuestionCount(count);
    generateQuizWithParams(customTopic, customDifficulty, count);
  };

  const generateQuizWithParams = async (quizTopic, quizDiff, quizCount) => {
    const topicToUse = quizTopic || topic;
    if (!topicToUse.trim()) {
      setMessage("Please enter a topic");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicToUse.trim(),
          difficulty: quizDiff || difficulty,
          numberOfQuestions: quizCount || questionCount,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Failed to generate quiz");
        return;
      }
      setSelectedQuiz({
        id: data.quizId,
        title: data.title,
        topic: data.topic,
        difficulty: data.difficulty,
      });

      const qResponse = await fetch(`${API_URL}/quizzes/${data.quizId}/questions`);
      const qData = await qResponse.json();
      setQuestions(qData.questions || []);
      setAnswers({});
      setScore(null);
      setMessage("");
      changePage("quiz");
    } catch (error) {
      setMessage("Cannot connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    generateQuizWithParams(topic, difficulty, questionCount);
  };

  const selectAnswer = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const submitQuiz = async () => {
    if (!user || !selectedQuiz) return;
    if (Object.keys(answers).length !== questions.length) {
      setMessage("Please answer all questions before submitting.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/submit-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          quiz_id: selectedQuiz.id,
          answers,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Failed to submit quiz");
        return;
      }
      setScore(data.score);
      setLastResultId(data.resultId);
      changePage("result");
    } catch (error) {
      setMessage("Failed to submit quiz.");
    } finally {
      setLoading(false);
    }
  };

  const loadReview = async (resultId) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/quiz-review/${resultId}`);
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Failed to load review");
        return;
      }
      setReviewData(data);
      changePage("review");
    } catch (error) {
      setMessage("Failed to load quiz review.");
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (avg) => {
    const val = Number(avg);
    if (val >= 90) return { title: "Grandmaster" };
    if (val >= 75) return { title: "Diamond Scholar" };
    if (val >= 50) return { title: "Rising Scholar" };
    return { title: "Learner" };
  };

  // ================================================================
  // NAVIGATION HEADER
  // ================================================================

  const NavigationHeader = () => (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo" onClick={() => { changePage("dashboard"); }}>
          <div className="navbar-logo-mark">Q</div>
          <div className="navbar-logo-text">Quiz<span>AI</span></div>
        </div>

        <nav className="navbar-nav">
          <button
            className={`nav-link ${page === "dashboard" ? "active" : ""}`}
            onClick={() => { changePage("dashboard"); }}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${page === "new-quiz" ? "active" : ""}`}
            onClick={() => { changePage("new-quiz"); }}
          >
            Create Quiz
          </button>
          <button
            className={`nav-link ${page === "leaderboard" ? "active" : ""}`}
            onClick={() => { changePage("leaderboard"); }}
          >
            Leaderboard
          </button>
        </nav>

        <div className="navbar-right">
          <div className="navbar-user">
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="user-name">{user?.name}</span>
          </div>
          <button className="btn-signout" onClick={logout}>
            Sign Out
          </button>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="mobile-nav-overlay open">
          <button
            className={`mobile-nav-link ${page === "dashboard" ? "active" : ""}`}
            onClick={() => { setMobileMenuOpen(false); changePage("dashboard"); }}
          >
            Dashboard
          </button>
          <button
            className={`mobile-nav-link ${page === "new-quiz" ? "active" : ""}`}
            onClick={() => { setMobileMenuOpen(false); changePage("new-quiz"); }}
          >
            Create Quiz
          </button>
          <button
            className={`mobile-nav-link ${page === "leaderboard" ? "active" : ""}`}
            onClick={() => { setMobileMenuOpen(false); changePage("leaderboard"); }}
          >
            Leaderboard
          </button>
          <div className="mobile-nav-divider"></div>
          <button
            className="mobile-nav-link"
            onClick={() => { setMobileMenuOpen(false); logout(); }}
          >
            Sign Out ({user?.name})
          </button>
        </div>
      )}
    </header>
  );

  // ================================================================
  // AUTH PAGES
  // ================================================================

  if (page === "login") {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-mark">Q</div>
              <span className="auth-logo-name">QuizAI</span>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to your QuizAI account to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label className="form-label">Password</label>
                <button
                  type="button"
                  className="label-link"
                  onClick={() => { changePage("forgot-password"); }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {message && <div className="alert alert-error">{message}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : "Sign In"}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => { changePage("register"); }}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "register") {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-mark">Q</div>
              <span className="auth-logo-name">QuizAI</span>
            </div>
            <h1 className="auth-title">Create an account</h1>
            <p className="auth-subtitle">Get started with AI-generated quizzes and track your performance</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {message && <div className="alert alert-error">{message}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : "Create Account"}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => { changePage("login"); }}
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "forgot-password") {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-mark">Q</div>
              <span className="auth-logo-name">QuizAI</span>
            </div>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-subtitle">Enter your registered email and we will send a verification code</p>
          </div>

          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>

            {message && <div className="alert alert-error">{message}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : "Send Verification Code"}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              onClick={() => { changePage("login"); }}
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "verify-otp") {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-mark">Q</div>
              <span className="auth-logo-name">QuizAI</span>
            </div>
            <h1 className="auth-title">Enter verification code</h1>
            <p className="auth-subtitle">We sent a 6-digit code to <strong>{resetEmail}</strong></p>
          </div>

          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="form-group">
              <label className="form-label">6-digit code</label>
              <input
                type="text"
                className="otp-input"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>

            {message && <div className="alert alert-info">{message}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : "Verify Code"}
            </button>
          </form>

          <div className="auth-footer">
            <button
              type="button"
              onClick={() => { changePage("forgot-password"); }}
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (page === "reset-password") {
    return (
      <div className="auth-page">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-mark">Q</div>
              <span className="auth-logo-name">QuizAI</span>
            </div>
            <h1 className="auth-title">Set new password</h1>
            <p className="auth-subtitle">Enter a new password for your account</p>
          </div>

          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">New password</label>
              <div className="input-wrapper">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  title={showNewPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showNewPassword} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>

            {message && <div className="alert alert-error">{message}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <span className="btn-spinner"></span> : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ================================================================
  // DASHBOARD PAGE
  // ================================================================

  if (page === "dashboard") {
    const totalXP = stats.quizzesTaken * 100 + stats.totalCorrect * 15;
    const userLevel = Math.max(1, Math.floor(totalXP / 250) + 1);
    const xpProgress = Math.min(100, Math.round(((totalXP % 250) / 250) * 100));
    const userStreak = history.length > 0 ? Math.min(history.length, 7) : 0;

    return (
      <div className="app-shell">
        <NavigationHeader />

        <main className="page-content">
          {/* Premium Welcome Panel */}
          {showWelcomeModal && (
            <div className="wlc-backdrop" onClick={() => setShowWelcomeModal(false)}>
              <div className="wlc-panel" onClick={(e) => e.stopPropagation()}>

                {/* Decorative accent — subtle geometric detail */}
                <div className="wlc-deco" aria-hidden="true">
                  <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                    <circle cx="60" cy="60" r="58" stroke="rgba(79,110,247,0.06)" strokeWidth="1"/>
                    <circle cx="60" cy="60" r="40" stroke="rgba(79,110,247,0.04)" strokeWidth="1"/>
                    <circle cx="60" cy="60" r="20" stroke="rgba(79,110,247,0.03)" strokeWidth="1"/>
                  </svg>
                </div>

                {/* Close */}
                <button
                  className="wlc-close"
                  onClick={() => setShowWelcomeModal(false)}
                  aria-label="Close welcome message"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>

                {/* Brand + Identity Row */}
                <div className="wlc-identity">
                  <div className="wlc-brand-mark">Q</div>
                  <span className="wlc-brand-sep"></span>
                  <div className="wlc-user-initial">
                    {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                </div>

                {/* Heading */}
                <h2 className="wlc-heading">
                  Welcome back,<br />
                  <span className="wlc-name">{user?.name || "Learner"}</span>
                </h2>

                {/* Body */}
                <p className="wlc-body">
                  Ready for your next challenge? Continue your learning journey and sharpen your skills with AI-powered quizzes.
                </p>

                {/* Actions */}
                <div className="wlc-actions">
                  <button
                    className="wlc-btn-primary"
                    onClick={() => {
                      setShowWelcomeModal(false);
                      changePage("new-quiz");
                    }}
                  >
                    Create Quiz
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                  <button
                    className="wlc-btn-ghost"
                    onClick={() => {
                      setShowWelcomeModal(false);
                      changePage("leaderboard");
                    }}
                  >
                    View Leaderboard
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Clean Dashboard Header */}
          <div className="dashboard-header">
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-sub">Overview of your learning progress, XP level, and quiz history.</p>
          </div>

          {/* Gamification Progress & Streak Cards */}
          <div className="gamification-grid">
            <div className="level-card">
              <div className="level-card-header">
                <span className="level-title">
                  <span>Level {userLevel} Progress</span>
                </span>
                <span className="xp-badge">⚡ {totalXP} Total XP</span>
              </div>
              <div>
                <div className="progress-track" style={{ height: "8px", marginBottom: "var(--sp-2)" }}>
                  <div className="progress-fill" style={{ width: `${xpProgress}%` }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  <span>{totalXP % 250} / 250 XP to Level {userLevel + 1}</span>
                  <span>{xpProgress}%</span>
                </div>
              </div>
              <div className="achievements-row">
                <span className={`achievement-pill ${stats.quizzesTaken >= 1 ? "unlocked" : ""}`}>
                  🚀 First Quiz {stats.quizzesTaken >= 1 ? "✓" : "🔒"}
                </span>
                <span className={`achievement-pill ${stats.averageScore >= 80 ? "unlocked" : ""}`}>
                  🎯 High Accuracy {stats.averageScore >= 80 ? "✓" : "🔒"}
                </span>
                <span className={`achievement-pill ${stats.quizzesTaken >= 5 ? "unlocked" : ""}`}>
                  📚 Quiz Enthusiast {stats.quizzesTaken >= 5 ? "✓" : "🔒"}
                </span>
                <span className={`achievement-pill ${stats.totalCorrect >= 15 ? "unlocked" : ""}`}>
                  👑 Quiz Master {stats.totalCorrect >= 15 ? "✓" : "🔒"}
                </span>
              </div>
            </div>

            <div className="streak-card">
              <span className="streak-val">🔥 {userStreak}</span>
              <span className="streak-label">Quiz Streak</span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Active Learning Days</span>
            </div>
          </div>

          {/* Featured Quiz Focal Point */}
          <div className="featured-quiz-card">
            <div>
              <span className="badge badge-accent" style={{ marginBottom: "var(--sp-2)" }}>Featured Challenge</span>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
                Python Programming & Data Structures
              </h3>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                Master core syntax, OOP principles, and algorithm basics with a 5-question AI test.
              </p>
            </div>
            <button
              className="btn btn-primary"
              style={{ flexShrink: 0 }}
              onClick={() => startQuizWithTopic("Python Programming", "medium", 5)}
            >
              Start Challenge →
            </button>
          </div>

          {/* Performance Overview Stats */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-label">Quizzes Completed</span>
              <span className="stat-value">{stats.quizzesTaken}</span>
              <span className="stat-sub">Total completed</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Average Accuracy</span>
              <span className="stat-value accent">{stats.averageScore}%</span>
              <span className="stat-sub">Across all quizzes</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Total Correct</span>
              <span className="stat-value green">{stats.totalCorrect}</span>
              <span className="stat-sub">out of {stats.totalQuestions} questions</span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Rank Status</span>
              <span className="stat-value" style={{ fontSize: "var(--text-lg)" }}>
                {getRankBadge(stats.averageScore).title}
              </span>
              <span className="stat-sub">Based on average score</span>
            </div>
          </div>

          {/* Explore Topics */}
          <div style={{ marginBottom: "var(--sp-10)" }}>
            <div className="section-header">
              <h2 className="section-title">Explore Topics</h2>
              <button
                className="section-action"
                onClick={() => { changePage("new-quiz"); }}
              >
                Custom Topic →
              </button>
            </div>

            <div className="topics-grid">
              {POPULAR_TOPICS.map((item, index) => (
                <div
                  key={index}
                  className="topic-card"
                  onClick={() => startQuizWithTopic(item.title, "medium", 5)}
                >
                  <span className="topic-card-tag">{item.tag}</span>
                  <h3 className="topic-card-title">{item.title}</h3>
                  <p className="topic-card-desc">{item.desc}</p>
                  <div className="topic-card-meta">
                    <span className="topic-meta-item">5 Questions</span>
                    <span className="topic-meta-item">•</span>
                    <span className="topic-meta-item">Medium</span>
                    <span className="topic-card-arrow">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="section-header">
              <h2 className="section-title">Quiz History</h2>
            </div>

            {history.length === 0 ? (
              <div className="card empty-state">
                <h3 className="empty-title">No quizzes completed yet</h3>
                <p className="empty-desc">Create your first quiz or pick a popular topic above to get started.</p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { changePage("new-quiz"); }}
                >
                  Start a Quiz
                </button>
              </div>
            ) : (
              <div className="history-table">
                <div className="history-table-head">
                  <span className="history-th">Quiz</span>
                  <span className="history-th">Score</span>
                  <span className="history-th">Accuracy</span>
                  <span className="history-th">Date</span>
                  <span className="history-th">Actions</span>
                </div>
                <div className="history-table-body">
                  {history.map((item, idx) => {
                    const pct = Number(item.percentage);
                    const pctClass = pct >= 80 ? "pct-green" : pct >= 50 ? "pct-amber" : "pct-red";
                    return (
                      <div className="history-row" key={item.id || idx}>
                        <span className="history-quiz-name">{item.quiz_title}</span>
                        <span className="history-score">{item.score}/{item.total_questions}</span>
                        <div>
                          <span className={`history-pct ${pctClass}`}>{pct}%</span>
                        </div>
                        <span className="history-date">
                          {new Date(item.submitted_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <div className="history-actions">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => loadReview(item._id || item.id)}
                          >
                            Review
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => startQuizWithTopic(item.quiz_title, "medium", 5)}
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ================================================================
  // CREATE QUIZ PAGE
  // ================================================================

  if (page === "new-quiz") {
    return (
      <div className="app-shell">
        <NavigationHeader />

        <main className="page-content narrow create-quiz-layout">
          <div className="create-quiz-header">
            <h1 className="page-title">Create Quiz</h1>
            <p className="page-desc">Generate a custom multiple-choice quiz using AI.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); generateQuiz(); }} className="create-quiz-form">
            <div className="form-section">
              <h2 className="form-section-title">Topic or Keyword</h2>
              <div className="form-group">
                <label className="form-label" htmlFor="quiz-topic-input">What subject would you like to be tested on?</label>
                <input
                  id="quiz-topic-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. React Hooks, World War II, Python Data Science..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <div className="suggestion-row">
                  {["React.js", "Python OOP", "Machine Learning", "World Geography", "SQL Databases"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="suggestion-chip"
                      onClick={() => setTopic(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Difficulty Level</h2>
              <div className="difficulty-row">
                <div
                  className={`diff-option ${difficulty === "easy" ? "selected" : ""}`}
                  onClick={() => setDifficulty("easy")}
                >
                  <div className="diff-label">Easy</div>
                  <div className="diff-desc">Foundational questions and simple logic</div>
                </div>
                <div
                  className={`diff-option ${difficulty === "medium" ? "selected" : ""}`}
                  onClick={() => setDifficulty("medium")}
                >
                  <div className="diff-label">Medium</div>
                  <div className="diff-desc">Standard difficulty with core practical knowledge</div>
                </div>
                <div
                  className={`diff-option ${difficulty === "hard" ? "selected" : ""}`}
                  onClick={() => setDifficulty("hard")}
                >
                  <div className="diff-label">Hard</div>
                  <div className="diff-desc">Complex scenarios and edge cases</div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h2 className="form-section-title">Number of Questions</h2>
              <div className="count-row">
                {[3, 5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    className={`count-option ${questionCount === cnt ? "selected" : ""}`}
                    onClick={() => setQuestionCount(cnt)}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>

            {message && <div className="alert alert-error">{message}</div>}

            <div className="create-quiz-actions">
              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Generating Quiz...</span>
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </button>
            </div>
          </form>
        </main>
      </div>
    );
  }

  // ================================================================
  // TAKING QUIZ INTERFACE
  // ================================================================

  if (page === "quiz") {
    const answeredCount = Object.keys(answers).length;
    const progressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

    return (
      <div className="app-shell">
        <header className="quiz-header">
          <div className="quiz-header-inner">
            <div className="quiz-title-block">
              <p className="quiz-page-label">Quiz</p>
              <h2 className="quiz-name">{selectedQuiz?.title}</h2>
            </div>
            <div className="quiz-progress-info">
              {answeredCount} of {questions.length} answered
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (window.confirm("Are you sure you want to exit? Your progress will be lost.")) {
                  changePage("dashboard");
                }
              }}
            >
              Exit Quiz
            </button>
          </div>
        </header>

        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }}></div>
        </div>

        <main className="quiz-body">
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-8)", marginBottom: "var(--sp-8)" }}>
            {questions.map((question, index) => {
              const qId = question.id || question._id;
              return (
                <div key={qId || index} className="card" style={{ padding: "var(--sp-6)" }}>
                  <p className="question-counter">Question {index + 1} of {questions.length}</p>
                  <h3 className="question-text" style={{ marginBottom: "var(--sp-6)" }}>{question.question}</h3>

                  <div className="options-list" style={{ marginBottom: 0 }}>
                    {["A", "B", "C", "D"].map((opt) => {
                      const isSelected = answers[qId] === opt;
                      return (
                        <div
                          key={opt}
                          className={`option-item ${isSelected ? "selected" : ""}`}
                          onClick={() => selectAnswer(qId, opt)}
                        >
                          <div className="option-letter">{opt}</div>
                          <div className="option-text">{question[`option_${opt.toLowerCase()}`]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {message && <div className="alert alert-error" style={{ marginBottom: "var(--sp-6)" }}>{message}</div>}

          <div className="quiz-nav">
            <span className="quiz-answer-count">{answeredCount} of {questions.length} answered</span>
            <div className="quiz-nav-right">
              <button
                className="btn btn-primary btn-lg"
                onClick={submitQuiz}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  "Submit Quiz"
                )}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ================================================================
  // RESULT SCREEN
  // ================================================================

  if (page === "result") {
    const totalQ = questions.length || 1;
    const percentage = Math.round((score / totalQ) * 100);
    const passed = percentage >= 60;

    return (
      <div className="app-shell">
        <NavigationHeader />

        <main className="page-content">
          <div className="result-page">
            <p className="result-label">Quiz Results</p>

            <div className="result-score-display">
              <span className={`result-percentage ${passed ? "pass" : "fail"}`}>{percentage}%</span>
            </div>

            <h1 className="result-title">{passed ? "Great Job!" : "Quiz Completed"}</h1>
            <p className="result-subtitle">{selectedQuiz?.title}</p>

            <div className="result-stats-grid">
              <div className="result-stat-box">
                <p className="result-stat-label">Correct</p>
                <p className="result-stat-value" style={{ color: "var(--green)" }}>{score}</p>
              </div>
              <div className="result-stat-box">
                <p className="result-stat-label">Incorrect</p>
                <p className="result-stat-value" style={{ color: "var(--red)" }}>{totalQ - score}</p>
              </div>
              <div className="result-stat-box">
                <p className="result-stat-label">Accuracy</p>
                <p className="result-stat-value">{percentage}%</p>
              </div>
            </div>

            <div className="result-actions">
              {lastResultId && (
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={() => loadReview(lastResultId)}
                  disabled={loading}
                >
                  {loading ? <span className="btn-spinner"></span> : "Review Answers"}
                </button>
              )}
              <button
                className="btn btn-secondary btn-full"
                onClick={() => {
                  setAnswers({});
                  setScore(null);
                  changePage("new-quiz");
                }}
              >
                Take Another Quiz
              </button>
              <button
                className="btn btn-ghost btn-full"
                onClick={() => {
                  setAnswers({});
                  setScore(null);
                  changePage("dashboard");
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ================================================================
  // REVIEW PAGE
  // ================================================================

  if (page === "review" && reviewData) {
    const pct = reviewData.percentage;

    return (
      <div className="app-shell">
        <NavigationHeader />

        <main className="page-content medium">
          <div className="review-header">
            <div className="review-score-circle">
              <span className="review-score-num">{pct}%</span>
              <span className="review-score-label">SCORE</span>
            </div>
            <div className="review-info">
              <h1 className="review-quiz-title">{reviewData.quiz_title}</h1>
              <p className="review-meta">
                Score: {reviewData.score} of {reviewData.total_questions} correct
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setReviewData(null);
                changePage("dashboard");
              }}
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="review-questions">
            {reviewData.questions.map((question, index) => {
              const qId = question.id || question._id;
              return (
                <div
                  className={`review-q-card ${question.is_correct ? "is-correct" : "is-wrong"}`}
                  key={qId || index}
                >
                  <div className="review-q-header">
                    <span className="review-q-number">Question {index + 1}</span>
                    <span className={`badge ${question.is_correct ? "badge-green" : "badge-red"}`}>
                      {question.is_correct ? "Correct" : "Incorrect"}
                    </span>
                  </div>

                  <div className="review-q-body">
                    <h3 className="review-q-text">{question.question}</h3>

                    <div className="review-options">
                      {["A", "B", "C", "D"].map((opt) => {
                        const isCorrect = question.correct_answer && question.correct_answer.toUpperCase() === opt;
                        const isUserAnswer = question.user_answer && question.user_answer.toUpperCase() === opt;
                        const isWrongPick = isUserAnswer && !isCorrect;

                        let optClass = "review-option";
                        if (isCorrect) optClass += " is-correct-answer";
                        if (isWrongPick) optClass += " is-wrong-pick";

                        return (
                          <div key={opt} className={optClass}>
                            <div className="review-opt-letter">{opt}</div>
                            <span className="review-opt-text">
                              {question[`option_${opt.toLowerCase()}`]}
                            </span>
                            {isUserAnswer && (
                              <span style={{ marginLeft: "auto", fontSize: "12px", color: isCorrect ? "var(--green)" : "var(--red)", fontWeight: 500 }}>
                                {isCorrect ? "Your Answer" : "Your Choice"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: "var(--sp-8)" }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setReviewData(null);
                changePage("dashboard");
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ================================================================
  // LEADERBOARD PAGE
  // ================================================================

  if (page === "leaderboard") {
    const totalXP = stats.quizzesTaken * 100 + stats.totalCorrect * 15;
    const userRankIndex = leaderboard.findIndex(entry => user && (entry.user_id === user.id || entry.id === user.id));
    const userRankPosition = userRankIndex >= 0 ? userRankIndex + 1 : 1;
    const topThree = leaderboard.slice(0, 3);

    return (
      <div className="app-shell">
        <NavigationHeader />

        <main className="page-content">
          {/* Leaderboard Header & Personal Summary */}
          <div className="lb-header-wrap">
            <div className="lb-title-row">
              <div>
                <h1 className="leaderboard-title">Leaderboard</h1>
                <p className="leaderboard-subtitle">See who's mastering the challenge.</p>
              </div>

              {/* Segmented Filter Control */}
              <div className="segmented-control">
                <button
                  className={`segmented-btn ${leaderboardFilter === "week" ? "active" : ""}`}
                  onClick={() => setLeaderboardFilter("week")}
                >
                  This Week
                </button>
                <button
                  className={`segmented-btn ${leaderboardFilter === "month" ? "active" : ""}`}
                  onClick={() => setLeaderboardFilter("month")}
                >
                  This Month
                </button>
                <button
                  className={`segmented-btn ${leaderboardFilter === "all" ? "active" : ""}`}
                  onClick={() => setLeaderboardFilter("all")}
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Personal Summary Card */}
            {user && (
              <div className="personal-summary-card">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)" }}>
                  <div className="user-avatar" style={{ width: "42px", height: "42px", fontSize: "16px" }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <strong style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}>{user.name}</strong>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Your Current Standing</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "var(--sp-8)" }}>
                  <div className="summary-metric">
                    <span className="summary-metric-val">#{userRankPosition}</span>
                    <span className="summary-metric-label">Your Position</span>
                  </div>
                  <div className="summary-metric">
                    <span className="summary-metric-val" style={{ color: "var(--green)" }}>{stats.averageScore}%</span>
                    <span className="summary-metric-label">Accuracy</span>
                  </div>
                  <div className="summary-metric">
                    <span className="summary-metric-val">{stats.quizzesTaken}</span>
                    <span className="summary-metric-label">Quizzes Completed</span>
                  </div>
                  <div className="summary-metric">
                    <span className="summary-metric-val" style={{ color: "var(--amber)" }}>⚡ {totalXP}</span>
                    <span className="summary-metric-label">Total XP</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {leaderboard.length === 0 ? (
            <div className="card empty-state">
              <h3 className="empty-title">No student rankings recorded yet</h3>
              <p className="empty-desc">Be the first to complete a quiz and appear on the leaderboard!</p>
            </div>
          ) : (
            <>
              {/* Top 3 Performers Section */}
              {topThree.length > 0 && (
                <div className="top-performers-section">
                  <div className="section-header" style={{ marginBottom: "var(--sp-4)" }}>
                    <h2 className="section-title">Top Performers</h2>
                  </div>

                  <div className="top-performers-grid">
                    {/* 2nd Place */}
                    {topThree[1] && (
                      <div className="podium-card rank-2">
                        <span className="podium-rank-badge rank-2">#2 Silver</span>
                        <div className="podium-avatar-lg">{topThree[1].name ? topThree[1].name.charAt(0).toUpperCase() : "U"}</div>
                        <strong className="podium-user-name">{topThree[1].name}</strong>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{topThree[1].quiz_title}</span>
                        <div className="podium-stats-row">
                          <span>Score: <strong>{topThree[1].score}/{topThree[1].total_questions}</strong></span>
                          <span>Accuracy: <strong style={{ color: "var(--green)" }}>{topThree[1].percentage}%</strong></span>
                        </div>
                      </div>
                    )}

                    {/* 1st Place */}
                    {topThree[0] && (
                      <div className="podium-card rank-1">
                        <span className="podium-rank-badge rank-1">👑 #1 Champion</span>
                        <div className="podium-avatar-lg">{topThree[0].name ? topThree[0].name.charAt(0).toUpperCase() : "U"}</div>
                        <strong className="podium-user-name">{topThree[0].name}</strong>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{topThree[0].quiz_title}</span>
                        <div className="podium-stats-row">
                          <span>Score: <strong>{topThree[0].score}/{topThree[0].total_questions}</strong></span>
                          <span>Accuracy: <strong style={{ color: "var(--amber)" }}>{topThree[0].percentage}%</strong></span>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {topThree[2] && (
                      <div className="podium-card rank-3">
                        <span className="podium-rank-badge rank-3">#3 Bronze</span>
                        <div className="podium-avatar-lg">{topThree[2].name ? topThree[2].name.charAt(0).toUpperCase() : "U"}</div>
                        <strong className="podium-user-name">{topThree[2].name}</strong>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{topThree[2].quiz_title}</span>
                        <div className="podium-stats-row">
                          <span>Score: <strong>{topThree[2].score}/{topThree[2].total_questions}</strong></span>
                          <span>Accuracy: <strong style={{ color: "var(--green)" }}>{topThree[2].percentage}%</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Rankings Section */}
              <div className="section-header" style={{ marginBottom: "var(--sp-4)" }}>
                <h2 className="section-title">All Rankings</h2>
              </div>

              <div className="lb-table">
                <div className="lb-table-head">
                  <span className="lb-th">Rank</span>
                  <span className="lb-th">User</span>
                  <span className="lb-th">Quiz Topic</span>
                  <span className="lb-th">Score</span>
                  <span className="lb-th">Accuracy</span>
                  <span className="lb-th">Date</span>
                  <span className="lb-th">Actions</span>
                </div>
                <div className="lb-table-body">
                  {leaderboard.map((entry, index) => {
                    const isMe = user && (entry.user_id === user.id || entry.id === user.id);
                    const rankClass = index === 0 ? "top1" : index === 1 ? "top2" : index === 2 ? "top3" : "";
                    const pct = Number(entry.percentage);
                    const pctClass = pct >= 80 ? "pct-green" : pct >= 50 ? "pct-amber" : "pct-red";

                    return (
                      <div className={`lb-row ${isMe ? "is-me" : ""}`} key={entry.id || index}>
                        <span className={`lb-rank ${rankClass}`}>#{index + 1}</span>
                        <div className="lb-user">
                          <div className="lb-avatar">
                            {entry.name ? entry.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="lb-name">{entry.name}</span>
                          {isMe && <span className="lb-you-badge">YOU</span>}
                        </div>
                        <span className="history-quiz-name">{entry.quiz_title}</span>
                        <span className="history-score">{entry.score}/{entry.total_questions}</span>
                        <div>
                          <span className={`history-pct ${pctClass}`}>{pct}%</span>
                        </div>
                        <span className="history-date">
                          {entry.submitted_at
                            ? new Date(entry.submitted_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                        <div className="history-actions">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => loadReview(entry.id)}
                          >
                            Review
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => startQuizWithTopic(entry.quiz_title, "medium", 5)}
                          >
                            Retake
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    );
  }

  return null;
}

export default App;