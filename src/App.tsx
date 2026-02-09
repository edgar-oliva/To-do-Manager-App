import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, CheckCircle, Circle, Calendar, Sun, Moon, MoreVertical, RotateCcw, Check, Eye, BadgeCheck, ArrowRight, LogOut, LogIn, Cloud, CloudCheck, CloudOff } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Auth } from './components/Auth';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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



export default function App() {
  const { t, i18n } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedHistory, setCompletedHistory] = useState<HistoryEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'syncing' | 'error'>('saved');
  const [tasksAddedCount, setTasksAddedCount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showDontAskInfo, setShowDontAskInfo] = useState(false);
  const [dontAskAgainChecked, setDontAskAgainChecked] = useState(false);
  const [nextPromptThreshold, setNextPromptThreshold] = useState(3);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession?.user) {
        setUser(currentSession.user);
        setIsGuest(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession?.user) {
        setUser(currentSession.user);
        setIsGuest(false);
      } else {
        setUser(null);
        setIsGuest(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Initial Data
  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Load basic settings (theme, lang) from Local Storage
      const savedDarkMode = localStorage.getItem('darkMode');
      const savedLang = localStorage.getItem('language');

      if (savedDarkMode) {
        try {
          const parsed = JSON.parse(savedDarkMode);
          if (typeof parsed === 'boolean') {
            setTheme(parsed ? 'dark' : 'light');
          } else {
            setTheme(parsed);
          }
        } catch (e) {
          console.error("Failed to parse dark mode setting", e);
        }
      }

      if (savedLang) {
        i18n.changeLanguage(savedLang);
      }

      // 2. Load Tasks and History
      let localTasks: Task[] = [];
      let localHistory: HistoryEntry[] = [];

      try {
        const tasksStr = localStorage.getItem('tasks');
        if (tasksStr) {
          const parsedTasks = JSON.parse(tasksStr);
          if (Array.isArray(parsedTasks)) {
            localTasks = parsedTasks.map((t: any) => ({ ...t, repeat: t.repeat || 'none' }));
          }
        }

        const historyStr = localStorage.getItem('completedHistory');
        if (historyStr) {
          const parsedHistory = JSON.parse(historyStr);
          if (Array.isArray(parsedHistory)) localHistory = parsedHistory;
        }

        const savedCount = localStorage.getItem('tasksAddedCount');
        if (savedCount) setTasksAddedCount(JSON.parse(savedCount));

        const savedThreshold = localStorage.getItem('nextPromptThreshold');
        if (savedThreshold) setNextPromptThreshold(JSON.parse(savedThreshold));
      } catch (e) {
        console.error("Failed to load local data", e);
      }

      if (user) {
        setSyncStatus('syncing');
        try {
          // Fetch cloud data
          const { data: cloudTasks, error: tasksError } = await supabase.from('tasks').select('*');
          if (tasksError) throw tasksError;

          const { data: cloudHistory, error: historyError } = await supabase.from('history').select('*');
          if (historyError) throw historyError;

          // Sync local to cloud if we have local tasks (useful for guest-to-login transition)
          // We only do this if it's the first sync or we explicitly have local-only data
          if (localTasks.length > 0) {
            const syncPromises = localTasks.map(async (task) => {
              // Check if this task already exists in cloud by comparing text and due_date 
              // (since guest IDs are temporary Date.now() values and won't match server IDs)
              const existsInTasks = cloudTasks?.some(ct =>
                (ct.id === task.id) ||
                (ct.text === task.text && ct.due_date === task.dueDate)
              );

              // Also check history to prevent re-inserting tasks completed on another device
              const existsInHistory = cloudHistory?.some(ch =>
                (ch.task_id === task.id) ||
                (ch.text === task.text && ch.due_date === task.dueDate)
              );

              if (!existsInTasks && !existsInHistory) {
                const { error: insertError } = await supabase.from('tasks').insert({
                  user_id: user.id,
                  text: task.text,
                  completed: task.completed,
                  due_date: task.dueDate,
                  repeat: task.repeat
                });
                if (insertError) console.error('Failed to sync task:', task, insertError);
              }
            });
            await Promise.all(syncPromises);
          }

          if (localHistory.length > 0) {
            const historySyncPromises = localHistory.map(async (hist) => {
              // Match by taskId and completedAt since historyId is local-only
              const exists = cloudHistory?.some(ch =>
                (ch.id === hist.historyId) ||
                (ch.task_id === hist.id && ch.completed_at === hist.completedAt)
              );

              if (!exists) {
                const { error: insertHistError } = await supabase.from('history').insert({
                  task_id: hist.id,
                  user_id: user.id,
                  text: hist.text,
                  completed_at: hist.completedAt,
                  due_date: hist.dueDate,
                  repeat: hist.repeat
                });
                if (insertHistError) console.error('Failed to sync history:', hist, insertHistError);
              }
            });
            await Promise.all(historySyncPromises);
          }

          // Reload from cloud to get the final authoritative list with correct IDs
          const { data: finalTasks, error: finalTasksError } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
          if (finalTasksError) throw finalTasksError;

          const { data: finalHistory, error: finalHistoryError } = await supabase.from('history').select('*').order('completed_at', { ascending: false });
          if (finalHistoryError) throw finalHistoryError;

          if (finalTasks) {
            setTasks(finalTasks.map(t => ({
              id: t.id,
              text: t.text,
              completed: t.completed,
              dueDate: t.due_date,
              repeat: t.repeat || 'none'
            })));
          }

          if (finalHistory) {
            setCompletedHistory(finalHistory.map(h => ({
              historyId: h.id,
              id: h.task_id,
              text: h.text,
              completed: true,
              dueDate: h.due_date,
              repeat: h.repeat || 'none',
              completedAt: h.completed_at
            })));
          }

          // Only set saved if we didn't encounter errors (syncStatus might be 'error' from loops)
          setSyncStatus(prev => prev === 'error' ? 'error' : 'saved');
        } catch (err) {
          console.error('Error fetching/syncing with Supabase:', err);
          setSyncStatus('error');
        }
      } else {
        // Not logged in, use local
        setTasks(localTasks);
        setCompletedHistory(localHistory);
      }

      console.log('Load complete. Tasks:', localTasks.length);
      setIsLoaded(true);
    };

    loadInitialData();
  }, [user, isGuest]);

  // Realtime subscription & Window Focus Refetch
  useEffect(() => {
    if (!user) return;

    const refreshData = async () => {
      try {
        const { data: cloudTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        const { data: cloudHistory } = await supabase.from('history').select('*').order('completed_at', { ascending: false });

        if (cloudTasks) {
          setTasks(cloudTasks.map(t => ({
            id: t.id,
            text: t.text,
            completed: t.completed,
            dueDate: t.due_date,
            repeat: t.repeat || 'none'
          })));
        }

        if (cloudHistory) {
          setCompletedHistory(cloudHistory.map(h => ({
            historyId: h.id,
            id: h.task_id,
            text: h.text,
            completed: true,
            dueDate: h.due_date,
            repeat: h.repeat || 'none',
            completedAt: h.completed_at
          })));
        }
      } catch (err) {
        console.error('Error refreshing data:', err);
      }
    };

    // 1. Subscribe to Supabase changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        () => {
          refreshData();
        }
      )
      .subscribe();

    // 2. Refresh on window focus
    const onFocus = () => {
      refreshData();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus); // cleanup is simplified
    };
  }, [user]);


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

  const handleLogout = async () => {
    try {
      if (user) {
        await supabase.auth.signOut();

        // Clear all local data to ensure a clean slate for the next session/guest
        localStorage.removeItem('tasks');
        localStorage.removeItem('completedHistory');
        localStorage.removeItem('tasksAddedCount');
        localStorage.removeItem('loginPromptSuppressed');
        localStorage.removeItem('nextPromptThreshold');

        // Reload the page to reset the app state completely
        window.location.reload();
      } else {
        // If somehow called without user (fallback)
        setIsGuest(false);
        setIsMenuOpen(false);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.reload();
    }
  };

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

  // Login Prompt Logic
  useEffect(() => {
    if (user || isMenuOpen) return; // Don't interrupt if logged in or menu open

    const isSuppressed = localStorage.getItem('loginPromptSuppressed') === 'true';
    if (isSuppressed) return;

    if (tasksAddedCount > 0 && tasksAddedCount % nextPromptThreshold === 0) {
      if (!showLoginPrompt && !showDontAskInfo) {
        setShowLoginPrompt(true);
      }
    }
  }, [tasksAddedCount, user, nextPromptThreshold, isMenuOpen]);

  const handleLoginPromptChoice = (choice: 'login' | 'later') => {
    if (dontAskAgainChecked) {
      localStorage.setItem('loginPromptSuppressed', 'true');
      setShowLoginPrompt(false);
      setShowDontAskInfo(true); // Show info popup
      return;
    }

    if (choice === 'login') {
      setShowLoginPrompt(false);
      // For now, redirect to Auth or handle login triggering.
      // Since Auth is conditionally rendered, we might need to force a state
      // that shows Auth? Or just tell them to use the menu?
      // "asking if he/she would like to log in"
      // Simplest way: Set isGuest(false) and ensure user is null, 
      // but we need to prevent the app from just auto-switching back to guest.
      // Actually, typically we'd show the Auth modal.
      // Let's toggle a state to show Auth modal overlay or redirect.
      // For this implementation, let's assume we redirect to the "Welcome" screen
      // by setting isGuest(false). But wait, our logic defaults isGuest=true
      // if no user. We might need a flag `forceAuthView`.
      setIsGuest(false);
    } else if (choice === 'later') {
      setShowLoginPrompt(false);
      // Set to 30 tasks only after user clicks "ask me later"
      setNextPromptThreshold(30);
    }
  };

  const resetApp = async () => {
    if (confirm(t('menu.restartConfirm'))) {
      setIsMenuOpen(false);

      if (user) {
        setSyncStatus('syncing');
        try {
          await supabase.from('tasks').delete().eq('user_id', user.id);
          await supabase.from('history').delete().eq('user_id', user.id);
        } catch (err) {
          console.error('Failed to clear cloud data:', err);
        }
      }

      localStorage.removeItem('tasks');
      localStorage.removeItem('completedHistory');
      localStorage.removeItem('tasksAddedCount');
      localStorage.removeItem('loginPromptSuppressed');
      localStorage.removeItem('nextPromptThreshold');

      setTasks([]);
      setCompletedHistory([]);
      setTasksAddedCount(0);
      setNextPromptThreshold(3);

      window.location.reload();
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);

    localStorage.setItem('language', lang);
  };

  // Persist tasks
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks, isLoaded]);

  // Persist history
  useEffect(() => {
    localStorage.setItem('completedHistory', JSON.stringify(completedHistory));
  }, [completedHistory, isLoaded]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode, isLoaded]);

  useEffect(() => {
    localStorage.setItem('tasksAddedCount', JSON.stringify(tasksAddedCount));
  }, [tasksAddedCount, isLoaded]);

  useEffect(() => {
    localStorage.setItem('nextPromptThreshold', JSON.stringify(nextPromptThreshold));
  }, [nextPromptThreshold, isLoaded]);

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

      setTasks(newTasks => {
        const updated = [...newTasks, newTaskObj];
        if (user) {
          setSyncStatus('syncing');
          // Remove ID from insert payload to let Postgres generate it
          const { id, ...taskPayload } = newTaskObj;

          supabase.from('tasks').insert({
            user_id: user.id,
            text: taskPayload.text,
            completed: taskPayload.completed,
            due_date: taskPayload.dueDate,
            repeat: taskPayload.repeat
          })
            .select()
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error('Error adding task to Supabase:', error);
                setSyncStatus('error');
              } else if (data) {
                setSyncStatus('saved');
                // Update the local task with the real server-generated ID
                setTasks(currentTasks =>
                  currentTasks.map(t => t.id === newTaskObj.id ? { ...t, id: data.id } : t)
                );
              }
            });
        }
        return updated;
      });
      setTasksAddedCount(prev => prev + 1);
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
      if (user) {
        setSyncStatus('syncing');
        // Move to history in Supabase
        // Omit 'id' to let Postgres generate it
        supabase.from('history').insert({
          task_id: historyEntry.id,
          user_id: user.id,
          text: historyEntry.text,
          completed_at: historyEntry.completedAt,
          due_date: historyEntry.dueDate,
          repeat: historyEntry.repeat
        }).then(({ error }) => {
          if (error) {
            console.error('Error adding history to Supabase:', error);
            setSyncStatus('error');
          }
        });

        if (task.repeat !== 'none') {
          const nextDate = getNextDate(task.dueDate, task.repeat);
          supabase.from('tasks').update({ due_date: nextDate }).eq('id', id).then(({ error }) => {
            if (error) {
              console.error('Error updating task in Supabase:', error);
              setSyncStatus('error');
            } else {
              setSyncStatus('saved');
            }
          });
        } else {
          supabase.from('tasks').delete().eq('id', id).then(({ error }) => {
            if (error) {
              console.error('Error deleting task from Supabase:', error);
              setSyncStatus('error');
            } else {
              setSyncStatus('saved');
            }
          });
        }
      }

      setCompletedHistory(prev => [historyEntry, ...prev]);

      if (task.repeat !== 'none') {
        const nextDate = getNextDate(task.dueDate, task.repeat);
        setTasks(prev => prev.map(t =>
          t.id === id ? { ...t, dueDate: nextDate, completed: false } : t
        ));
      } else {
        setTasks(prev => prev.filter(t => t.id !== id));
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
      if (user) {
        supabase.from('tasks').delete().eq('id', id).then(({ error }) => {
          if (error) console.error('Error deleting task from Supabase:', error);
        });
      }
    } else {
      // Delete only "this session" = skip to next date of occurrence
      const nextDate = getNextDate(selectedDate, tasks.find(t => t.id === id)?.repeat || 'none');
      setTasks(tasks.map(t =>
        t.id === id ? { ...t, dueDate: nextDate } : t
      ));
      if (user) {
        supabase.from('tasks').update({ due_date: nextDate }).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating task in Supabase:', error);
        });
      }
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

    const updatedTask = { ...editingTask, text: editTaskText, dueDate: editTaskDate, repeat: editTaskRepeat };
    setTasks(tasks.map(task =>
      task.id === editingTask.id
        ? updatedTask
        : task
    ));

    if (user) {
      supabase.from('tasks').update({
        text: editTaskText,
        due_date: editTaskDate,
        repeat: editTaskRepeat
      }).eq('id', editingTask.id).then(({ error }) => {
        if (error) console.error('Error updating task in Supabase:', error);
      });
    }

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

  const getFormattedDate = (dateStr: string) => {
    // Parse date as local
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNum = date.getDate();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[date.getMonth()];

    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const formattedDate = `${monthName} ${getOrdinal(dayNum)}`;
    const hasYear = date.getFullYear() !== today.getFullYear();
    const yearStr = hasYear ? `, ${date.getFullYear()}` : '';

    if (dateStr === todayStr) {
      return `Today - ${formattedDate}${yearStr}`;
    }
    if (isTomorrow(dateStr)) {
      return `Tomorrow - ${formattedDate}${yearStr}`;
    }
    return `${formattedDate}${yearStr}`;
  };

  // Get all dates for the next 7 days (starting tomorrow)
  const getNext7Days = () => {
    const dates: string[] = [];
    for (let i = 1; i <= 7; i++) {
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

      // Exclude overdue tasks from Upcoming (they show in Today view)
      if (task.dueDate < todayStr) {
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
  const baseTasks = tasks.reduce<Task[]>((acc, task) => {
    // Check if it's an exact date match
    if (task.dueDate === selectedDate) {
      acc.push(task);
      return acc;
    }

    // Check if it's a recurring task that matches the selected date
    if (task.repeat !== 'none' && isDateInRecurringSchedule(task.dueDate, selectedDate, task.repeat)) {
      // Visually override the display date to match the selected view date
      // This ensures that when viewing "Next Week", the task appears to be due that day
      acc.push({ ...task, dueDate: selectedDate });
      return acc;
    }

    // For today's view, also show overdue tasks
    if (selectedDate === todayStr && task.dueDate < todayStr && !task.completed) {
      acc.push(task);
      return acc;
    }

    return acc;
  }, []);

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

  const accentColor = theme === 'night' ? 'bg-night-light text-white shadow-[0_0_20px_rgba(220,38,38,0.25)]' : 'bg-gold-lime text-white shadow-[0_0_20px_rgba(107,114,128,0.2)]';
  const buttonPrimaryClass = `${accentColor} hover:opacity-90`;
  const buttonSecondaryClass = theme === 'night' ? 'bg-[#251e1a] border border-[#382b24] text-[#fdf5e6] hover:border-[#5d4a40]' : (darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700' : 'bg-white border border-zinc-200 text-zinc-800');
  const iconStrokeWidth = 2.5;

  if (!isLoaded) return null;

  if (!user && !isGuest) {
    return (
      <div className={`min-h-screen ${bgClass} transition-colors duration-300`}>
        <Auth onAuthSuccess={() => { }} onGuestAccess={() => setIsGuest(true)} darkMode={darkMode} />
      </div>
    );
  }

  return (
    <>
      <div className={`min-h-screen ${bgClass} p-4 transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto">

          <div className={`${cardClass} rounded-2xl shadow-xl p-6 mb-6 border`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 relative gap-4 md:gap-0">
              <div className="flex items-center gap-3">
                <h1 className={`text-4xl font-extrabold tracking-tight ${textClass}`}>{t('appTitle')}</h1>
                {(user || isGuest) && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border animate-in fade-in duration-500 ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                    {isGuest ? (
                      <CloudOff className={`w-3.5 h-3.5 text-zinc-400`} />
                    ) : (
                      <>
                        {syncStatus === 'syncing' && <Cloud className={`w-3.5 h-3.5 animate-pulse ${darkMode ? 'text-zinc-400' : 'text-zinc-400'}`} />}
                        {syncStatus === 'saved' && <CloudCheck className={`w-3.5 h-3.5 ${darkMode ? 'text-[#6B7280]' : 'text-[#6B7280]'}`} />}
                        {syncStatus === 'error' && <CloudOff className="w-3.5 h-3.5 text-red-500" />}
                      </>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-widest ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
                      {isGuest ? 'Local-Only' : (syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'saved' ? 'Synced' : 'Error')}
                    </span>
                  </div>
                )}
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
                        {/* User Profile */}
                        <div className={`px-4 py-3 flex items-center gap-3 border-b ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                          <div className={`w-8 h-8 rounded-full ${accentColor} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}>
                            {(user?.email || 'Guest').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-xs font-bold truncate ${textClass}`}>{user?.email || 'Guest User'}</span>
                            <span className={`text-[10px] ${textSecondaryClass}`}>{user ? 'Supabase User' : 'Local Persistence'}</span>
                          </div>
                        </div>

                        {/* History */}
                        <button
                          onClick={() => { setView('history'); setIsMenuOpen(false); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${darkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50'} ${textClass}`}
                        >
                          <BadgeCheck className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                          {t('menu.history') || 'History'}
                        </button>
                        <div className={`h-px my-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}></div>

                        {/* Theme */}
                        <div className={`px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${textSecondaryClass} opacity-60`}>Theme</div>
                        <button
                          onClick={() => { setTheme('dark'); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${theme === 'dark' ? (darkMode ? 'bg-zinc-900/60' : 'bg-zinc-100') : (darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50')} ${textClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <Moon className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                            <span>Dark</span>
                          </div>
                          {theme === 'dark' && <Check className="w-4 h-4 text-[#6B7280]" strokeWidth={iconStrokeWidth} />}
                        </button>
                        <button
                          onClick={() => { setTheme('light'); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${theme === 'light' ? (darkMode ? 'bg-zinc-900/60' : 'bg-zinc-100') : (darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50')} ${textClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <Sun className="w-4 h-4" strokeWidth={iconStrokeWidth} />
                            <span>Light</span>
                          </div>
                          {theme === 'light' && <Check className="w-4 h-4 text-black" strokeWidth={iconStrokeWidth} />}
                        </button>
                        <button
                          onClick={() => { setTheme('night'); }}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${theme === 'night' ? (darkMode ? 'bg-zinc-900/60' : 'bg-zinc-100') : (darkMode ? 'hover:bg-zinc-900/40' : 'hover:bg-zinc-50')} ${textClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <Eye className="w-4 h-4 text-[#EF4444]" strokeWidth={iconStrokeWidth} />
                            <span>Night Light</span>
                          </div>
                          {theme === 'night' && <Check className="w-4 h-4 text-[#EF4444]" strokeWidth={iconStrokeWidth} />}
                        </button>

                        <div className={`h-px my-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}></div>

                        {/* Logout / Login */}
                        <button
                          onClick={isGuest ? () => { setIsGuest(false); setIsMenuOpen(false); } : handleLogout}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition ${isGuest ? (darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50') : 'text-red-500 hover:bg-red-500/10'}`}
                        >
                          {isGuest ? <LogIn className="w-4 h-4" strokeWidth={iconStrokeWidth} /> : <LogOut className="w-4 h-4" strokeWidth={iconStrokeWidth} />}
                          <span className={isGuest ? textClass : ''}>{isGuest ? 'Sign In' : 'Sign Out'}</span>
                        </button>

                        <div className={`h-px my-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}></div>

                        {/* Language */}
                        <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${textSecondaryClass} opacity-70`}>Language</div>
                        <button
                          onClick={() => changeLanguage('en')}
                          className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition ${darkMode ? 'hover:bg-zinc-900' : 'hover:bg-zinc-50'} ${textClass}`}
                        >
                          <span>English</span>
                          {i18n.language === 'en' && <Check className={`w-4 h-4 ${theme === 'night' ? 'text-[#DC2626]' : 'text-[#6B7280]'}`} strokeWidth={iconStrokeWidth} />}
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
                  <BadgeCheck className={`w-6 h-6 ${theme === 'night' ? 'text-[#EF4444]' : (darkMode ? 'text-[#374151]' : 'text-[#6B7280]')}`} strokeWidth={iconStrokeWidth} />
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
                <div className={`${theme === 'night' ? 'bg-[#251e1a] border-[#382b24]' : (darkMode ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-zinc-200')} border rounded-2xl p-6 mb-4 shadow-sm transition-all`}>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTask(false)}
                      maxLength={300}
                      placeholder={t('tasks.placeholder')}
                      className={`w-full px-5 py-4 rounded-2xl border ${inputClass} ${theme === 'night' ? 'focus:border-[#DC2626]' : (darkMode ? 'focus:border-[#374151]' : 'focus:border-black')} outline-none transition-all font-medium`}
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

                {!showUpcomingView && (
                  <div className="mb-6 px-1">
                    <h2 className={`text-xl font-bold ${textClass}`}>
                      {getFormattedDate(selectedDate)}
                    </h2>
                  </div>
                )}

                <div className="space-y-8">
                  {/* Active Tasks Section */}
                  <div className="space-y-3">
                    {showUpcomingView ? (
                      // Upcoming Tasks View (next 7 days) grouped by date
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

                        // Group by date
                        const groups = upcomingTasks.reduce((acc: any, task) => {
                          const d = task.displayDate || task.dueDate;
                          if (!acc[d]) acc[d] = [];
                          acc[d].push(task);
                          return acc;
                        }, {});

                        const sortedDates = Object.keys(groups).sort();

                        return sortedDates.map(date => (
                          <div key={date} className="space-y-3">
                            <h3 className={`text-sm font-bold uppercase tracking-wider ${textSecondaryClass} px-1 pt-4 pb-1`}>
                              {getFormattedDate(date)}
                            </h3>
                            {groups[date].map((task: any) => (
                              <div
                                key={`${task.id}-${task.displayDate || task.dueDate}`}
                                className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300 ${darkMode ? 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
                              >
                                <button
                                  onClick={() => toggleTask(task.id)}
                                  className="flex-shrink-0 transition-transform active:scale-125 hover:scale-110 mt-0.25"
                                >
                                  <Circle className={`w-6 h-6 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} strokeWidth={iconStrokeWidth} />
                                </button>

                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() => openEditModal(task)}
                                    className="w-full text-left focus:outline-none"
                                  >
                                    <p className={`font-medium ${textClass} break-words pr-2 hover:opacity-80 transition-opacity`}>{task.text}</p>
                                  </button>

                                  <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                                    {task.displayDate && task.displayDate < todayStr && (
                                      <span
                                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0 ${darkMode ? 'bg-[#374151]/10 text-[#374151] border border-[#374151]/20' : 'bg-black text-white'}`}
                                        title={`Scheduled for ${task.displayDate}`}
                                      >
                                        Due
                                      </span>
                                    )}

                                    {(task.isDailyRecurring || task.repeat === 'weekly' || task.repeat === 'monthly') && (
                                      <>
                                        {task.isDailyRecurring && (
                                          <span
                                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'bg-[#6B7280]/10 text-[#6B7280] border border-[#6B7280]/20' : 'bg-zinc-100 text-zinc-800 border border-zinc-200'}`}
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
                                    onClick={() => openCalendarModal(task)}
                                    className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-[#374151] hover:bg-zinc-800' : 'text-zinc-400 hover:text-black hover:bg-zinc-100'} rounded-full transition-all`}
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
                        className={`flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${darkMode ? 'bg-zinc-900/40 hover:bg-zinc-900 border-zinc-900 hover:border-zinc-800' : 'bg-white border-zinc-200 hover:border-zinc-300'}`}
                      >
                        <button
                          onClick={() => toggleTask(task.id)}
                          className="flex-shrink-0 transition-transform active:scale-125 hover:scale-110"
                        >
                          <Circle className={`w-6 h-6 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} strokeWidth={iconStrokeWidth} />
                        </button>

                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => openEditModal(task)}
                            className="w-full text-left focus:outline-none"
                          >
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${textClass} hover:opacity-80 transition-opacity`}>{task.text}</p>
                              {task.dueDate < todayStr && !task.completed && (
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${darkMode ? 'bg-[#374151]/10 text-[#374151] border border-[#374151]/20' : 'bg-black text-white'}`}
                                  title={`Scheduled for ${task.dueDate}`}
                                >
                                  Due
                                </span>
                              )}
                            </div>
                          </button>
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
                            onClick={() => openCalendarModal(task)}
                            className={`p-2.5 ${darkMode ? 'text-zinc-600 hover:text-[#374151] hover:bg-zinc-800' : 'text-zinc-400 hover:text-black hover:bg-zinc-100'} rounded-full transition-all`}
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
                        <BadgeCheck className={`w-5 h-5 ${theme === 'night' ? 'text-[#EF4444]' : (darkMode ? 'text-[#374151]' : 'text-[#6B7280]')}`} strokeWidth={iconStrokeWidth} />
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
                        ? `border-[#6B7280] bg-[#6B7280]/10 ${textClass}`
                        : `border-zinc-800 hover:border-zinc-700 ${textSecondaryClass}`
                        }`}
                    >
                      <Sun className="w-6 h-6" strokeWidth={2} />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('schedule.tomorrow')}</span>
                    </button>
                    <button
                      onClick={setNextWeek}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 transition-all ${scheduleTaskDate && isNextWeek(scheduleTaskDate)
                        ? `border-[#6B7280] bg-[#6B7280]/10 ${textClass}`
                        : `border-zinc-800 hover:border-zinc-700 ${textSecondaryClass}`
                        }`}
                    >
                      <ArrowRight className="w-6 h-6" strokeWidth={2} />
                      <span className="text-xs font-bold uppercase tracking-wider">{t('schedule.nextWeek')}</span>
                    </button>
                    <div className="relative">
                      <button
                        className={`w-full h-full flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border-2 transition-all ${isCustomDate(scheduleTaskDate)
                          ? `border-[#6B7280] bg-[#6B7280]/10 ${textClass}`
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
                    className={`w-full px-4 py-5 rounded-2xl border-2 ${inputClass} focus:border-[#6B7280] outline-none transition-all font-bold text-lg max-w-[95%] mx-auto block box-border`}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 px-1">{t('schedule.repeatLabel')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setRepeatRule('none')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'none' ? `border-[#6B7280] bg-[#6B7280]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {t('schedule.none')}
                    </button>
                    <button
                      onClick={() => setRepeatRule('daily')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'daily' ? `border-[#6B7280] bg-[#6B7280]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {t('schedule.daily')}
                    </button>
                    <button
                      onClick={() => setRepeatRule('weekly')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'weekly' ? `border-[#6B7280] bg-[#6B7280]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                    >
                      {t('schedule.weekly')}
                    </button>
                    <button
                      onClick={() => setRepeatRule('monthly')}
                      className={`px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${repeatRule === 'monthly' ? `border-[#6B7280] bg-[#6B7280]/10 ${textClass}` : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
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
                    className={`w-full px-5 py-4 rounded-2xl border-2 ${inputClass} ${theme === 'night' ? 'focus:border-[#DC2626]' : (darkMode ? 'focus:border-[#374151]' : 'focus:border-black')} outline-none transition-all font-medium`}
                  />
                </div>

                <div className="flex flex-col md:grid md:grid-cols-[1fr_1.5fr] gap-4">
                  <div className="min-w-0">
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('edit.dateLabel')}</label>
                    <input
                      type="date"
                      value={editTaskDate}
                      onChange={(e) => setEditTaskDate(e.target.value)}
                      className={`w-full max-w-full px-5 py-4 rounded-2xl border-2 appearance-none ${inputClass} focus:border-blue-500 outline-none`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>{t('edit.repeatLabel')}</label>
                    <select
                      value={editTaskRepeat}
                      onChange={(e) => setEditTaskRepeat(e.target.value)}
                      className={`w-full px-5 py-4 rounded-2xl border-2 ${inputClass} focus:border-blue-500 outline-none`}
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


      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-sm w-full border text-center animate-in zoom-in-95 duration-200`}>
            <div className={`w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
              <Cloud className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className={`text-xl font-bold ${textClass} mb-2`}>{t('onboarding.saveOnline') || "Save your tasks online?"}</h3>
            <p className={`${textSecondaryClass} mb-6 text-sm divide-y`}>
              {t('onboarding.loginPromptDesc') || "Create an account to sync your tasks across devices and never lose them."}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleLoginPromptChoice('login')}
                className={`w-full py-3.5 rounded-full font-black uppercase tracking-widest text-xs ${buttonPrimaryClass}`}
              >
                {t('menu.login') || "Log In / Sign Up"}
              </button>

              <button
                onClick={() => handleLoginPromptChoice('later')}
                className={`w-full py-3 rounded-full font-black uppercase tracking-widest text-[10px] border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all`}
              >
                {t('onboarding.continueGuest') || "Continue as Guest"}
              </button>

              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    id="dontAskAgain"
                    checked={dontAskAgainChecked}
                    onChange={(e) => setDontAskAgainChecked(e.target.checked)}
                    className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-zinc-600 checked:bg-blue-500 checked:border-blue-500 transition-all"
                  />
                  <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                </div>
                <label htmlFor="dontAskAgain" className={`${textSecondaryClass} text-xs cursor-pointer select-none`}>
                  {t('onboarding.dontAskAgain') || "Don't ask again"}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Don't Ask Again Info Modal */}
      {showDontAskInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className={`${cardClass} rounded-2xl shadow-2xl p-6 max-w-sm w-full border text-center animate-in zoom-in-95 duration-200`}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <h3 className={`text-xl font-bold ${textClass} mb-2`}>{t('onboarding.understood') || "Understood!"}</h3>
            <p className={`${textSecondaryClass} mb-6 text-sm`}>
              {t('onboarding.manualLoginInfo') || "You can always log in later from the menu (top right) to save your tasks."}
            </p>
            <button
              onClick={() => setShowDontAskInfo(false)}
              className={`w-full py-3 rounded-full font-black uppercase tracking-widest text-xs ${buttonPrimaryClass}`}
            >
              {t('common.ok') || "Got it"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
