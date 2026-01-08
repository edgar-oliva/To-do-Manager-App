import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, CheckCircle, Circle, Calendar, Sun, Moon, Edit2, MoreVertical, RotateCcw, Check, Eye, BadgeCheck, ArrowRight } from 'lucide-react';

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
          // Backward compatibility: if it was a boolean, map it
          if (typeof savedDarkMode === 'boolean') {
            setTheme(savedDarkMode ? 'dark' : 'light');
          } else {
            setTheme(savedDarkMode as any);
          }
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
  const scheduleDateInputRef = useRef<HTMLInputElement>(null);
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
  const [showUpcomingView, setShowUpcomingView] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'night'>('light');
  const darkMode = theme === 'dark' || theme === 'night';
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

  // Helper functions for quick date selection
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getNextWeekDate = () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const year = nextWeek.getFullYear();
    const month = String(nextWeek.getMonth() + 1).padStart(2, '0');
    const day = String(nextWeek.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const setTomorrow = () => {
    setScheduleTaskDate(getTomorrowDate());
  };

  const setNextWeek = () => {
    setScheduleTaskDate(getNextWeekDate());
  };



  const isTomorrow = (date: string) => date === getTomorrowDate();
  const isNextWeek = (date: string) => date === getNextWeekDate();
  const isCustomDate = (date: string) => date && !isTomorrow(date) && !isNextWeek(date);




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

  // Check if a selected date matches a recurring task's schedule
  // For recurring tasks, we check if the selected date is a valid occurrence based on the pattern
  const isDateInRecurringSchedule = (taskDueDate: string, selectedDate: string, repeat: string): boolean => {
    if (repeat === 'none') return false;

    const taskDate = new Date(taskDueDate + 'T12:00:00');
    const checkDate = new Date(selectedDate + 'T12:00:00');

    // Selected date must be on or after the task's due date
    if (checkDate < taskDate) return false;

    if (repeat === 'daily') {
      // For daily, any date on or after the due date is valid
      return true;
    } else if (repeat === 'weekly') {
      // For weekly, check if the selected date is exactly 7 days apart from the due date
      const daysDiff = Math.floor((checkDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff >= 0 && daysDiff % 7 === 0;
    } else if (repeat === 'monthly') {
      // For monthly, check if it's the same day of the month and on or after the due date
      if (checkDate.getDate() !== taskDate.getDate()) return false;

      // Check if selected date is in the same or a future month/year
      const monthsDiff = (checkDate.getFullYear() - taskDate.getFullYear()) * 12 +
        (checkDate.getMonth() - taskDate.getMonth());
      return monthsDiff >= 0;
    }

    return false;
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

  // Get all dates for the next 7 days (including today)
  const getNext7Days = () => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(getLocalDateStr(i));
    }
    return dates;
  };

  // Get upcoming tasks for the next 7 days
  const getUpcomingTasks = () => {
    const next7Days = getNext7Days();
    const upcomingTasks: (Task & { displayDate?: string; isDailyRecurring?: boolean })[] = [];
    const dailyRecurringTasks = new Map<number, Task>(); // Track daily recurring tasks to show only once

    tasks.forEach(task => {
      if (task.completed) return; // Only show pending tasks

      // Include overdue tasks
      if (task.dueDate < todayStr) {
        upcomingTasks.push({ ...task, displayDate: task.dueDate });
        return;
      }

      // Check if task falls within next 7 days
      if (next7Days.includes(task.dueDate)) {
        // For daily recurring tasks, only add once
        if (task.repeat === 'daily') {
          if (!dailyRecurringTasks.has(task.id)) {
            dailyRecurringTasks.set(task.id, task);
            upcomingTasks.push({ ...task, displayDate: task.dueDate, isDailyRecurring: true });
          }
        } else {
          upcomingTasks.push({ ...task, displayDate: task.dueDate });
        }
      }

      // Check recurring tasks
      if (task.repeat !== 'none') {
        next7Days.forEach(date => {
          if (isDateInRecurringSchedule(task.dueDate, date, task.repeat)) {
            // For daily recurring tasks, we already handled them above
            if (task.repeat === 'daily') {
              return;
            }
            // For weekly/monthly, add if not already added for this date
            const alreadyAdded = upcomingTasks.some(t => t.id === task.id && t.displayDate === date);
            if (!alreadyAdded) {
              upcomingTasks.push({ ...task, displayDate: date });
            }
          }
        });
      }
    });

    // Sort by date, then by id
    return upcomingTasks.sort((a, b) => {
      const dateCompare = (a.displayDate || a.dueDate).localeCompare(b.displayDate || b.dueDate);
      if (dateCompare !== 0) return dateCompare;
      return b.id - a.id;
    });
  };

  // 1. Get recurring/scheduled tasks for the selected date PLUS past pending tasks if today
  const baseTasks = tasks.filter(task => {
    // Check if it's an exact date match
    if (task.dueDate === selectedDate) return true;

    // Check if it's a recurring task that matches the selected date
    if (task.repeat !== 'none' && isDateInRecurringSchedule(task.dueDate, selectedDate, task.repeat)) {
      return true;
    }

    // For today's view, also show overdue tasks
    if (selectedDate === todayStr && task.dueDate < todayStr && !task.completed) {
      return true;
    }

    return false;
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

  const bgClass = theme === 'night' ? 'bg-[#1a1614]' : (darkMode ? 'bg-black' : 'bg-zinc-50');
  const cardClass = theme === 'night' ? 'bg-[#251e1a] border-[#382b24] text-[#fdf5e6]' : (darkMode ? 'bg-[#0A0A0A] border-zinc-900' : 'bg-white border-zinc-200 text-black');
  const textClass = theme === 'night' ? 'text-[#fdf5e6]' : (darkMode ? 'text-white' : 'text-black');
  const textSecondaryClass = theme === 'night' ? 'text-[#a18a7d]' : (darkMode ? 'text-zinc-500' : 'text-zinc-400');
  const inputClass = theme === 'night' ? 'bg-transparent border-[#4a3a30] text-[#fdf5e6] placeholder-[#5d4a40]' : (darkMode ? 'bg-transparent border-zinc-800 text-white placeholder-zinc-700' : 'bg-white border-zinc-200 text-black placeholder-zinc-400');

  const accentColor = theme === 'night' ? 'bg-[#FF7043] text-black shadow-[0_0_20px_rgba(255,112,67,0.15)]' : 'bg-gold-lime text-black shadow-[0_0_20px_rgba(255,215,0,0.15)]';
  const buttonPrimaryClass = `${accentColor} hover:opacity-90`;
  const buttonSecondaryClass = theme === 'night' ? 'bg-[#251e1a] border border-[#382b24] text-[#fdf5e6] hover:border-[#5d4a40]' : (darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700' : 'bg-white border border-zinc-200 text-zinc-800');
  const iconStrokeWidth = 2.5;

  return (
    <>
      <div className={`min-h-screen ${bgClass} p-4 transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto">

          <div className={`${cardClass} rounded-2xl shadow-xl p-6 mb-6 border`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 relative gap-4 md:gap-0">
              <div className="flex items-center gap-3">
                <h1 className={`text-4xl font-extrabold tracking-tight ${textClass}`}>{t('appTitle')}</h1>
              </div>
              <div className="flex gap-4 items-center">
                <div className="flex bg-zinc-900 p-1 rounded-full border border-zinc-800">
                  <button
                    onClick={() => setView('tareas')}
                    className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${view === 'tareas' ? `${accentColor} shadow-lg` : 'text-zinc-500 hover:text-white'}`}
                  >
                    {t('modes.tasks')}
                  </button>
                  <button
                    onClick={() => setView('history')}
                    className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${view === 'history' ? `${accentColor} shadow-lg` : 'text-zinc-500 hover:text-white'}`}
                  >
                    {t('menu.history') || 'History'}
                  </button>
                </div>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`p-3 rounded-full border transition-colors ${textClass} ${darkMode ? 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800' : 'border-zinc-200 bg-white hover:bg-zinc-50'}`}
                  >
                    <MoreVertical className="w-5 h-5" strokeWidth={iconStrokeWidth} />
                  </button>

                  {isMenuOpen && (
                    <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} z-50 overflow-hidden`}>
                      <div className="p-2 space-y-1">
                        {/* History */}
                        <button
                          onClick={() => { setView('history'); setIsMenuOpen(false); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${darkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50'} ${textClass}`}
                        >
                          <BadgeCheck className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                          {t('menu.history') || 'History'}
                        </button>

                        <h3 className={`text-sm font-bold opacity-70 mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          My Task Manager v1.8.9
                        </h3>
                        <div className={`h-px my-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}></div>

                        {/* Theme */}
                        <div className={`px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${textSecondaryClass} opacity-60`}>Theme</div>
                        <button
                          onClick={() => { setTheme('dark'); if (window.electronAPI) window.electronAPI.saveData('darkMode', 'dark'); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${theme === 'dark' ? (darkMode ? 'bg-zinc-900/60' : 'bg-zinc-100') : (darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50')} ${textClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <Moon className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                            <span>Dark</span>
                          </div>
                          {theme === 'dark' && <Check className="w-4 h-4 text-[#FFD700]" strokeWidth={iconStrokeWidth} />}
                        </button>
                        <button
                          onClick={() => { setTheme('light'); if (window.electronAPI) window.electronAPI.saveData('darkMode', 'light'); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${theme === 'light' ? (darkMode ? 'bg-zinc-900/60' : 'bg-zinc-100') : (darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50')} ${textClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <Sun className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                            <span>Light</span>
                          </div>
                          {theme === 'light' && <Check className="w-4 h-4 text-black" strokeWidth={iconStrokeWidth} />}
                        </button>
                        <button
                          onClick={() => { setTheme('night'); if (window.electronAPI) window.electronAPI.saveData('darkMode', 'night'); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${theme === 'night' ? (darkMode ? 'bg-zinc-900/60' : 'bg-zinc-100') : (darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50')} ${textClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <Eye className="w-4 h-4 text-[#FF5252]" strokeWidth={iconStrokeWidth} />
                            <span>Night Light</span>
                          </div>
                          {theme === 'night' && <Check className="w-4 h-4 text-[#FF5252]" strokeWidth={iconStrokeWidth} />}
                        </button>

                        <div className={`h-px my-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>

                        {/* Language */}
                        <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${textSecondaryClass} opacity-70`}>Language</div>
                        <button
                          onClick={() => changeLanguage('en')}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${darkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50'} ${textClass}`}
                        >
                          <span>English</span>
                          {i18n.language === 'en' && <Check className={`w-4 h-4 ${theme === 'night' ? 'text-[#FF7043]' : 'text-[#FFD700]'}`} strokeWidth={iconStrokeWidth} />}
                        </button>
                        <button
                          onClick={() => changeLanguage('es')}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} ${textClass}`}
                        >
                          <span>Español</span>
                          {i18n.language === 'es' && <Check className="w-4 h-4 text-blue-500" />}
                        </button>

                        <div className={`h-px my-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>

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
                  <BadgeCheck className={`w-6 h-6 ${theme === 'night' ? 'text-[#FF5252]' : (darkMode ? 'text-[#D9FF00]' : 'text-[#FFD700]')}`} strokeWidth={iconStrokeWidth} />
                  <h2 className={`text-2xl font-bold ${textClass}`}>Completed Tasks</h2>
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
                <div className="flex items-center gap-2 md:gap-3 mb-6 overflow-x-auto pb-4 pt-2 scrollbar-hide">
                  <div className="relative md:hidden">
                    <button
                      className={`p-3 rounded-xl border-2 ${inputClass} flex items-center justify-center transition-all shadow-sm active:scale-95`}
                    >
                      <Calendar className="w-5 h-5" strokeWidth={iconStrokeWidth} />
                    </button>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setShowUpcomingView(false);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 z-10"
                    />
                  </div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setShowUpcomingView(false);
                    }}
                    className={`hidden md:block px-4 py-2 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none transition-all shadow-sm`}
                  />
                  <button
                    onClick={() => {
                      const d = new Date();
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      setSelectedDate(`${year}-${month}-${day}`);
                      setShowUpcomingView(false);
                    }}
                    className={`h-[46px] px-3 md:px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center flex-1 md:flex-none ${!showUpcomingView && selectedDate === (() => {
                      const d = new Date();
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()
                      ? `${accentColor} shadow-lg`
                      : `${theme === 'night' ? 'bg-[#251e1a] text-[#a18a7d] border-[#382b24]' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'} hover:border-zinc-700 hover:text-white`
                      }`}
                  >
                    <span className="md:hidden">Today</span>
                    <span className="hidden md:inline">{t('calendar.todayTasks') || 'Today tasks'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUpcomingView(!showUpcomingView);
                    }}
                    className={`h-[46px] px-3 md:px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center flex-1 md:flex-none ${showUpcomingView
                      ? `${accentColor} shadow-lg`
                      : `${theme === 'night' ? 'bg-[#251e1a] text-[#a18a7d] border-[#382b24]' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'} hover:border-zinc-700 hover:text-white`
                      }`}
                  >
                    <span className="md:hidden">Upcoming</span>
                    <span className="hidden md:inline">{t('calendar.upcomingTasks') || 'Upcoming tasks'}</span>
                  </button>
                </div>
                <div className={`${theme === 'night' ? 'bg-[#251e1a] border-[#382b24]' : (darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200')} border rounded-2xl p-6 mb-8 shadow-sm transition-all`}>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTask(false)}
                      maxLength={300}
                      placeholder={t('tasks.placeholder')}
                      className={`w-full px-5 py-4 rounded-2xl border ${inputClass} ${theme === 'night' ? 'focus:border-[#FF7043]' : (darkMode ? 'focus:border-[#D9FF00]' : 'focus:border-black')} outline-none transition-all font-medium`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => addTask(false)}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 ${buttonPrimaryClass} rounded-full transition-all shadow-lg font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95`}
                      >
                        <Plus className="w-5 h-5" strokeWidth={iconStrokeWidth} />
                        {t('tasks.addBtn')}
                      </button>
                      <button
                        onClick={() => {
                          setScheduleTaskDate('');
                          setRepeatRule('none');
                          setShowScheduleModal(true);
                        }}
                        className={`flex items-center justify-center gap-2 px-6 py-4 ${buttonSecondaryClass} rounded-full transition-all shadow-sm font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95`}
                      >
                        <Calendar className="w-5 h-5" strokeWidth={iconStrokeWidth} />
                        {t('tasks.scheduleBtn')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Active Tasks Section */}
                  <div className="space-y-3">
                    {showUpcomingView ? (
                      // Upcoming Tasks View (next 7 days)
                      (() => {
                        const upcomingTasks = getUpcomingTasks();
                        if (upcomingTasks.length === 0) {
                          return (
                            <div className={`text-center py-8 ${textSecondaryClass}`}>
                              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                              <p className="font-medium">No upcoming tasks in the next 7 days!</p>
                            </div>
                          );
                        }
                        return upcomingTasks.map((task: any) => (
                          <div
                            key={`${task.id}-${task.displayDate || task.dueDate}`}
                            className={`flex items-start gap-4 p-5 rounded-2xl border border-zinc-900 transition-all duration-300 ${darkMode ? 'bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-800' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
                          >
                            <button
                              onClick={() => toggleTask(task.id)}
                              className="flex-shrink-0 transition-transform active:scale-125 hover:scale-110 mt-0.25"
                            >
                              <Circle className={`w-6 h-6 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} strokeWidth={iconStrokeWidth} />
                            </button>

                            <div className="flex-1 min-w-0">
                              <p className={`font-medium ${textClass} break-words pr-2`}>{task.text}</p>

                              <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                                {task.displayDate && task.displayDate < todayStr && (
                                  <span
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0 ${darkMode ? 'bg-[#D9FF00]/10 text-[#D9FF00] border border-[#D9FF00]/20' : 'bg-black text-white'}`}
                                    title={`Scheduled for ${task.displayDate}`}
                                  >
                                    Due
                                  </span>
                                )}
                                {task.displayDate && task.displayDate >= todayStr && (
                                  <span
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
                                  >
                                    {task.displayDate === todayStr
                                      ? 'Today'
                                      : isTomorrow(task.displayDate)
                                        ? 'Tomorrow'
                                        : task.displayDate}
                                  </span>
                                )}

                                {(task.isDailyRecurring || task.repeat === 'weekly' || task.repeat === 'monthly') && (
                                  <>
                                    {task.isDailyRecurring && (
                                      <span
                                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20' : 'bg-yellow-100 text-yellow-800 border border-yellow-300'}`}
                                        title="Daily recurring task"
                                      >
                                        Daily
                                      </span>
                                    )}
                                    {task.repeat === 'weekly' && (
                                      <span
                                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-blue-100 text-blue-800 border border-blue-300'}`}
                                        title="Weekly recurring task"
                                      >
                                        Weekly
                                      </span>
                                    )}
                                    {task.repeat === 'monthly' && (
                                      <span
                                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-100 text-purple-800 border border-purple-300'}`}
                                        title="Monthly recurring task"
                                      >
                                        Monthly
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-1.5 mt-0.5">
                              <button
                                onClick={() => openEditModal(task)}
                                className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-[#D9FF00] hover:bg-zinc-800' : 'text-zinc-400 hover:text-black hover:bg-zinc-100'} rounded-full transition-all`}
                                title={t('tasks.editTooltip')}
                              >
                                <Edit2 className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                              </button>
                              <button
                                onClick={() => openCalendarModal(task)}
                                className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-[#D9FF00] hover:bg-zinc-800' : 'text-zinc-400 hover:text-black hover:bg-zinc-100'} rounded-full transition-all`}
                                title={t('tasks.calendarTooltip')}
                              >
                                <Calendar className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                              </button>
                              <button
                                onClick={() => confirmDelete(task)}
                                className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-rose-500 hover:bg-zinc-800' : 'text-zinc-400 hover:text-rose-600 hover:bg-zinc-100'} rounded-full transition-all`}
                                title={t('tasks.deleteTooltip')}
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                              </button>
                            </div>
                          </div>
                        ));
                      })()
                    ) : sortedTasks.filter(t => !t.completed).length === 0 && selectedDate === todayStr ? (
                      <div className={`text-center py-8 ${textSecondaryClass}`}>
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                        <p className="font-medium">All active tasks completed!</p>
                      </div>
                    ) : sortedTasks.filter(t => !t.completed).map(task => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-4 p-5 rounded-2xl border border-zinc-900 transition-all duration-300 ${darkMode ? 'bg-zinc-900/40 hover:bg-zinc-900 hover:border-zinc-800' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
                      >
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex-shrink-0 transition-transform active:scale-125 hover:scale-110"
                        >
                          <Circle className={`w-6 h-6 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} strokeWidth={iconStrokeWidth} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium ${textClass}`}>{task.text}</p>
                            {task.dueDate < todayStr && !task.completed && (
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'bg-[#D9FF00]/10 text-[#D9FF00] border border-[#D9FF00]/20' : 'bg-black text-white'}`}
                                title={`Scheduled for ${task.dueDate}`}
                              >
                                Due
                              </span>
                            )}
                            {task.dueDate === todayStr && (
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
                              >
                                Today
                              </span>
                            )}
                            {task.dueDate > todayStr && isTomorrow(task.dueDate) && (
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
                              >
                                Tomorrow
                              </span>
                            )}
                            {task.dueDate > todayStr && !isTomorrow(task.dueDate) && (
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}
                              >
                                {task.dueDate}
                              </span>
                            )}
                          </div>
                          {task.repeat !== 'none' && (
                            <div className="flex gap-3 mt-1.5 text-xs font-medium">
                              <span className="flex items-center gap-1.5 uppercase tracking-widest text-[9px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 border border-zinc-700/50">
                                <RotateCcw size={10} strokeWidth={iconStrokeWidth} /> {task.repeat}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openEditModal(task)}
                            className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-[#D9FF00] hover:bg-zinc-800' : 'text-zinc-400 hover:text-black hover:bg-zinc-100'} rounded-full transition-all`}
                            title={t('tasks.editTooltip')}
                          >
                            <Edit2 className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                          </button>
                          <button
                            onClick={() => openCalendarModal(task)}
                            className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-[#D9FF00] hover:bg-zinc-800' : 'text-zinc-400 hover:text-black hover:bg-zinc-100'} rounded-full transition-all`}
                            title={t('tasks.calendarTooltip')}
                          >
                            <Calendar className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                          </button>
                          <button
                            onClick={() => confirmDelete(task)}
                            className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-rose-500 hover:bg-zinc-800' : 'text-zinc-400 hover:text-rose-600 hover:bg-zinc-100'} rounded-full transition-all`}
                            title={t('tasks.deleteTooltip')}
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Completed Today Section */}
                  {sortedTasks.filter(t => t.completed).length > 0 && (
                    <div className="space-y-6 pt-8 border-t border-zinc-900">
                      <div className="flex items-center gap-3 px-1">
                        <BadgeCheck className={`w-5 h-5 ${theme === 'night' ? 'text-[#FF5252]' : (darkMode ? 'text-[#D9FF00]' : 'text-[#FFD700]')}`} strokeWidth={iconStrokeWidth} />
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${textSecondaryClass} opacity-60`}>
                          TASKS COMPLETED TODAY
                        </h3>
                        <div className={`h-px flex-1 ${darkMode ? 'bg-zinc-900' : 'bg-zinc-100'} ml-4`}></div>
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

            <div className={`text-center ${textSecondaryClass} text-sm mt-8 mb-2`}>
              {darkMode ? t('footer.dark') : t('footer.light')}
            </div>
            <div className={`text-center ${textSecondaryClass} text-xs font-semibold opacity-75`}>
              Created by Edgar Martínez Oliva • v1.8.8
            </div>
          </div>
        </div>
      </div>




      {/* Schedule Modal */}
      {
        showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`${cardClass} w-full max-w-lg p-8 rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-200`}>
              <div className="flex items-center justify-between mb-8">
                <h2 className={`text-3xl font-black ${textClass} tracking-tight`}>{t('schedule.title')}</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className={`p-2 rounded-full ${textSecondaryClass} hover:bg-zinc-800/50 transition-colors`}
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Quick Date Selection Buttons */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">{t('schedule.dateLabel')}</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={setTomorrow}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 transition-all ${scheduleTaskDate && isTomorrow(scheduleTaskDate)
                        ? `border-[#FFD700] bg-[#FFD700]/10 ${textClass}`
                        : `border-zinc-800 hover:border-zinc-700 ${textSecondaryClass}`
                        }`}
                    >
                      <Sun className="w-6 h-6" strokeWidth={2} />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('schedule.tomorrow')}</span>
                    </button>
                    <button
                      onClick={setNextWeek}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 transition-all ${scheduleTaskDate && isNextWeek(scheduleTaskDate)
                        ? `border-[#FFD700] bg-[#FFD700]/10 ${textClass}`
                        : `border-zinc-800 hover:border-zinc-700 ${textSecondaryClass}`
                        }`}
                    >
                      <ArrowRight className="w-6 h-6" strokeWidth={2} />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('schedule.nextWeek')}</span>
                    </button>
                    <div className="relative">
                      <button
                        className={`w-full h-full flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 transition-all ${isCustomDate(scheduleTaskDate)
                          ? `border-[#FFD700] bg-[#FFD700]/10 ${textClass}`
                          : `border-zinc-800 hover:border-zinc-700 ${textSecondaryClass}`
                          }`}
                      >
                        <Calendar className="w-6 h-6" strokeWidth={2} />
                        <span className="text-xs font-bold uppercase tracking-wider">{t('schedule.pickDate')}</span>
                      </button>
                      <input
                        type="date"
                        value={scheduleTaskDate}
                        onChange={(e) => setScheduleTaskDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            if ('showPicker' in e.currentTarget) {
                              (e.currentTarget as any).showPicker();
                            }
                          } catch (error) {
                            // Fallback not needed as the input is clickable
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Input */}
                <div className="space-y-3">
                  <input
                    ref={scheduleDateInputRef}
                    type="date"
                    value={scheduleTaskDate}
                    onChange={(e) => setScheduleTaskDate(e.target.value)}
                    className={`w-full px-4 py-5 rounded-2xl border-2 ${inputClass} focus:border-[#FFD700] outline-none transition-all font-bold text-lg max-w-[95%] mx-auto block box-border`}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">{t('schedule.repeatLabel')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setRepeatRule('none')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'none' ? `border-[#FFD700] bg-[#FFD700]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {t('schedule.none')}
                    </button>
                    <button
                      onClick={() => setRepeatRule('daily')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'daily' ? `border-[#FFD700] bg-[#FFD700]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {t('schedule.daily')}
                    </button>
                    <button
                      onClick={() => setRepeatRule('weekly')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'weekly' ? `border-[#FFD700] bg-[#FFD700]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {t('schedule.weekly')}
                    </button>
                    <button
                      onClick={() => setRepeatRule('monthly')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'monthly' ? `border-[#FFD700] bg-[#FFD700]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {t('schedule.monthly')}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (scheduleTaskDate) {
                    addTask(true);
                    setShowScheduleModal(false);
                  }
                }}
                disabled={!scheduleTaskDate}
                className={`w-full mt-10 py-5 rounded-full ${buttonPrimaryClass} font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale`}
              >
                <Check className="w-5 h-5" strokeWidth={iconStrokeWidth} />
                Confirm Schedule
              </button>
            </div>
          </div>
        )
      }

      {/* Edit Modal */}
      {
        editingTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-md w-full border flex flex-col gap-6 animate-in zoom-in-95 duration-200`}>
              <h3 className={`text-2xl font-bold ${textClass}`}>{t('edit.title')}</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-1">{t('edit.nameLabel')}</label>
                  <input
                    type="text"
                    value={editTaskText}
                    onChange={(e) => setEditTaskText(e.target.value)}
                    maxLength={300}
                    className={`w-full px-5 py-4 rounded-2xl border-2 ${inputClass} ${theme === 'night' ? 'focus:border-[#FF7043]' : (darkMode ? 'focus:border-[#D9FF00]' : 'focus:border-black')} outline-none transition-all font-medium`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('edit.dateLabel')}</label>
                    <input
                      type="date"
                      value={editTaskDate}
                      onChange={(e) => setEditTaskDate(e.target.value)}
                      className={`w-full max-w-full px-4 py-3 rounded-xl border-2 ${inputClass} focus:border-blue-500 outline-none`}
                    />
                  </div>
                  <div className="min-w-0">
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

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditingTask(null)}
                  className={`flex-1 px-6 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-white hover:border-zinc-700`}
                >
                  {t('edit.cancelBtn')}
                </button>
                <button
                  onClick={saveEditTask}
                  className={`flex-1 px-6 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all ${buttonPrimaryClass}`}
                >
                  {t('edit.saveBtn')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Calendar Modal */}
      {
        showCalendarModal && (
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

              <div className="flex gap-4 mt-8">
                <button
                  onClick={addToGoogleCalendar}
                  className={`flex-1 px-6 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all ${buttonPrimaryClass}`}
                >
                  {t('calendar.addBtn')}
                </button>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className={`flex-1 px-6 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-white hover:border-zinc-700`}
                >
                  {t('calendar.cancelBtn')}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal for Recurring Tasks */}
      {
        showDeleteModal && taskToDelete && (
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
                  onClick={() => taskToDelete && deleteTask(taskToDelete.id, false)}
                  className={`w-full py-4 rounded-full font-black uppercase tracking-widest text-xs border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all`}
                >
                  {t('menu.deleteConfirm.onlyThis')}
                </button>
                <button
                  onClick={() => taskToDelete && deleteTask(taskToDelete.id, true)}
                  className="w-full py-4 rounded-full font-black uppercase tracking-widest text-xs bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-900/10"
                >
                  {t('menu.deleteConfirm.allOccurrences')}
                </button>
                <button
                  onClick={() => { setShowDeleteModal(false); setTaskToDelete(null); }}
                  className={`w-full py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors`}
                >
                  {t('menu.deleteConfirm.cancel')}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </>
  );
}
