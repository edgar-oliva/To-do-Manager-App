import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Trash2, CheckCircle, Circle, Timer, Calendar, Coffee, Zap, Shield, Sun, Moon, ArrowUp, Edit2, MoreVertical, RotateCcw, Check } from 'lucide-react';

interface Task {
  id: number;
  text: string;
  completed: boolean;
  dueDate: string;
  repeat: string;
}

interface HistoryEntry extends Task {
  completedAt: string;
}

declare global {
  interface Window {
    electronAPI: {
      saveData: (key: string, data: any) => Promise<boolean>;
      loadData: (key: string) => Promise<any>;
      getPlatform: () => string;
    }
  }
}

export default function App() {
  const { t, i18n } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedHistory, setCompletedHistory] = useState<HistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Initial Data
  useEffect(() => {
    const loadInitialData = async () => {
      if (window.electronAPI) {
        const savedTasks = await window.electronAPI.loadData('tasks');
        const savedHistory = await window.electronAPI.loadData('completedHistory');
        const savedDarkMode = await window.electronAPI.loadData('darkMode');
        const savedLang = await window.electronAPI.loadData('language');

        if (savedTasks) {
          setTasks(savedTasks.map((t: any) => ({ ...t, repeat: t.repeat || 'none' })));
        }
        if (savedHistory) {
          setCompletedHistory(savedHistory);
        }
        if (savedDarkMode !== null) {
          setDarkMode(savedDarkMode);
        }
        if (savedLang) {
          i18n.changeLanguage(savedLang);
        }
      } else {
        // Fallback for web/dev if needed
        const saved = localStorage.getItem('tasks');
        if (saved) setTasks(JSON.parse(saved));
      }
      setIsLoaded(true);
    };
    loadInitialData();
  }, []);
  // States handled in useEffect above
  const [newTask, setNewTask] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTaskDate, setScheduleTaskDate] = useState('');
  const [repeatRule, setRepeatRule] = useState('none');
  const [showHistory, setShowHistory] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [view, setView] = useState('tareas');
  const [focusMode, setFocusMode] = useState(false);
  const [focusType, setFocusType] = useState('pomodoro');
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedTaskForCalendar, setSelectedTaskForCalendar] = useState<Task | null>(null);
  const [calendarDate, setCalendarDate] = useState('');
  const [calendarTime, setCalendarTime] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskRepeat, setEditTaskRepeat] = useState('none');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const resetApp = () => {
    if (confirm(t('menu.restartConfirm'))) {
      if (window.electronAPI) {
        window.electronAPI.saveData('tasks', []);
        window.electronAPI.saveData('completedHistory', []);
      }
      localStorage.clear();
      window.location.reload();
    }
    setIsMenuOpen(false);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    if (window.electronAPI) {
      window.electronAPI.saveData('language', lang);
    }
    localStorage.setItem('language', lang);
  };

  // Persist tasks
  useEffect(() => {
    if (isLoaded && window.electronAPI) {
      window.electronAPI.saveData('tasks', tasks);
    }
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks, isLoaded]);

  // Persist settings
  useEffect(() => {
    if (isLoaded && window.electronAPI) {
      window.electronAPI.saveData('darkMode', darkMode);
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode, isLoaded]);

  useEffect(() => {
    if (isLoaded && window.electronAPI) {
      window.electronAPI.saveData('completedHistory', completedHistory);
    }
    localStorage.setItem('completedHistory', JSON.stringify(completedHistory));
  }, [completedHistory, isLoaded]);

  useEffect(() => {
    if (isLoaded && window.electronAPI) {
      window.electronAPI.saveData('completedHistory', completedHistory);
    }
    localStorage.setItem('completedHistory', JSON.stringify(completedHistory));
  }, [completedHistory, isLoaded]);

  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().slice(0, 5);
    setCalendarDate(dateStr);
    setCalendarTime(timeStr);
  }, []);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleTaskDate(tomorrow.toISOString().split('T')[0]);
    let interval: any;
    if (focusMode) {
      interval = setInterval(() => {
        setFocusSeconds(s => {
          const maxTime = isBreak ? 300 : (focusType === 'pomodoro' ? 1500 : focusType === 'short' ? 900 : 3600);
          if (s + 1 >= maxTime) {
            playAlert();
            if (!isBreak) {
              setIsBreak(true);
              return 0;
            } else {
              setIsBreak(false);
              return 0;
            }
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusMode, isBreak, focusType]);



  const playAlert = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKbk7q1jHQU2kdj03IUlBSp4yPDajz0KFV6z6eyrVQ==');
    audio.play().catch(() => { });
  };

  const startFocusMode = (type: string) => {
    setFocusType(type);
    setFocusMode(true);
    setFocusSeconds(0);
    setIsBreak(false);
  };

  const stopFocusMode = () => {
    setFocusMode(false);
    setFocusSeconds(0);
    setIsBreak(false);
  };

  const addTask = (isScheduled = false) => {
    if (newTask.trim()) {
      if (newTask.length > 300) return;

      const newTaskObj = {
        id: Date.now(),
        text: newTask,
        completed: false,
        dueDate: isScheduled ? scheduleTaskDate : selectedDate,
        repeat: isScheduled ? repeatRule : 'none'
      };

      setTasks([...tasks, newTaskObj]);
      setNewTask('');
      setShowScheduleModal(false);
      setRepeatRule('none');
    }
  };

  const getNextDate = (currentDate: string, repeat: string) => {
    const date = new Date(currentDate + 'T12:00:00'); // Midday to avoid DST issues
    if (repeat === 'daily') date.setDate(date.getDate() + 1);
    else if (repeat === 'weekly') date.setDate(date.getDate() + 7);
    else if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  const toggleTask = (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (!task.completed) {
      // Mark as completed and handle history/repeat
      const historyEntry = { ...task, completed: true, completedAt: new Date().toISOString() };
      setCompletedHistory([historyEntry, ...completedHistory]);

      if (task.repeat !== 'none') {
        setTasks(tasks.map(t =>
          t.id === id ? { ...t, dueDate: getNextDate(selectedDate, t.repeat), completed: false } : t
        ));
      } else {
        setTasks(tasks.filter(t => t.id !== id));
      }
    } else {
      // If we allowed untoggling (rare in this flow but good to have)
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: false } : t));
    }
  };

  const confirmDelete = (task: Task) => {
    if (task.repeat !== 'none') {
      setTaskToDelete(task);
      setShowDeleteModal(true);
    } else {
      deleteTask(task.id);
    }
  };

  const deleteTask = (id: number, deleteAll = true) => {
    if (deleteAll) {
      setTasks(tasks.filter(task => task.id !== id));
    } else {
      // Delete only "this session" = skip to next date of occurrence
      setTasks(tasks.map(t =>
        t.id === id ? { ...t, dueDate: getNextDate(selectedDate, t.repeat) } : t
      ));
    }
    setShowDeleteModal(false);
    setTaskToDelete(null);
  };



  const reportDistraction = () => {
    setDistractionCount(prev => prev + 1);
  };

  const openCalendarModal = (task: Task) => {
    setSelectedTaskForCalendar(task);
    setShowCalendarModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTaskText(task.text);
    setEditTaskDate(task.dueDate);
    setEditTaskRepeat(task.repeat || 'none');
  };

  const saveEditTask = () => {
    if (!editingTask || !editTaskText.trim()) return;

    setTasks(tasks.map(task =>
      task.id === editingTask.id
        ? { ...task, text: editTaskText, dueDate: editTaskDate, repeat: editTaskRepeat }
        : task
    ));

    setEditingTask(null);
    setEditTaskText('');
    setEditTaskDate('');
    setEditTaskRepeat('none');
  };

  const addToGoogleCalendar = () => {
    if (!selectedTaskForCalendar) return;

    const startDateTime = new Date(`${calendarDate}T${calendarTime}`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60000); // Default 30 min since we removed estimatedTime

    const formatDateTime = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedTaskForCalendar.text)}&dates=${formatDateTime(startDateTime)}/${formatDateTime(endDateTime)}`;

    window.open(googleCalendarUrl, '_blank');
    setShowCalendarModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  const isTaskOnDate = (task: Task, date: string) => {
    if (task.dueDate === date) return true;
    if (task.repeat === 'none') return false;

    const taskDate = new Date(task.dueDate + 'T12:00:00');
    const targetDate = new Date(date + 'T12:00:00');

    if (targetDate < taskDate) return false;

    const diffTime = targetDate.getTime() - taskDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (task.repeat === 'daily') return true;
    if (task.repeat === 'weekly') return diffDays % 7 === 0;
    if (task.repeat === 'monthly') return targetDate.getDate() === taskDate.getDate();

    return false;
  };

  const filteredTasks = tasks.filter(task => isTaskOnDate(task, selectedDate));

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.id - a.id; // Newest first
  });

  const completedTasks = tasks.filter(t => t.completed).length;

  const bgClass = darkMode ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-slate-100 to-blue-50';
  const cardClass = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textClass = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSecondaryClass = darkMode ? 'text-slate-400' : 'text-slate-600';
  const inputClass = darkMode ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400';
  const buttonPrimaryClass = darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600';
  const buttonSecondaryClass = darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700';

  return (
    <div className={`min-h-screen ${bgClass} p-4 transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto">

        <div className={`${cardClass} rounded-2xl shadow-xl p-6 mb-6 border`}>
          <div className="flex items-center justify-between mb-6 relative">
            <div className="flex items-center gap-3">
              <Clock className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h1 className={`text-3xl font-bold ${textClass}`}>{t('appTitle')}</h1>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setView('tareas')}
                className={`px-4 py-2 rounded-lg transition ${view === 'tareas' ? `${buttonPrimaryClass} text-white` : buttonSecondaryClass}`}
              >
                {t('modes.tasks')}
              </button>
              <button
                onClick={() => setView('enfoque')}
                className={`px-4 py-2 rounded-lg transition ${view === 'enfoque' ? `${buttonPrimaryClass} text-white` : buttonSecondaryClass}`}
              >
                {t('modes.focus')}
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-2 rounded-lg ${buttonSecondaryClass} transition`}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                  <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} z-50 overflow-hidden`}>
                    <div className="p-2 space-y-1">
                      {/* Stats */}
                      <button
                        onClick={() => { setView('estadisticas'); setIsMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${view === 'estadisticas' ? (darkMode ? 'bg-slate-700' : 'bg-slate-100') : (darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50')} ${textClass}`}
                      >
                        <ArrowUp className="w-4 h-4 rotate-45" /> {/* Using generic icon for stats if needed or just text */}
                        {t('menu.stats')}
                      </button>

                      {/* Theme */}
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} ${textClass}`}
                      >
                        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {t('menu.theme')}
                      </button>

                      <div className={`h-px my-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>

                      {/* Language */}
                      <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${textSecondaryClass} opacity-70`}>Language</div>
                      <button
                        onClick={() => changeLanguage('en')}
                        className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} ${textClass}`}
                      >
                        <span>English</span>
                        {i18n.language === 'en' && <Check className="w-4 h-4 text-blue-500" />}
                      </button>
                      <button
                        onClick={() => changeLanguage('es')}
                        className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} ${textClass}`}
                      >
                        <span>Español</span>
                        {i18n.language === 'es' && <Check className="w-4 h-4 text-blue-500" />}
                      </button>

                      <div className={`h-px my-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>

                      {/* History */}
                      <button onClick={() => { setShowHistory(true); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"} ${textClass}`}>
                        <CheckCircle className="w-4 h-4" />
                        {t("menu.history")}
                      </button>
                      <div className={`h-px my-1 ${darkMode ? "bg-slate-700" : "bg-slate-100"}`}></div>
                      {/* Restart */}
                      <button
                        onClick={resetApp}
                        className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition text-red-500 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-red-50'}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        {t('menu.restart')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {view === 'enfoque' && (
            <div className="space-y-6">
              <div className={`${darkMode ? 'bg-gradient-to-r from-blue-800 to-indigo-800' : 'bg-gradient-to-r from-blue-500 to-indigo-600'} rounded-xl p-6 text-white`}>
                <h2 className="text-2xl font-bold mb-2">{t('focus.title')}</h2>
                <p className="opacity-90">{t('focus.subtitle')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => startFocusMode('pomodoro')}
                  className={`${darkMode ? 'bg-gradient-to-br from-rose-700 to-red-800 border-rose-600' : 'bg-gradient-to-br from-red-500 to-rose-600 border-red-400'} text-white rounded-xl p-6 hover:scale-105 transition transform border`}
                >
                  <Timer className="w-12 h-12 mb-3" />
                  <h3 className="text-xl font-bold mb-2">{t('focus.pomodoro.title')}</h3>
                  <p className="text-sm opacity-90">{t('focus.pomodoro.desc1')}</p>
                  <p className="text-sm opacity-90">{t('focus.pomodoro.desc2')}</p>
                </button>

                <button
                  onClick={() => startFocusMode('short')}
                  className={`${darkMode ? 'bg-gradient-to-br from-teal-700 to-emerald-800 border-teal-600' : 'bg-gradient-to-br from-teal-500 to-emerald-600 border-teal-400'} text-white rounded-xl p-6 hover:scale-105 transition transform border`}
                >
                  <Zap className="w-12 h-12 mb-3" />
                  <h3 className="text-xl font-bold mb-2">{t('focus.shortSprint.title')}</h3>
                  <p className="text-sm opacity-90">{t('focus.shortSprint.desc1')}</p>
                  <p className="text-sm opacity-90">{t('focus.shortSprint.desc2')}</p>
                </button>

                <button
                  onClick={() => startFocusMode('deep')}
                  className={`${darkMode ? 'bg-gradient-to-br from-blue-700 to-indigo-800 border-blue-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400'} text-white rounded-xl p-6 hover:scale-105 transition transform border`}
                >
                  <Shield className="w-12 h-12 mb-3" />
                  <h3 className="text-xl font-bold mb-2">{t('focus.deepWork.title')}</h3>
                  <p className="text-sm opacity-90">{t('focus.deepWork.desc1')}</p>
                  <p className="text-sm opacity-90">{t('focus.deepWork.desc2')}</p>
                </button>
              </div>

              <div className={`${darkMode ? 'bg-slate-700 border-blue-700' : 'bg-blue-50 border-blue-200'} border-2 rounded-xl p-6`}>
                <h3 className={`font-bold ${darkMode ? 'text-blue-400' : 'text-blue-900'} mb-3 flex items-center gap-2`}>
                  {t('focus.tips.title')}
                </h3>
                <ul className={`space-y-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li>• {t('focus.tips.l1')}</li>
                  <li>• {t('focus.tips.l2')}</li>
                  <li>• {t('focus.tips.l3')}</li>
                  <li>• {t('focus.tips.l4')}</li>
                  <li>• {t('focus.tips.l5')}</li>
                </ul>
              </div>

              {distractionCount > 0 && (
                <div className={`${darkMode ? 'bg-slate-700 border-orange-600' : 'bg-orange-50 border-orange-300'} border-2 rounded-xl p-6`}>
                  <h3 className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-900'} mb-2`}>{t('focus.distractions.title')}</h3>
                  <p className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                    <span dangerouslySetInnerHTML={{ __html: t('focus.distractions.count', { count: distractionCount, times: distractionCount === 1 ? t('focus.distractions.times_one') : t('focus.distractions.times_other') }) }}></span>
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'} mt-2`}>
                    {distractionCount < 3 ? t('focus.distractions.feedback1') :
                      distractionCount < 6 ? t('focus.distractions.feedback2') :
                        t('focus.distractions.feedback3')}
                  </p>
                </div>
              )}
            </div>
          )}

          {view === 'tareas' && (
            <>
              {/* Date Selector */}
              <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`px-4 py-2 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none transition-all shadow-sm`}
                />
                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap shadow-sm ${selectedDate === new Date().toISOString().split('T')[0]
                    ? 'bg-blue-600 text-white'
                    : `${darkMode ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-white text-slate-600 border border-slate-200'}`
                    }`}
                >
                  {t('calendar.todayTasks') || 'Today tasks'}
                </button>
              </div>
              <div className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-4 mb-6 border`}>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask(false)}
                    maxLength={300}
                    placeholder={t('tasks.placeholder')}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none transition-all`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => addTask(false)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 ${buttonPrimaryClass} text-white rounded-xl transition shadow-sm font-bold`}
                    >
                      <Plus className="w-5 h-5" />
                      {t('tasks.addBtn')}
                    </button>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} rounded-xl transition shadow-sm font-bold`}
                    >
                      <Calendar className="w-5 h-5" />
                      {t('tasks.scheduleBtn')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {sortedTasks.length === 0 ? (
                  <div className={`text-center py-12 ${textSecondaryClass}`}>
                    <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{t('tasks.empty')}</p>
                  </div>
                ) : (
                  sortedTasks.map(task => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${task.completed ? `${darkMode ? 'bg-slate-700 border-slate-600 opacity-60' : 'bg-slate-100 border-slate-200 opacity-60'}` : `${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'}`
                        }`}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                        ) : (
                          <Circle className={`w-6 h-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.completed ? `line-through ${textSecondaryClass}` : textClass}`}>
                          {task.text}
                        </p>
                        <div className={`flex gap-3 mt-0.5 text-xs font-medium ${textSecondaryClass}`}>
                          {task.repeat !== 'none' && (
                            <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-500">
                              <RotateCcw size={10} /> {task.repeat}
                            </span>
                          )}
                        </div>
                      </div>

                      <>
                        <button
                          onClick={() => openEditModal(task)}
                          className={`p-2 ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'} rounded-lg transition`}
                          title={t('tasks.editTooltip')}
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openCalendarModal(task)}
                          className={`p-2 ${darkMode ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-blue-50'} rounded-lg transition`}
                          title={t('tasks.calendarTooltip')}
                        >
                          <Calendar className="w-5 h-5" />
                        </button>
                      </>

                      <button
                        onClick={() => confirmDelete(task)}
                        className={`p-2 ${darkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-500 hover:bg-red-50'} rounded-lg transition`}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {view === 'estadisticas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${darkMode ? 'bg-gradient-to-br from-teal-700 to-teal-800 border-teal-600' : 'bg-gradient-to-br from-teal-500 to-teal-600 border-teal-400'} rounded-xl p-6 text-white border`}>
                  <p className="text-sm opacity-90 mb-1">{t('stats.totalTasks')}</p>
                  <p className="text-4xl font-bold">{tasks.length}</p>
                </div>
                <div className={`${darkMode ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 border-emerald-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400'} rounded-xl p-6 text-white border col-span-1 md:col-span-2 text-center`}>
                  <p className="text-sm opacity-90 mb-1">{t('stats.completed')}</p>
                  <p className="text-4xl font-bold">{completedTasks}</p>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-6 border`}>
                <h3 className={`text-xl font-bold ${textClass} mb-4`}>{t('stats.progress')}</h3>
                <div className={`w-full ${darkMode ? 'bg-slate-600' : 'bg-slate-200'} rounded-full h-6 overflow-hidden`}>
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-500 flex items-center justify-center text-white text-sm font-bold"
                    style={{ width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` }}
                  >
                    {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`text-center ${textSecondaryClass} text-sm mb-2`}>
          {darkMode ? t('footer.dark') : t('footer.light')}
        </div>
        <div className={`text-center ${textSecondaryClass} text-xs font-semibold opacity-75`}>
          Created by Edgar Martínez Oliva • v1.7
        </div>
      </div >

      {/* Schedule Modal */}
      {
        showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`${cardClass} w-full max-w-md rounded-2xl p-6 shadow-2xl border flex flex-col gap-6`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-bold ${textClass}`}>{t('schedule.title')}</h3>
                <button onClick={() => setShowScheduleModal(false)} className={textSecondaryClass}>
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('schedule.dateLabel')}</label>
                  <input
                    type="date"
                    value={scheduleTaskDate}
                    onChange={(e) => setScheduleTaskDate(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('schedule.repeatLabel')}</label>
                  <select
                    value={repeatRule}
                    onChange={(e) => setRepeatRule(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none`}
                  >
                    <option value="none">{t('schedule.none')}</option>
                    <option value="daily">{t('schedule.daily')}</option>
                    <option value="weekly">{t('schedule.weekly')}</option>
                    <option value="monthly">{t('schedule.monthly')}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition ${buttonSecondaryClass}`}
                >
                  {t('schedule.cancelBtn')}
                </button>
                <button
                  onClick={() => addTask(true)}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition ${buttonPrimaryClass}`}
                >
                  {t('schedule.saveBtn')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* History Modal */}
      {
        showHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`${cardClass} w-full max-w-lg rounded-2xl p-6 shadow-2xl border flex flex-col gap-6 max-h-[80vh]`}>
              <div className="flex justify-between items-center">
                <h3 className={`text-xl font-bold ${textClass}`}>{t('history.title')}</h3>
                <button onClick={() => setShowHistory(false)} className={textSecondaryClass}>
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                {completedHistory.length === 0 ? (
                  <div className={`text-center py-12 ${textSecondaryClass}`}>
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>{t('history.empty')}</p>
                  </div>
                ) : (
                  completedHistory.map((item, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border-2 ${darkMode ? 'border-emerald-900/40 bg-emerald-900/10' : 'border-emerald-100 bg-emerald-50'} flex justify-between items-center`}>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${textClass}`}>{item.text}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs opacity-70">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {item.dueDate}</span>
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 ml-3" />
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => setShowHistory(false)}
                className={`w-full px-4 py-3 rounded-xl font-semibold transition ${buttonPrimaryClass} text-white`}
              >
                {t('history.backBtn')}
              </button>
            </div>
          </div>
        )
      }
      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-md w-full border flex flex-col gap-6`}>
            <h3 className={`text-2xl font-bold ${textClass}`}>{t('edit.title')}</h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('edit.nameLabel')}</label>
                <input
                  type="text"
                  value={editTaskText}
                  onChange={(e) => setEditTaskText(e.target.value)}
                  maxLength={300}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('edit.dateLabel')}</label>
                  <input
                    type="date"
                    value={editTaskDate}
                    onChange={(e) => setEditTaskDate(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('edit.repeatLabel')}</label>
                  <select
                    value={editTaskRepeat}
                    onChange={(e) => setEditTaskRepeat(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none`}
                  >
                    <option value="none">{t('schedule.none')}</option>
                    <option value="daily">{t('schedule.daily')}</option>
                    <option value="weekly">{t('schedule.weekly')}</option>
                    <option value="monthly">{t('schedule.monthly')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingTask(null)}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition ${buttonSecondaryClass}`}
              >
                {t('edit.cancelBtn')}
              </button>
              <button
                onClick={saveEditTask}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold text-white transition ${buttonPrimaryClass}`}
              >
                {t('edit.saveBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-md w-full border`}>
            <h3 className={`text-2xl font-bold ${textClass} mb-4`}>{t('calendar.title')}</h3>
            <p className={`${textSecondaryClass} mb-4`}>{selectedTaskForCalendar?.text}</p>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>{t('calendar.dateLabel')}</label>
                <input
                  type="date"
                  value={calendarDate}
                  onChange={(e) => setCalendarDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${textClass} mb-2`}>{t('calendar.timeLabel')}</label>
                <input
                  type="time"
                  value={calendarTime}
                  onChange={(e) => setCalendarTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={addToGoogleCalendar}
                className={`flex-1 px-4 py-2 ${buttonPrimaryClass} text-white rounded-lg transition`}
              >
                {t('calendar.addBtn')}
              </button>
              <button
                onClick={() => setShowCalendarModal(false)}
                className={`flex-1 px-4 py-2 ${buttonSecondaryClass} rounded-lg transition`}
              >
                {t('calendar.cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Recurring Tasks */}
      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-sm w-full border text-center`}>
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center ${darkMode ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className={`text-xl font-bold ${textClass} mb-2`}>{t('menu.deleteConfirm.title')}</h3>
            <p className={`${textSecondaryClass} mb-6 text-sm`}>
              {t('menu.deleteConfirm.message')}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => deleteTask(taskToDelete.id, false)}
                className={`w-full py-3 rounded-xl font-bold ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'} transition`}
              >
                {t('menu.deleteConfirm.onlyThis')}
              </button>
              <button
                onClick={() => deleteTask(taskToDelete.id, true)}
                className="w-full py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white transition shadow-sm"
              >
                {t('menu.deleteConfirm.allOccurrences')}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setTaskToDelete(null); }}
                className={`w-full py-2 text-sm font-medium ${textSecondaryClass} hover:underline`}
              >
                {t('menu.deleteConfirm.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Mode View */}
      {focusMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl p-8 max-w-md w-full border`}>
            <div className="text-center">
              <div className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center ${isBreak ? 'bg-emerald-900/50' : 'bg-blue-900/50'}`}>
                {isBreak ? (
                  <Coffee className="w-16 h-16 text-emerald-400" />
                ) : (
                  <Zap className="w-16 h-16 text-blue-400" />
                )}
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${textClass}`}>
                {isBreak ? t('focus.distractions.breakTitle') : t('focus.distractions.activeTitle')}
              </h2>
              <p className={`${textSecondaryClass} mb-6`}>
                {isBreak ? t('focus.distractions.breakSubtitle') : t('focus.distractions.activeSubtitle')}
              </p>
              <div className="text-6xl font-bold text-blue-400 mb-8 font-mono">
                {formatTime(focusSeconds)}
              </div>
              {!isBreak && (
                <button
                  onClick={reportDistraction}
                  className="mb-4 px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition w-full font-bold"
                >
                  {t('focus.distractions.reportBtn')}
                </button>
              )}
              <button
                onClick={stopFocusMode}
                className={`px-6 py-3 ${buttonSecondaryClass} rounded-xl transition w-full font-bold`}
              >
                {t('focus.distractions.stopBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

