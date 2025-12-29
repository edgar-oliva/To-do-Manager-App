import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Trash2, CheckCircle, Circle, Timer, Calendar, Coffee, Zap, Shield, Sun, Moon, AlertCircle, ArrowUp, Minus, Edit2, Languages } from 'lucide-react';

export default function App() {
  const { t, i18n } = useTranslation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState('media');
  const [estimatedTime, setEstimatedTime] = useState('30');
  const [timeUnit, setTimeUnit] = useState('min');
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [view, setView] = useState('tareas');
  const [focusMode, setFocusMode] = useState(false);
  const [focusType, setFocusType] = useState('pomodoro');
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedTaskForCalendar, setSelectedTaskForCalendar] = useState<any>(null);
  const [calendarDate, setCalendarDate] = useState('');
  const [calendarTime, setCalendarTime] = useState('');
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('media');
  const [editTaskTime, setEditTaskTime] = useState('30');
  const [editTaskTimeUnit, setEditTaskTimeUnit] = useState('min');

  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().slice(0, 5);
    setCalendarDate(dateStr);
    setCalendarTime(timeStr);
  }, []);

  useEffect(() => {
    let interval: any;
    if (activeTimer !== null) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
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

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

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

  const addTask = () => {
    if (newTask.trim()) {
      const timeInMinutes = timeUnit === 'hrs' ? parseInt(estimatedTime) * 60 : parseInt(estimatedTime);
      setTasks([...tasks, {
        id: Date.now(),
        text: newTask,
        priority,
        estimatedTime: timeInMinutes,
        completed: false,
        timeSpent: 0
      }]);
      setNewTask('');
      setEstimatedTime('30');
      setTimeUnit('min');
    }
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    if (activeTimer === id) stopTimer();
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
    if (activeTimer === id) stopTimer();
  };

  const startTimer = (id: number) => {
    setActiveTimer(id);
    setTimerSeconds(0);
  };

  const stopTimer = () => {
    if (activeTimer !== null) {
      setTasks(tasks.map(task =>
        task.id === activeTimer
          ? { ...task, timeSpent: task.timeSpent + timerSeconds }
          : task
      ));
    }
    setActiveTimer(null);
    setTimerSeconds(0);
  };

  const reportDistraction = () => {
    setDistractionCount(prev => prev + 1);
  };

  const openCalendarModal = (task: any) => {
    setSelectedTaskForCalendar(task);
    setShowCalendarModal(true);
  };

  const openEditModal = (task: any) => {
    setEditingTask(task);
    setEditTaskText(task.text);
    setEditTaskPriority(task.priority);

    if (task.estimatedTime >= 60 && task.estimatedTime % 60 === 0) {
      setEditTaskTime(String(task.estimatedTime / 60));
      setEditTaskTimeUnit('hrs');
    } else {
      setEditTaskTime(String(task.estimatedTime));
      setEditTaskTimeUnit('min');
    }
  };

  const saveEditTask = () => {
    if (!editingTask || !editTaskText.trim()) return;

    const timeInMinutes = editTaskTimeUnit === 'hrs' ? parseInt(editTaskTime) * 60 : parseInt(editTaskTime);

    setTasks(tasks.map(task =>
      task.id === editingTask.id
        ? { ...task, text: editTaskText, priority: editTaskPriority, estimatedTime: timeInMinutes }
        : task
    ));

    setEditingTask(null);
    setEditTaskText('');
    setEditTaskPriority('media');
    setEditTaskTime('30');
    setEditTaskTimeUnit('min');
  };

  const addToGoogleCalendar = () => {
    if (!selectedTaskForCalendar) return;

    const startDateTime = new Date(`${calendarDate}T${calendarTime}`);
    const endDateTime = new Date(startDateTime.getTime() + selectedTaskForCalendar.estimatedTime * 60000);

    const formatDateTime = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const eventDetails = {
      text: selectedTaskForCalendar.text,
      dates: `${formatDateTime(startDateTime)}/${formatDateTime(endDateTime)}`,
      details: `Prioridad: ${selectedTaskForCalendar.priority}\nTiempo estimado: ${Math.floor(selectedTaskForCalendar.estimatedTime / 60)}h ${selectedTaskForCalendar.estimatedTime % 60}min`,
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.text)}&dates=${eventDetails.dates}&details=${encodeURIComponent(eventDetails.details)}`;

    window.open(googleCalendarUrl, '_blank');
    setShowCalendarModal(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatEstimatedTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  const getPriorityIcon = (p: string) => {
    if (p === 'alta') return <ArrowUp className="w-5 h-5" />;
    if (p === 'media') return <Minus className="w-5 h-5" />;
    return <AlertCircle className="w-5 h-5" />;
  };

  const getPriorityColor = (p: string) => {
    if (darkMode) {
      return p === 'alta' ? 'border-red-500 bg-red-950 bg-opacity-30' :
        p === 'media' ? 'border-blue-500 bg-blue-950 bg-opacity-30' :
          'border-slate-500 bg-slate-800 bg-opacity-30';
    } else {
      return p === 'alta' ? 'border-red-300 bg-red-50' :
        p === 'media' ? 'border-blue-300 bg-blue-50' :
          'border-slate-300 bg-slate-50';
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder: any = { alta: 0, media: 1, baja: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const totalTimeSpent = tasks.reduce((sum, task) => sum + task.timeSpent, 0);
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
        {editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-md w-full border`}>
              <h3 className={`text-2xl font-bold ${textClass} mb-4`}>{t('edit.title')}</h3>

              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>{t('edit.nameLabel')}</label>
                  <input
                    type="text"
                    value={editTaskText}
                    onChange={(e) => setEditTaskText(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>{t('edit.priorityLabel')}</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                  >
                    <option value="alta">{t('tasks.priority.high')}</option>
                    <option value="media">{t('tasks.priority.medium')}</option>
                    <option value="baja">{t('tasks.priority.low')}</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textClass} mb-2`}>{t('edit.timeLabel')}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={editTaskTime}
                      onChange={(e) => setEditTaskTime(e.target.value)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                    />
                    <select
                      value={editTaskTimeUnit}
                      onChange={(e) => setEditTaskTimeUnit(e.target.value)}
                      className={`px-3 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                    >
                      <option value="min">min</option>
                      <option value="hrs">hrs</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveEditTask}
                  className={`flex-1 px-4 py-2 ${buttonPrimaryClass} text-white rounded-lg transition`}
                >
                  {t('edit.saveBtn')}
                </button>
                <button
                  onClick={() => setEditingTask(null)}
                  className={`flex-1 px-4 py-2 ${buttonSecondaryClass} rounded-lg transition`}
                >
                  {t('edit.cancelBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCalendarModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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

        {focusMode && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className={`${cardClass} rounded-2xl shadow-2xl p-8 max-w-md w-full border`}>
              <div className="text-center">
                <div className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center ${isBreak ? 'bg-emerald-900 bg-opacity-50' : 'bg-blue-900 bg-opacity-50'
                  }`}>
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
                <div className="text-6xl font-bold text-blue-400 mb-8">
                  {formatTime(focusSeconds)}
                </div>
                {!isBreak && (
                  <button
                    onClick={reportDistraction}
                    className="mb-4 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition w-full"
                  >
                    {t('focus.distractions.reportBtn')}
                  </button>
                )}
                <button
                  onClick={stopFocusMode}
                  className={`px-6 py-3 ${buttonSecondaryClass} rounded-lg transition w-full`}
                >
                  {t('focus.distractions.stopBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`${cardClass} rounded-2xl shadow-xl p-6 mb-6 border`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Clock className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h1 className={`text-3xl font-bold ${textClass}`}>{t('appTitle')}</h1>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={toggleLanguage}
                className={`p-2 rounded-lg ${buttonSecondaryClass} transition`}
                title={i18n.language === 'en' ? 'Español' : 'English'}
              >
                <Languages className="w-5 h-5" />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${buttonSecondaryClass} transition`}
                title={darkMode ? t('modes.light') : t('modes.dark')}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
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
              <button
                onClick={() => setView('estadisticas')}
                className={`px-4 py-2 rounded-lg transition ${view === 'estadisticas' ? `${buttonPrimaryClass} text-white` : buttonSecondaryClass}`}
              >
                {t('modes.stats')}
              </button>
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
              <div className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-4 mb-6 border`}>
                <div className="grid gap-3">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTask()}
                    placeholder={t('tasks.placeholder')}
                    className={`w-full px-4 py-3 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                  />
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className={`px-4 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                    >
                      <option value="alta">{t('tasks.priority.high')}</option>
                      <option value="media">{t('tasks.priority.medium')}</option>
                      <option value="baja">{t('tasks.priority.low')}</option>
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        placeholder={t('tasks.timePlaceholder')}
                        className={`w-24 px-4 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                      />
                      <select
                        value={timeUnit}
                        onChange={(e) => setTimeUnit(e.target.value)}
                        className={`px-3 py-2 rounded-lg border-2 ${inputClass} focus:border-blue-500 outline-none`}
                      >
                        <option value="min">min</option>
                        <option value="hrs">hrs</option>
                      </select>
                    </div>
                    <button
                      onClick={addTask}
                      className={`flex items-center gap-2 px-6 py-2 ${buttonPrimaryClass} text-white rounded-lg transition`}
                    >
                      <Plus className="w-5 h-5" />
                      {t('tasks.addBtn')}
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
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition ${task.completed ? `${darkMode ? 'bg-slate-700 opacity-60' : 'bg-slate-100 opacity-60'}` : ''
                        } ${getPriorityColor(task.priority)}`}
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

                      <div className={`flex-shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {getPriorityIcon(task.priority)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.completed ? `line-through ${textSecondaryClass}` : textClass}`}>
                          {task.text}
                        </p>
                        <div className={`flex gap-3 mt-1 text-sm ${textSecondaryClass}`}>
                          <span>⏱️ {formatEstimatedTime(task.estimatedTime)}</span>
                          {task.timeSpent > 0 && (
                            <span>✓ {formatTime(task.timeSpent)} {t('tasks.worked')}</span>
                          )}
                        </div>
                      </div>

                      {!task.completed && (
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
                          <button
                            onClick={() => activeTimer === task.id ? stopTimer() : startTimer(task.id)}
                            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${activeTimer === task.id
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : `${buttonPrimaryClass} text-white`
                              }`}
                          >
                            <Timer className="w-4 h-4" />
                            {activeTimer === task.id ? formatTime(timerSeconds) : t('tasks.startBtn')}
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => deleteTask(task.id)}
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
                <div className={`${darkMode ? 'bg-gradient-to-br from-emerald-700 to-emerald-800 border-emerald-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400'} rounded-xl p-6 text-white border`}>
                  <p className="text-sm opacity-90 mb-1">{t('stats.completed')}</p>
                  <p className="text-4xl font-bold">{completedTasks}</p>
                </div>
                <div className={`${darkMode ? 'bg-gradient-to-br from-blue-700 to-indigo-800 border-blue-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400'} rounded-xl p-6 text-white border`}>
                  <p className="text-sm opacity-90 mb-1">{t('stats.totalTime')}</p>
                  <p className="text-4xl font-bold">{formatTime(totalTimeSpent)}</p>
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

        <div className={`text-center ${textSecondaryClass} text-sm`}>
          💡 {darkMode ? t('footer.dark') : t('footer.light')}
        </div>
      </div>
    </div>
  );
}
