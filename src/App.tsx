import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, CheckCircle, Circle, Calendar, Sun, Moon, ArrowUp, Edit2, MoreVertical, RotateCcw, Check, CheckCheck, SquareArrowRight } from 'lucide-react';

interface Task {
  id: number;
  text: string;
  completed: boolean;
  dueDate: string;
  repeat: string;
}

interface HistoryEntry extends Task {
  completedAt: string;
  historyId: number;
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
  const [darkMode, setDarkMode] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedTaskForCalendar, setSelectedTaskForCalendar] = useState<Task | null>(null);
  const [calendarDate, setCalendarDate] = useState('');
  const [calendarTime, setCalendarTime] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTaskRepeat, setEditTaskRepeat] = useState('none');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

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
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = today.toTimeString().slice(0, 5);
    setCalendarDate(dateStr);
    setCalendarTime(timeStr);
  }, []);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    setScheduleTaskDate(`${year}-${month}-${day}`);
  }, []);




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

  const getLocalDateStr = (daysToAdd = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNextDate = (currentDate: string, repeat: string) => {
    const date = new Date(currentDate + 'T12:00:00'); // Midday to avoid DST issues
    if (repeat === 'daily') date.setDate(date.getDate() + 1);
    else if (repeat === 'weekly') date.setDate(date.getDate() + 7);
    else if (repeat === 'monthly') date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  const toggleTask = (id: number, isHistory = false) => {
    if (isHistory) {
      const historyEntry = completedHistory.find(h => h.historyId === id);
      if (!historyEntry) return;

      // Handle un-completing (moving back from history to pending)
      const restoredTask: Task = {
        id: historyEntry.id,
        text: historyEntry.text,
        completed: false,
        dueDate: historyEntry.dueDate,
        repeat: historyEntry.repeat
      };

      if (historyEntry.repeat !== 'none') {
        // Find if there's already a future instance (bumping)
        // For repeating tasks, completion bumps the date. Un-completing restores the date to the history instance's dueDate.
        setTasks(prev => prev.map(t => t.id === historyEntry.id ? restoredTask : t));
      } else {
        setTasks(prev => [...prev, restoredTask]);
      }
      setCompletedHistory(prev => prev.filter(h => h.historyId !== id));
      return;
    }

    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (!task.completed) {
      // Mark as completed and handle history/repeat
      const historyEntry: HistoryEntry = {
        ...task,
        completed: true,
        completedAt: getLocalDateStr(), // Use local date string instead of UTC ISO
        historyId: Date.now()
      };
      setCompletedHistory([historyEntry, ...completedHistory]);

      if (task.repeat !== 'none') {
        setTasks(tasks.map(t =>
          t.id === id ? { ...t, dueDate: getNextDate(t.dueDate, t.repeat), completed: false } : t
        ));
      } else {
        setTasks(tasks.filter(t => t.id !== id));
      }
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




  const todayStr = getLocalDateStr();

  // 1. Get recurring/scheduled tasks for the selected date PLUS past pending tasks if today
  const baseTasks = tasks.filter(task => {
    if (selectedDate === todayStr) {
      return task.dueDate === selectedDate || (task.dueDate < todayStr && !task.completed);
    }
    return task.dueDate === selectedDate;
  });

  // 2. Get history entries completed today locally
  const historyCompletedToday = completedHistory
    .filter(h => h.completedAt === todayStr)
    .map(h => ({ ...h, id: h.historyId, isFromHistory: true }));

  // 3. Combine them for the current view
  const combinedTasks = selectedDate === todayStr
    ? [...baseTasks, ...historyCompletedToday]
    : baseTasks;

  // 4. Final Sort: 
  //   - Pending Overdue (earliest first)
  //   - Pending Today
  //   - Completed Today (latest first)
  const sortedTasks = [...combinedTasks].sort((a, b) => {
    const aComp = (a as any).completed;
    const bComp = (b as any).completed;

    // Put pending first
    if (aComp !== bComp) return aComp ? 1 : -1;

    // Both pending: prioritize overdue (earlier dates first)
    if (!aComp) {
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.id - a.id; // Secondary: newest first
    }

    // Both completed: newest completion first
    return b.id - a.id;
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
                onClick={() => setView('history')}
                className={`px-4 py-2 rounded-lg transition ${view === 'history' ? `${buttonPrimaryClass} text-white` : buttonSecondaryClass}`}
              >
                {t('menu.history') || 'Completed Tasks'}
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
                      <button onClick={() => { setView('history'); setIsMenuOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${darkMode ? "hover:bg-slate-700" : "hover:bg-slate-100"} ${textClass}`}>
                        <RotateCcw className="w-4 h-4" />
                        {t("menu.history") || "Completed Tasks"}
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

          {view === 'history' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-2">
                <RotateCcw className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <h2 className={`text-2xl font-bold ${textClass}`}>{t('menu.history') || 'Completed Tasks'}</h2>
              </div>

              {completedHistory.length === 0 ? (
                <div className={`text-center py-20 ${cardClass} rounded-2xl border-2 border-dashed`}>
                  <p className={textSecondaryClass}>{t('history.empty') || 'No completed tasks yet.'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(
                    completedHistory.reduce((groups: any, task) => {
                      const date = task.completedAt.split('T')[0];
                      if (!groups[date]) groups[date] = [];
                      groups[date].push(task);
                      return groups;
                    }, {})
                  )
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([date, dailyTasks]: [string, any]) => (
                      <div key={date} className="space-y-2">
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${textSecondaryClass} px-1 mt-4`}>
                          {date === todayStr ? 'Today' : date}
                        </h3>
                        {dailyTasks.map((task: any) => (
                          <div
                            key={task.historyId}
                            className={`${cardClass} p-4 rounded-xl border-2 flex items-center justify-between group`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                              <span className={`font-medium ${textClass} truncate line-through opacity-70`}>
                                {task.text}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleTask(task.historyId, true)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg ${darkMode ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' : 'bg-slate-100 text-blue-600 hover:bg-slate-200'} transition opacity-0 group-hover:opacity-100`}
                            >
                              Undo
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
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
                  onClick={() => {
                    const d = new Date();
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setSelectedDate(`${year}-${month}-${day}`);
                  }}
                  className={`h-[46px] px-5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center ${selectedDate === (() => {
                    const d = new Date();
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()
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
                      onClick={() => {
                        setScheduleTaskDate('');
                        setRepeatRule('none');
                        setShowScheduleModal(true);
                      }}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'} rounded-xl transition-all shadow-sm font-bold hover:scale-[1.02] active:scale-95`}
                    >
                      <Calendar className="w-5 h-5" />
                      {t('tasks.scheduleBtn')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Active Tasks Section */}
                <div className="space-y-3">
                  {sortedTasks.filter(t => !t.completed).length === 0 && selectedDate === todayStr ? (
                    <div className={`text-center py-8 ${textSecondaryClass}`}>
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                      <p className="font-medium">All active tasks completed!</p>
                    </div>
                  ) : sortedTasks.filter(t => !t.completed).map(task => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${darkMode ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-300 hover:border-slate-400'}`}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="flex-shrink-0 transition-transform active:scale-125 hover:scale-110"
                      >
                        <Circle className={`w-6 h-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${textClass}`}>{task.text}</p>
                          {task.dueDate < todayStr && !task.completed && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${darkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}
                              title={`Scheduled for ${task.dueDate}`}
                            >
                              Due
                            </span>
                          )}
                        </div>
                        {task.repeat !== 'none' && (
                          <div className="flex gap-3 mt-1 text-xs font-medium">
                            <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded text-blue-500">
                              <RotateCcw size={10} /> {task.repeat}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(task)}
                          className={`p-2 ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-blue-400' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'} rounded-lg transition-colors`}
                          title={t('tasks.editTooltip')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openCalendarModal(task)}
                          className={`p-2 ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-emerald-400' : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-600'} rounded-lg transition-colors`}
                          title={t('tasks.calendarTooltip')}
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(task)}
                          className={`p-2 ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-red-400' : 'text-slate-600 hover:bg-slate-100 hover:text-red-600'} rounded-lg transition-colors`}
                          title={t('tasks.deleteTooltip')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Completed Today Section */}
                {sortedTasks.filter(t => t.completed).length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-700/30">
                    <div className="flex items-center gap-2 px-1">
                      <CheckCheck className={`w-4 h-4 ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600/70'}`} />
                      <h3 className={`text-sm font-bold uppercase tracking-widest ${textSecondaryClass} opacity-80`}>
                        TASKS COMPLETED TODAY
                      </h3>
                      <div className={`h-px flex-1 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'} ml-2`}></div>
                    </div>
                    <div className="space-y-3">
                      {sortedTasks.filter(t => t.completed).map(task => (
                        <div
                          key={task.id}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${darkMode ? 'bg-slate-700/40 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-100 opacity-60'} animate-in fade-in zoom-in-95`}
                        >
                          <button
                            onClick={() => toggleTask(task.id, (task as any).isFromHistory)}
                            className="flex-shrink-0 transition-transform active:scale-75 hover:scale-110"
                          >
                            <CheckCircle className={`w-6 h-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`font-medium line-through ${textSecondaryClass}`}>
                              {task.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
          Created by Edgar Martínez Oliva • v1.8.4
        </div>
      </div >

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${cardClass} w-full max-w-md rounded-3xl p-6 shadow-2xl border flex flex-col gap-6`}>
            {/* Modal Header */}
            <div className="flex justify-between items-center px-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className={`text-lg font-medium ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} transition`}
              >
                Cancel
              </button>
              <h3 className={`text-xl font-bold ${textClass}`}>Date</h3>
              <button
                onClick={() => addTask(true)}
                className={`text-lg font-bold ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'} transition`}
              >
                Done
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'} rounded-2xl p-4 grid grid-cols-3 gap-2 border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
              <button
                onClick={() => setScheduleTaskDate(getLocalDateStr(1))}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all ${scheduleTaskDate === getLocalDateStr(1) ? (darkMode ? 'bg-slate-700 ring-2 ring-blue-500' : 'bg-white shadow-md ring-2 ring-blue-500') : (darkMode ? 'hover:bg-slate-800' : 'hover:bg-white/50')}`}
              >
                <Sun className={`w-7 h-7 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`} />
                <span className={`text-xs font-semibold ${textSecondaryClass}`}>Tomorrow</span>
              </button>
              <button
                onClick={() => setScheduleTaskDate(getLocalDateStr(7))}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all ${scheduleTaskDate === getLocalDateStr(7) ? (darkMode ? 'bg-slate-700 ring-2 ring-blue-500' : 'bg-white shadow-md ring-2 ring-blue-500') : (darkMode ? 'hover:bg-slate-800' : 'hover:bg-white/50')}`}
              >
                <SquareArrowRight className={`w-7 h-7 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`} />
                <span className={`text-xs font-semibold ${textSecondaryClass}`}>Next Week</span>
              </button>
              <button
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-white/50'}`}
                onClick={() => {
                  const input = document.getElementById('schedule-date-input') as any;
                  if (input) {
                    if (typeof input.showPicker === 'function') {
                      input.showPicker();
                    } else {
                      input.focus();
                    }
                  }
                }}
              >
                <Calendar className={`w-7 h-7 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`} />
                <span className={`text-xs font-semibold ${textSecondaryClass}`}>Pick Date</span>
              </button>
            </div>

            {/* Form Details */}
            <div className="space-y-4">
              <div className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'} rounded-2xl p-4 space-y-3 border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className={textSecondaryClass} />
                    <span className={`text-sm font-semibold ${textClass}`}>Date</span>
                  </div>
                  <input
                    id="schedule-date-input"
                    type="date"
                    value={scheduleTaskDate}
                    onChange={(e) => setScheduleTaskDate(e.target.value)}
                    className={`px-3 py-1 rounded-lg text-sm font-bold ${darkMode ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800 shadow-sm'} outline-none focus:ring-2 ring-blue-500 border-none`}
                  />
                </div>
              </div>

              <div className={`${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'} rounded-2xl p-4 space-y-3 border ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RotateCcw size={18} className={textSecondaryClass} />
                    <span className={`text-sm font-semibold ${textClass}`}>Repeat</span>
                  </div>
                  <select
                    value={repeatRule}
                    onChange={(e) => setRepeatRule(e.target.value)}
                    className={`px-3 py-1 rounded-lg text-sm font-bold ${darkMode ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800 shadow-sm'} outline-none focus:ring-2 ring-blue-500 border-none appearance-none cursor-pointer`}
                  >
                    <option value="none">{t('schedule.none')}</option>
                    <option value="daily">{t('schedule.daily')}</option>
                    <option value="weekly">{t('schedule.weekly')}</option>
                    <option value="monthly">{t('schedule.monthly')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-md w-full border flex flex-col gap-6 animate-in zoom-in-95 duration-200`}>
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
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-md w-full border animate-in zoom-in-95 duration-200`}>
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
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-sm w-full border text-center animate-in zoom-in-95 duration-200`}>
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
    </div>

  );
}

