import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  ChevronRight,
  Trophy,
  AlertCircle,
  ListFilter,
  Home,
  ChevronLeft,
  Target,
  RotateCcw,
  PlayCircle,
  Trash2,
  Layers,
  Zap,
} from "lucide-react";
import clsx from "clsx";

const Button = ({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  fullWidth = true,
  title,
}) => {
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200",
    danger: "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200",
    outline: "border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50",
    ghost:
      "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 shadow-none",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        fullWidth ? "w-full" : "w-auto",
        className
      )}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={clsx(
        "px-2.5 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1.5",
        colors[color]
      )}
    >
      {children}
    </span>
  );
};

const KEYS = {
  EXAM: "iot_save_exam",
  ALL: "iot_save_all",
  TOPIC: "iot_save_topic",
  BEST_SCORE: "iot_best_score",
};

export default function App() {
  const [allQuestions, setAllQuestions] = useState([]);
  const [displayQuestions, setDisplayQuestions] = useState([]);

  const [view, setView] = useState("home");

  const [sessionType, setSessionType] = useState(null);
  const [topicName, setTopicName] = useState("");

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [saves, setSaves] = useState({
    exam: null,
    all: null,
    topic: null,
  });

  useEffect(() => {
    const savedScore = localStorage.getItem(KEYS.BEST_SCORE);
    if (savedScore) setBestScore(parseInt(savedScore));
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    fetch(`${apiUrl}/api/questions`)
      .then((res) => res.json())
      .then((data) => setAllQuestions(data))
      .catch((err) => console.error("Lỗi API:", err));

    refreshSaves();
  }, []);

  const refreshSaves = () => {
    const getSaveInfo = (key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return {
          progress: Math.round(
            (parsed.currentQIndex / parsed.displayQuestions.length) * 100
          ),
          topicName: parsed.topicName,
          date: parsed.date || new Date().toLocaleDateString(),
        };
      } catch {
        return null;
      }
    };

    setSaves({
      exam: getSaveInfo(KEYS.EXAM),
      all: getSaveInfo(KEYS.ALL),
      topic: getSaveInfo(KEYS.TOPIC),
    });
  };

  useEffect(() => {
    if (view === "quiz" && sessionType) {
      const dataToSave = {
        sessionType,
        displayQuestions,
        currentQIndex,
        answers,
        timeLeft,
        topicName,
        date: new Date().toISOString(),
      };

      let key = "";
      if (sessionType === "exam") key = KEYS.EXAM;
      else if (sessionType === "all") key = KEYS.ALL;
      else if (sessionType === "topic") key = KEYS.TOPIC;

      if (key) {
        localStorage.setItem(key, JSON.stringify(dataToSave));
      }
    }
  }, [
    view,
    sessionType,
    displayQuestions,
    currentQIndex,
    answers,
    timeLeft,
    topicName,
  ]);

  // Timer
  useEffect(() => {
    let timer;
    if (view === "quiz" && sessionType === "exam" && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && view === "quiz" && sessionType === "exam") {
      finishQuiz();
    }
    return () => clearInterval(timer);
  }, [view, sessionType, timeLeft]);

  // --- LOGIC FUNCTIONS ---

  const getTopics = () => {
    const topics = {};
    allQuestions.forEach((q) => {
      const clo = q.clo || "Khác";
      if (!topics[clo]) topics[clo] = 0;
      topics[clo]++;
    });
    return Object.entries(topics).sort();
  };

  const createExamData = () => {
    const TOTAL = 40;
    const groups = {};
    allQuestions.forEach((q) => {
      const k = q.clo || "Other";
      if (!groups[k]) groups[k] = [];
      groups[k].push(q);
    });

    const keys = Object.keys(groups);
    if (keys.length === 0) return [];
    let selected = [];
    let pool = [];
    const base = Math.floor(TOTAL / keys.length);
    keys.forEach((k) => {
      const shuffled = [...groups[k]].sort(() => 0.5 - Math.random());
      selected.push(...shuffled.slice(0, base));
      pool.push(...shuffled.slice(base));
    });
    if (selected.length < TOTAL) {
      selected.push(
        ...pool
          .sort(() => 0.5 - Math.random())
          .slice(0, TOTAL - selected.length)
      );
    }
    return selected.sort((a, b) => (a.clo || "").localeCompare(b.clo || ""));
  };

  const startNewSession = (type, topicFilter = null) => {
    let keyToCheck = "";
    let msg = "";
    if (type === "exam") {
      keyToCheck = KEYS.EXAM;
      msg = "Bạn đang có bài Thi Thử làm dở.";
    } else if (type === "all") {
      keyToCheck = KEYS.ALL;
      msg = "Bạn đang Ôn Tất Cả dở dang.";
    } else if (type === "topic") {
      keyToCheck = KEYS.TOPIC;
      msg = "Bạn đang có bài Ôn Theo Chủ Đề dở dang.";
    }

    if (localStorage.getItem(keyToCheck)) {
      if (
        !window.confirm(
          `${msg} Bắt đầu mới sẽ xóa tiến độ cũ của phần này. Tiếp tục?`
        )
      )
        return;
    }

    setSessionType(type);
    setAnswers({});
    setScore(0);
    setCurrentQIndex(0);

    let qData = [];
    if (type === "exam") {
      qData = createExamData();
      setTimeLeft(60 * 60);
      setTopicName("Đề ngẫu nhiên");
    } else if (type === "all") {
      qData = [...allQuestions].sort(() => 0.5 - Math.random());
      setTimeLeft(0);
      setTopicName("Tất cả câu hỏi");
    } else if (type === "topic") {
      qData = allQuestions
        .filter((q) => q.clo === topicFilter)
        .sort(() => 0.5 - Math.random());
      setTimeLeft(0);
      setTopicName(topicFilter);
    }

    setDisplayQuestions(qData);
    setView("quiz");
  };

  const resumeSession = (type) => {
    let key = "";
    if (type === "exam") key = KEYS.EXAM;
    else if (type === "all") key = KEYS.ALL;
    else if (type === "topic") key = KEYS.TOPIC;

    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessionType(parsed.sessionType);
      setDisplayQuestions(parsed.displayQuestions);
      setCurrentQIndex(parsed.currentQIndex);
      setAnswers(parsed.answers);
      setTimeLeft(parsed.timeLeft);
      setTopicName(parsed.topicName);
      setView("quiz");
    }
  };

  const deleteSave = (type, e) => {
    e.stopPropagation();
    if (window.confirm("Xóa bản lưu này?")) {
      let key = "";
      if (type === "exam") key = KEYS.EXAM;
      else if (type === "all") key = KEYS.ALL;
      else if (type === "topic") key = KEYS.TOPIC;

      localStorage.removeItem(key);
      refreshSaves();
    }
  };

  const handleAnswer = (choiceId) => {
    if (sessionType !== "exam" && answers[currentQIndex]) return;
    setAnswers((prev) => ({ ...prev, [currentQIndex]: choiceId }));
  };

  const resetCurrentQuiz = () => {
    if (window.confirm("Làm lại bài này từ đầu?")) {
      setAnswers({});
      setCurrentQIndex(0);
      setScore(0);
      if (sessionType === "exam") setTimeLeft(60 * 60);
    }
  };

  const finishQuiz = () => {
    let finalScore = 0;
    displayQuestions.forEach((q, idx) => {
      if (answers[idx] === q.correct_choice) finalScore++;
    });
    setScore(finalScore);

    if (sessionType === "exam" && finalScore > bestScore) {
      setBestScore(finalScore);
      localStorage.setItem(KEYS.BEST_SCORE, finalScore);
    }

    let key = "";
    if (sessionType === "exam") key = KEYS.EXAM;
    else if (sessionType === "all") key = KEYS.ALL;
    else if (sessionType === "topic") key = KEYS.TOPIC;
    localStorage.removeItem(key);
    refreshSaves();

    setView("result");
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const ResumeCard = ({ type, data, icon: Icon, colorClass, label }) => {
    if (!data) return null;
    return (
      <div
        onClick={() => resumeSession(type)}
        className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:shadow-md transition group"
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center",
              colorClass
            )}
          >
            <Icon size={20} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-700">{label}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-100 px-1 rounded">
                {data.progress}%
              </span>
              <span>• {data.topicName}</span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => deleteSave(type, e)}
          className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  // --- RENDER ---
  const currentQ = displayQuestions[currentQIndex];
  const progress =
    displayQuestions.length > 0
      ? ((currentQIndex + 1) / displayQuestions.length) * 100
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden min-h-[800px] flex flex-col relative ring-1 ring-slate-900/5">
        {/* HEADER */}
        {view !== "home" && (
          <div
            className={clsx(
              "px-4 py-4 text-white flex items-center justify-between shadow-sm z-20 transition-colors duration-300",
              sessionType === "exam" ? "bg-rose-600" : "bg-indigo-600"
            )}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setView("home");
                  refreshSaves();
                }}
                className="p-2 hover:bg-white/20 rounded-xl transition"
                title="Trang chủ"
              >
                <Home size={20} />
              </button>
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base tracking-wide leading-none">
                  {sessionType === "exam" ? "Thi Thử" : "Ôn Tập"}
                </span>
                <span className="text-[10px] opacity-80 font-medium truncate max-w-[150px]">
                  {topicName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {view === "quiz" && (
                <button
                  onClick={resetCurrentQuiz}
                  className="p-2 hover:bg-white/20 rounded-xl transition"
                  title="Làm lại"
                >
                  <RotateCcw size={18} />
                </button>
              )}
              {sessionType === "exam" && view === "quiz" && (
                <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
                  <Clock size={14} /> {formatTime(timeLeft)}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#FAFAFA]">
          <AnimatePresence mode="wait">
            {/* --- HOME --- */}
            {view === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col flex-1 p-6 overflow-y-auto custom-scrollbar"
              >
                {/* Logo Area */}
                <div className="mt-4 mb-6 text-center">
                  <div className="inline-flex p-3 bg-indigo-50 rounded-3xl mb-3 ring-4 ring-indigo-50">
                    <BookOpen size={40} className="text-indigo-600" />
                  </div>
                  <h1 className="text-2xl font-black text-slate-800">IoT</h1>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <span className="text-2xl font-black text-indigo-600">
                      {allQuestions.length}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Câu hỏi
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                    <span className="text-2xl font-black text-emerald-500">
                      {bestScore}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Kỷ lục Thi
                    </span>
                  </div>
                </div>

                {(saves.exam || saves.all || saves.topic) && (
                  <div className="mb-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                      Tiếp tục học
                    </h3>
                    <div className="space-y-2">
                      <ResumeCard
                        type="exam"
                        data={saves.exam}
                        icon={Clock}
                        label="Thi Thử"
                        colorClass="bg-rose-100 text-rose-600"
                      />
                      <ResumeCard
                        type="all"
                        data={saves.all}
                        icon={Layers}
                        label="Ôn Tất Cả"
                        colorClass="bg-indigo-100 text-indigo-600"
                      />
                      <ResumeCard
                        type="topic"
                        data={saves.topic}
                        icon={Target}
                        label="Ôn Chủ Đề"
                        colorClass="bg-amber-100 text-amber-600"
                      />
                    </div>
                  </div>
                )}

                {/* --- SECTION: BẮT ĐẦU MỚI --- */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
                    Bắt đầu mới
                  </h3>
                  <div className="space-y-3">
                    <Button
                      onClick={() => setView("topic-select")}
                      variant="outline"
                      className="justify-between group bg-white hover:border-amber-300"
                    >
                      <span className="flex items-center gap-3">
                        <Target size={20} className="text-amber-500" /> Ôn theo
                        chủ đề
                      </span>
                      <ChevronRight
                        size={18}
                        className="text-slate-300 group-hover:text-amber-500 transition"
                      />
                    </Button>

                    <Button
                      onClick={() => startNewSession("all")}
                      variant="outline"
                      className="justify-between group bg-white hover:border-indigo-300"
                    >
                      <span className="flex items-center gap-3">
                        <Layers size={20} className="text-indigo-500" /> Ôn tất
                        cả (Ngẫu nhiên)
                      </span>
                      <ChevronRight
                        size={18}
                        className="text-slate-300 group-hover:text-indigo-500 transition"
                      />
                    </Button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-[#FAFAFA] px-2 text-slate-400">
                          Hoặc
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => startNewSession("exam")}
                      variant="danger"
                      className="justify-center shadow-rose-200 shadow-lg"
                    >
                      <Clock size={20} /> Thi Thử Mới (60p)
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TOPIC SELECT --- */}
            {view === "topic-select" && (
              <motion.div
                key="topic"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex flex-col flex-1 p-6"
              >
                <button
                  onClick={() => setView("home")}
                  className="flex items-center gap-1 text-sm text-slate-400 font-bold mb-6 hover:text-indigo-600 transition"
                >
                  <ChevronLeft size={16} /> Quay lại
                </button>
                <h2 className="text-xl font-bold mb-4">Chọn chủ đề ôn tập</h2>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {getTopics().map(([topic, count]) => (
                    <div
                      key={topic}
                      onClick={() => startNewSession("topic", topic)}
                      className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-amber-500 hover:shadow-md cursor-pointer transition flex justify-between items-center group"
                    >
                      <div>
                        <h3 className="font-bold text-slate-700 group-hover:text-amber-600">
                          {topic}
                        </h3>
                        <span className="text-xs text-slate-400">
                          {count} câu hỏi
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-amber-50">
                        <PlayCircle
                          size={20}
                          className="text-slate-300 group-hover:text-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* --- QUIZ --- */}
            {view === "quiz" && currentQ && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col flex-1 h-full"
              >
                <div className="w-full bg-slate-200 h-1.5">
                  <div
                    className={clsx(
                      "h-full transition-all duration-500 ease-out",
                      sessionType === "exam" ? "bg-rose-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pb-24">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Câu {currentQIndex + 1}/{displayQuestions.length}
                    </span>
                    <Badge color={sessionType === "topic" ? "amber" : "blue"}>
                      <ListFilter size={10} /> {currentQ.clo || "General"}
                    </Badge>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed mb-8">
                    {currentQ.question}
                  </h3>

                  <div className="space-y-3">
                    {currentQ.choices.map((choice) => {
                      const userAns = answers[currentQIndex];
                      const correctAns = currentQ.correct_choice;
                      const isSelected = userAns === choice.id;

                      let style =
                        "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
                      let icon = (
                        <span className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
                          {choice.id}
                        </span>
                      );

                      if (sessionType === "exam") {
                        if (isSelected) {
                          style =
                            "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500";
                          icon = (
                            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                              {choice.id}
                            </span>
                          );
                        }
                      } else {
                        if (userAns) {
                          if (choice.id === correctAns) {
                            style =
                              "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500";
                            icon = (
                              <CheckCircle
                                size={24}
                                className="text-emerald-500"
                              />
                            );
                          } else if (isSelected) {
                            style =
                              "border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500";
                            icon = (
                              <XCircle size={24} className="text-rose-500" />
                            );
                          } else {
                            style =
                              "border-slate-100 bg-slate-50 text-slate-400 opacity-60";
                          }
                        }
                      }

                      return (
                        <div
                          key={choice.id}
                          onClick={() => handleAnswer(choice.id)}
                          className={clsx(
                            "p-4 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all duration-200 active:scale-[0.99]",
                            style
                          )}
                        >
                          <div className="shrink-0 mt-0.5">{icon}</div>
                          <span className="text-sm font-medium leading-relaxed">
                            {choice.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {sessionType !== "exam" &&
                    answers[currentQIndex] &&
                    answers[currentQIndex] !== currentQ.correct_choice && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl"
                      >
                        <div className="flex gap-2 items-center text-amber-600 font-bold text-sm mb-1">
                          <AlertCircle size={16} /> Sai rồi:
                        </div>
                        <p className="text-amber-900 text-sm leading-relaxed">
                          Đáp án đúng:{" "}
                          <strong>{currentQ.correct_answer}</strong>.{" "}
                          {currentQ.explanation}
                        </p>
                      </motion.div>
                    )}
                </div>

                <div className="absolute bottom-0 w-full bg-white border-t border-slate-100 p-4 flex gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  <Button
                    variant="ghost"
                    className="w-16 px-0 bg-slate-700 text-white hover:bg-slate-600 shadow-md transition-all active:scale-95"
                    onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
                    disabled={currentQIndex === 0}
                    title="Quay lại câu trước"
                  >
                    <ChevronLeft size={32} strokeWidth={3} />
                  </Button>

                  {sessionType === "exam" || answers[currentQIndex] ? (
                    <Button
                      onClick={() =>
                        currentQIndex < displayQuestions.length - 1
                          ? setCurrentQIndex((i) => i + 1)
                          : finishQuiz()
                      }
                      variant={sessionType === "exam" ? "danger" : "primary"}
                      className="flex-1 shadow-lg shadow-indigo-200/50"
                    >
                      {currentQIndex === displayQuestions.length - 1 ? (
                        <span className="flex items-center gap-2">
                          Nộp Bài <CheckCircle size={18} />
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Câu Tiếp Theo <ChevronRight size={18} />
                        </span>
                      )}
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic font-medium bg-slate-50 border border-slate-100 rounded-2xl py-3.5 select-none">
                      Vui lòng chọn đáp án
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* --- RESULT --- */}
            {view === "result" && (
              <motion.div
                key="result"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col flex-1 p-8 items-center justify-center text-center"
              >
                <div className="w-32 h-32 bg-yellow-50 rounded-full flex items-center justify-center mb-6 relative">
                  <Trophy size={64} className="text-yellow-500" />
                  <div className="absolute -bottom-2 bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-bold">
                    {Math.round((score / displayQuestions.length) * 100)}%
                  </div>
                </div>

                <h2 className="text-2xl font-black text-slate-800 mb-1">
                  Hoàn thành!
                </h2>
                <p className="text-slate-500 mb-8">
                  {sessionType === "exam"
                    ? "Kết quả thi thử"
                    : `Hoàn thành ôn: ${topicName}`}
                </p>

                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="block text-2xl font-black text-emerald-600">
                      {score}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 uppercase">
                      Đúng
                    </span>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <span className="block text-2xl font-black text-rose-600">
                      {displayQuestions.length - score}
                    </span>
                    <span className="text-xs font-bold text-rose-400 uppercase">
                      Sai
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setView("home");
                    refreshSaves();
                  }}
                  variant="primary"
                >
                  Về Trang Chủ
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
