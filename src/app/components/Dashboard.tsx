import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  isToday,
  differenceInMinutes,
  addMinutes,
  startOfDay,
  setHours,
  setMinutes,
  isSameDay,
  parseISO,
  parse
} from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import {
  Home,
  MapPin,
  Plus,
  Settings,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Briefcase,
  User,
  Activity,
  Clock,
  Video,
  ChevronDown,
  Keyboard,
  Sun,
  Moon,

  CheckCircle,
  Hourglass,
  Check,
  Edit2,
  Sparkles,
  Gift,
  Trash2
} from 'lucide-react';

import { Task } from '@/app/types';
import { TaskDetails } from '@/app/components/TaskDetails';
import { SettingsPanel } from '@/app/components/SettingsPanel';
import { CreateReminder } from '@/app/components/CreateReminder';
import { festivals } from '@/app/data/festivals';
import { ProfileMenu } from '@/app/components/ProfileMenu';
import { NearbyLocations } from '@/app/components/NearbyLocations';
import { toast } from 'sonner';

interface DashboardProps {
  userEmail: string;
  userName: string;
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  onUpdateUser: (newName: string) => void;
}

type View = 'home' | 'locations' | 'settings' | 'pending' | 'completed' | 'specials' | 'calendar';
type DragMode = 'none' | 'create' | 'move' | 'resize';

// Constants
const HOUR_HEIGHT = 60;
const GRID_START_HOUR = 0;
const COL_WIDTH_PERCENT = 100 / 7;
const SNAP_MINUTES = 15;

export function Dashboard({
  userEmail,
  userName,
  tasks,
  onAddTask,
  onDeleteTask,
  onToggleComplete,
  onUpdateTask,
  onUpdateUser,
}: DashboardProps) {
  const [activeView, setActiveView] = useState<View>('home');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [openInEditMode, setOpenInEditMode] = useState(false);

  // Teams-like Interaction State
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [dragStart, setDragStart] = useState<{ x: number, y: number, time: number, dayIndex: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number, time: number, dayIndex: number } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null); // For move/resize

  // Create Modal State
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; date?: string; time?: string; duration?: number }>({
    isOpen: false
  });

  // Derived Dates
  // Derived Dates
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'workWeek'>('week');

  const calendarDays = useMemo(() => {
    if (calendarView === 'day') return [currentDate];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    if (calendarView === 'workWeek') return Array.from({ length: 5 }).map((_, i) => addDays(start, i));
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [currentDate, calendarView]);

  // Keep legacy name for other internals if needed
  const weekDays = calendarDays;
  const startDate = calendarDays[0];

  // Festivals
  // Festivals & Specials
  const mockSpecials = useMemo(() => [
    { date: format(new Date(), 'yyyy-MM-dd'), name: "Team Lunch", type: 'cultural' },
    { date: '2026-02-15', name: "Project Deadline", type: 'other' },
    { date: '2026-02-28', name: "Office Anniversary", type: 'anniversary' }
  ], []);

  const userSpecials = useMemo(() => {
    return tasks
      .map(task => {
        const desc = task.description || '';
        const match = desc.match(/<!-- metadata: (.+) -->/);
        if (match) {
          try {
            const meta = JSON.parse(match[1]);
            if (meta.isSpecial) {
              return {
                date: task.date,
                name: task.title,
                type: (meta.specialType || 'other') as any // Cast to match Festival type if needed
              };
            }
          } catch (e) { }
        }
        return null;
      })
      .filter(item => item !== null);
  }, [tasks]);

  const allSpecials = useMemo(() => [...festivals, ...mockSpecials, ...userSpecials], [mockSpecials, userSpecials]);
  const festivalDays = useMemo(() => allSpecials.map(f => parseISO(f.date)), [allSpecials]);
  const activeFestival = useMemo(() => allSpecials.find(f => f.date === format(currentDate, 'yyyy-MM-dd')), [currentDate, allSpecials]);
  const specialsForDate = useMemo(() => allSpecials.filter(s => s.date === format(currentDate, 'yyyy-MM-dd')), [currentDate, allSpecials]);

  // --- Helpers ---

  const getMinutesFromY = (y: number) => {
    return Math.floor((y / HOUR_HEIGHT) * 60);
  };

  const getDayIndexFromX = (x: number, width: number, daysCount = 7) => {
    return Math.min(daysCount - 1, Math.max(0, Math.floor(x / (width / daysCount))));
  };

  const snapToGrid = (minutes: number) => {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  };

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((activeView !== 'home' && activeView !== 'calendar') || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 60; // Offset for time column
    const y = e.clientY - rect.top + containerRef.current.scrollTop; // Adjust for scroll

    if (x < 0) return; // Clicked on time column

    const dayIndex = getDayIndexFromX(x, rect.width - 60, weekDays.length);
    const time = getMinutesFromY(y);

    setDragStart({ x, y, time: snapToGrid(time), dayIndex });
    setDragCurrent({ x, y, time: snapToGrid(time), dayIndex });
    setDragMode('create');
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragMode === 'none' || !containerRef.current || !dragStart) return;

    // Auto scroll if near edges (simplified)
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    const x = e.clientX - rect.left - 60;

    const time = getMinutesFromY(y);
    const dayIndex = getDayIndexFromX(x, rect.width - 60, weekDays.length);

    setDragCurrent({ x, y, time: snapToGrid(time), dayIndex });
  }, [dragMode, dragStart, weekDays]);

  const handleMouseUp = useCallback(() => {
    if (dragMode === 'create' && dragStart && dragCurrent) {
      // Calculate created range
      const startMin = Math.min(dragStart.time, dragCurrent.time);
      const endMin = Math.max(dragStart.time, dragCurrent.time);
      const duration = Math.max(SNAP_MINUTES, endMin - startMin + (dragStart.time === dragCurrent.time ? 30 : 0));

      const dayDate = addDays(startDate, dragStart.dayIndex);
      const dateStr = format(dayDate, 'yyyy-MM-dd');

      const hours = Math.floor(startMin / 60);
      const mins = startMin % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

      setCreateModal({
        isOpen: true,
        date: dateStr,
        time: timeStr,
        duration: duration
      });
    } else if (dragMode === 'move' && activeTaskId && dragCurrent && dragStart) {
      // Finalize move
      const task = tasks.find(t => t.id === activeTaskId);
      if (task) {
        const timeDiff = dragCurrent.time - dragStart.time;
        const dayDiff = dragCurrent.dayIndex - dragStart.dayIndex;

        // Helper to parse "HH:mm"
        const [h, m] = task.time!.split(':').map(Number);
        const originalMins = h * 60 + m;
        let newMins = originalMins + timeDiff;
        // Clamp to 0-24h
        newMins = Math.max(0, Math.min(1440 - (task.duration || 60), newMins));

        // Calculate new date
        const originalDate = new Date(task.date);
        const newDate = addDays(originalDate, dayDiff);

        // Format
        const newH = Math.floor(newMins / 60);
        const newM = newMins % 60;
        const newTimeStr = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;

        if (task.date !== format(newDate, 'yyyy-MM-dd') || task.time !== newTimeStr) {
          onUpdateTask({ ...task, date: format(newDate, 'yyyy-MM-dd'), time: newTimeStr });
          toast.success('Event moved');
        }
      }
    } else if (dragMode === 'resize' && activeTaskId && dragCurrent && dragStart) {
      // Finalize resize
      const task = tasks.find(t => t.id === activeTaskId);
      if (task) {
        const endMins = dragCurrent.time;
        const [h, m] = task.time!.split(':').map(Number);
        const startMins = h * 60 + m;
        const newDuration = Math.max(15, endMins - startMins);

        if (task.duration !== newDuration) {
          onUpdateTask({ ...task, duration: newDuration });
          toast.success('Event resized');
        }
      }
    }

    setDragMode('none');
    setDragStart(null);
    setDragCurrent(null);
    setActiveTaskId(null);
  }, [dragMode, dragStart, dragCurrent, startDate, tasks, onUpdateTask]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Theme State
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  useEffect(() => {
    // Initialize theme on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);


  // --- Event Layout Logic (Overlaps) ---
  const eventsForGrid = useMemo(() => {
    // 1. Filter only this week's events
    const weekStartStr = format(startDate, 'yyyy-MM-dd');
    const weekEndStr = format(addDays(startDate, 6), 'yyyy-MM-dd');

    // We need to group by Day first to handle day-local overlaps
    const eventsByDay: { [key: string]: any[] } = {};
    weekDays.forEach(d => eventsByDay[format(d, 'yyyy-MM-dd')] = []);

    tasks.forEach(task => {
      if (!task.completed && eventsByDay[task.date]) {
        eventsByDay[task.date].push(task);
      }
    });

    // 2. Process each day for visual attributes (top, height, left, width)
    const processedEvents: any[] = [];

    Object.keys(eventsByDay).forEach(dateKey => {
      const dayEvents = eventsByDay[dateKey];
      // Sort by start time
      dayEvents.sort((a, b) => {
        return a.time!.localeCompare(b.time!);
      });

      // Simple overlap algorithm:
      // Group colliding events
      // Map [start, end] in minutes
      const slots: any[] = dayEvents.map(e => {
        const [h, m] = e.time!.split(':').map(Number);
        const start = h * 60 + m;
        let duration = e.duration || 60;
        // Parse duration from description if missing in prop (legacy support)
        if (!e.duration && e.description?.includes('Duration:')) {
          // Try parse
          try {
            const match = e.description.match(/Duration: (\d+)/);
            if (match) duration = parseInt(match[1]);
          } catch (e) { }
        }

        return {
          ...e,
          start,
          end: start + duration,
          duration
        };
      });

      // Layout calc (Pack events)
      const columns: any[][] = [];
      slots.forEach(event => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const lastEvent = col[col.length - 1];
          if (lastEvent.end <= event.start) {
            col.push(event);
            event.colIndex = i;
            placed = true;
            break;
          }
        }
        if (!placed) {
          columns.push([event]);
          event.colIndex = columns.length - 1;
        }
      });

      const totalCols = columns.length;

      // Calculate day index for horizontal positioning
      const dayIndex = weekDays.findIndex(d => format(d, 'yyyy-MM-dd') === dateKey);
      if (dayIndex === -1) return;

      const dayWidthPercent = 100 / weekDays.length;
      const dayLeftPercent = dayIndex * dayWidthPercent;

      slots.forEach(event => {
        processedEvents.push({
          ...event,
          style: {
            top: (event.start / 60) * HOUR_HEIGHT,
            height: (event.duration / 60) * HOUR_HEIGHT,
            left: `${dayLeftPercent + (event.colIndex / totalCols) * dayWidthPercent}%`,
            width: `${(1 / totalCols) * dayWidthPercent}%`,
            position: 'absolute'
          }
        });
      });
    });

    return processedEvents;
  }, [tasks, startDate, weekDays]);




  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#1f1f1f] text-gray-900 dark:text-gray-100 overflow-hidden font-sans selection:bg-[#e0b596]/30">

      {/* Sidebar - Teams Style (Updated) */}
      <div className={`hidden lg:flex flex-col w-[68px] bg-white dark:bg-[#1b1b1b] border-r border-gray-200 dark:border-[#292929] items-center py-6 z-20`}>
        <nav className="flex-1 w-full flex flex-col items-center gap-6">
          <button
            onClick={() => {
              setActiveView('home');
              document.getElementById('dashboard-main')?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`group relative p-3 rounded-xl transition-all ${activeView === 'home' && !document.getElementById('calendar-section')?.matches(':hover') ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292929]/50'}`}
          >
            <Home className="w-6 h-6" />
            <span className="absolute left-14 bg-white dark:bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-200 dark:border-[#333] shadow-md z-50 text-gray-900 dark:text-gray-100">Home</span>
          </button>

          <button
            onClick={() => {
              setActiveView('calendar');
            }}
            className={`group relative p-3 rounded-xl transition-all ${activeView === 'calendar' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292929]/50'}`}
          >
            <CalendarIcon className="w-6 h-6" />
            <span className="absolute left-14 bg-white dark:bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-200 dark:border-[#333] shadow-md z-50 text-gray-900 dark:text-gray-100">Calendar</span>
          </button>

          <button
            onClick={() => setActiveView('specials')}
            className={`group relative p-3 rounded-xl transition-all ${activeView === 'specials' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292929]/50'}`}
          >
            <Sparkles className="w-6 h-6" />
            <span className="absolute left-14 bg-white dark:bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-200 dark:border-[#333] shadow-md z-50 text-gray-900 dark:text-gray-100">Specials</span>
          </button>

          <button onClick={() => setActiveView('pending')} className={`group relative p-3 rounded-xl transition-all ${activeView === 'pending' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292929]/50'}`}>
            <Hourglass className="w-6 h-6" />
            <span className="absolute left-14 bg-white dark:bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-200 dark:border-[#333] shadow-md z-50 text-gray-900 dark:text-gray-100">Pending</span>
          </button>

          <button onClick={() => setActiveView('completed')} className={`group relative p-3 rounded-xl transition-all ${activeView === 'completed' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596]' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292929]/50'}`}>
            <Check className="w-6 h-6" />
            <span className="absolute left-14 bg-white dark:bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-200 dark:border-[#333] shadow-md z-50 text-gray-900 dark:text-gray-100">Completed</span>
          </button>

          <div className="mt-auto flex flex-col items-center gap-4 mb-4">
            <button onClick={toggleTheme} className="group relative p-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#292929]/50 transition-all">
              {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              <span className="absolute left-14 bg-white dark:bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 whitespace-nowrap border border-gray-200 dark:border-[#333] shadow-md z-50 text-gray-900 dark:text-gray-100">Theme</span>
            </button>
            <button onClick={() => setShowSettings(true)} className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-[#1f1f1f]">

        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-[#292929] flex items-center justify-between px-6 bg-white dark:bg-[#1f1f1f]">
          <div className="flex items-center gap-6">
            <button className="lg:hidden text-gray-500 dark:text-gray-400" onClick={() => setShowSidebar(true)}>
              <Menu className="w-6 h-6" />
            </button>

            {/* Today Navigation Group */}
            <div className={`flex items-center gap-4 ${(activeView !== 'home' && activeView !== 'calendar') ? 'opacity-0 pointer-events-none' : ''}`}>

              {/* Month/Year Label with Popover Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                  className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-[#292929] px-2 py-1 rounded transition-colors"
                >
                  {format(currentDate, 'MMMM yyyy')}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showMiniCalendar ? 'rotate-180' : ''}`} />
                </button>

                {/* Mini Calendar Popover */}
                {showMiniCalendar && (
                  <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-lg shadow-2xl z-50">
                    <DayPicker
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => {
                        if (date) {
                          setCurrentDate(date);
                          setShowMiniCalendar(false);
                        }
                      }}
                      modifiers={{
                        today: new Date()
                      }}
                      modifiersStyles={{
                        today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '50%' },
                        selected: { backgroundColor: '#e0b596', color: 'white' }
                      }}
                      styles={{
                        root: { color: theme === 'dark' ? '#f5f5f5' : '#1f2937', backgroundColor: theme === 'dark' ? '#292929' : '#ffffff' },
                        day: { color: theme === 'dark' ? '#e0e0e0' : '#374151' },
                        caption: { color: theme === 'dark' ? '#f5f5f5' : '#111827' }
                      }}
                      showOutsideDays
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">

            {/* View Switcher - Teams Style */}
            {activeView === 'calendar' && (
              <div className="flex bg-gray-100 dark:bg-[#292929] rounded-lg p-1 gap-1">
                {(['day', 'workWeek', 'week'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setCalendarView(view)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${calendarView === view
                      ? 'bg-white dark:bg-[#333] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                  >
                    {view === 'day' ? 'Day' : view === 'workWeek' ? 'Work Week' : 'Week'}
                  </button>
                ))}
              </div>
            )}

            {/* Meet Actions */}
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-b from-[#e0b596]/90 to-[#c69472]/90 text-[#1f1f1f] shadow-[0_10px_20px_rgba(224,181,150,0.4),inset_0_1px_0_rgba(255,255,255,0.6)] border border-white/20 border-t-white/60 hover:brightness-110 hover:scale-[1.05] backdrop-blur-xl transition-all duration-300 rounded-xl text-sm font-semibold"
                onClick={() => setCreateModal({ isOpen: true, duration: 30 })}
              >
                <Plus className="w-4 h-4" />
                <span>Add reminder</span>
              </button>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => setShowProfileMenu(true)}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-[#e0b596] to-[#dcb49a] flex items-center justify-center text-xs font-bold text-[#1f1f1f] border-2 border-white/50 dark:border-[#333] ml-2 shadow-lg hover:shadow-xl hover:scale-110 transition-all cursor-pointer ring-2 ring-transparent hover:ring-[#e0b596]/50"
            >
              {userName && userName.length > 0 ? userName[0].toUpperCase() : 'U'}
            </button>
          </div>
        </header>

        {/* Profile Menu Overlay */}
        <AnimatePresence>
          {showProfileMenu && (
            <ProfileMenu
              userEmail={userEmail}
              userName={userName}
              onClose={() => setShowProfileMenu(false)}
              onLogout={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.reload();
              }}
            />
          )}
        </AnimatePresence>

        {/* Home Dashboard Layout */}
        {activeView === 'home' ? (
          <div id="dashboard-main" className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-[#1f1f1f]">
            <div className="p-6 lg:p-10 max-w-[1600px] mx-auto space-y-10">

              {/* Dashboard Header */}
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening'}, {userName}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg">Here's your schedule and tasks for today.</p>
              </div>

              {/* Landscape Calendar Section - Dense & Compact */}
              <div id="calendar-section" className="w-full bg-white dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm py-4 px-4 flex flex-col justify-center">
                <DayPicker
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => date && setCurrentDate(date)}
                  month={currentDate}
                  onMonthChange={setCurrentDate}
                  modifiersStyles={{
                    today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '0.5rem' },
                    selected: { backgroundColor: '#e0b596', color: 'white', fontWeight: '600' },
                    festival: { color: '#ef4444', fontWeight: 'bold' }
                  }}
                  modifiers={{
                    today: new Date(),
                    festival: festivalDays
                  }}
                  styles={{
                    root: { width: '100%' },
                    months: { width: '100%' },
                    table: { width: '100%', maxWidth: 'none', borderSpacing: '0', tableLayout: 'fixed' },
                    head_row: { width: '100%' },
                    head_cell: { color: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: '0.8rem', fontWeight: '600', paddingBottom: '0.25rem', textAlign: 'center' },
                    row: { width: '100%' },
                    cell: { padding: '0.1rem 0', textAlign: 'center' },
                    day: { margin: '0 auto', width: '100%', maxWidth: '3rem', height: '2.25rem', borderRadius: '0.5rem', fontSize: '0.9rem' },
                    caption: { color: theme === 'dark' ? '#f5f5f5' : '#111827', marginBottom: '0.5rem', fontSize: '1rem', textTransform: 'capitalize', paddingLeft: '0.5rem' },
                    nav_button: { color: theme === 'dark' ? '#f5f5f5' : '#111827', width: '1.75rem', height: '1.75rem' },
                    nav_icon: { width: '1rem', height: '1rem' }
                  }}
                  className="custom-day-picker"
                />
              </div>

              {/* Selected Day Reminders Section */}
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {isToday(currentDate) ? "Today's" : format(currentDate, 'MMMM d')} Reminders
                </h2>

                {/* Festival Banner */}
                {activeFestival && (
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-red-900/30 rounded-full shadow-sm">
                      <span className="text-2xl">🎉</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-red-700 dark:text-red-400">{activeFestival.name}</h3>
                      <p className="text-sm text-red-600/80 dark:text-red-400/70">Enjoy the festivities!</p>
                    </div>
                  </div>
                )}
                <div className="w-full">
                  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#333] shadow-sm bg-white dark:bg-[#1f1f1f]">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 dark:bg-[#292929]/50 border-b border-gray-200 dark:border-[#333]">
                          <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[25%]">Task Name</th>
                          <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[35%]">Description</th>
                          <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[15%]">Status</th>
                          <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] text-center">Edit</th>
                          <th className="py-4 px-6 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[10%] text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-[#333]">
                        {tasks.filter(t => t.date === format(currentDate, 'yyyy-MM-dd') && !t.completed).length > 0 ? (
                          tasks.filter(t => t.date === format(currentDate, 'yyyy-MM-dd') && !t.completed)
                            .sort((a, b) => a.time!.localeCompare(b.time!))
                            .map(task => {
                              // Determine Status
                              const isOverdue = !task.completed && new Date(`${task.date}T${task.time}`) < new Date();
                              const status = task.completed ? 'Completed' : isOverdue ? 'Overdue' : 'Pending';
                              const statusColor = task.completed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                isOverdue ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

                              return (
                                <tr key={task.id} className="group hover:bg-gray-50 dark:hover:bg-[#292929]/50 transition-colors">
                                  {/* Task Name & Time */}
                                  <td className="py-4 px-6 align-top">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-900 dark:text-white group-hover:text-[#e0b596] transition-colors cursor-pointer" onClick={() => { setOpenInEditMode(false); setSelectedTask(task); }}>
                                        {task.title}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        {task.time ? format(parse(task.time, 'HH:mm', new Date()), 'h:mm a') : '--:--'}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Description */}
                                  <td className="py-4 px-6 align-top">
                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                      {task.description ? task.description.replace(/<!-- metadata: .*? -->/g, '').trim() || '-' : '-'}
                                    </p>
                                  </td>

                                  {/* Status */}
                                  <td className="py-4 px-6 align-top">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                      {status}
                                    </span>
                                  </td>

                                  {/* Edit */}
                                  <td className="py-4 px-6 align-top text-center">
                                    <button
                                      onClick={() => {
                                        setOpenInEditMode(true);
                                        setSelectedTask(task);
                                      }}
                                      className="p-2 text-gray-400 hover:text-[#e0b596] hover:bg-[#e0b596]/10 rounded-lg transition-all"
                                      title="Edit Task"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </td>

                                  {/* Delete */}
                                  <td className="py-4 px-6 align-top text-center">
                                    <button
                                      onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this reminder?')) {
                                          onDeleteTask(task.id);
                                          toast.success('Reminder deleted');
                                        }
                                      }}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                      title="Delete Task"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-gray-500 dark:text-gray-400">
                              No reminders found for {isToday(currentDate) ? 'today' : format(currentDate, 'MMMM d')}.
                              <br />
                              <button onClick={() => setCreateModal({ isOpen: true, date: format(currentDate, 'yyyy-MM-dd') })} className="mt-2 text-[#e0b596] hover:underline text-sm font-medium">Create New Reminder</button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-0 bg-gray-50 dark:bg-[#1f1f1f]">
            {activeView === 'calendar' && (
              <div
                className="flex flex-col h-full bg-white dark:bg-[#1f1f1f]"
                ref={containerRef}
                onMouseDown={handleMouseDown}
              >
                {/* Calendar Grid Header */}
                <div className="flex bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-[#333] sticky top-0 z-30">
                  <div className="w-[60px] flex-shrink-0 border-r border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#252525]" />
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${weekDays.length}, 1fr)` }}>
                    {weekDays.map((day, i) => (
                      <div
                        key={i}
                        className={`py-3 text-center border-r border-gray-200 dark:border-[#333] last:border-r-0 ${isSameDay(day, new Date()) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      >
                        <div className={`text-xs font-semibold uppercase mb-1 ${isSameDay(day, new Date()) ? 'text-[#e0b596]' : 'text-gray-500 dark:text-gray-400'}`}>
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-xl font-bold w-8 h-8 flex items-center justify-center mx-auto rounded-full ${isSameDay(day, new Date()) ? 'bg-[#e0b596] text-white shadow-lg shadow-[#e0b596]/30' : 'text-gray-900 dark:text-white'}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar Grid Body */}
                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                  <div className="flex min-h-[1440px] relative">
                    {/* Time Column */}
                    <div className="w-[60px] flex-shrink-0 border-r border-gray-200 dark:border-[#333] bg-white dark:bg-[#1f1f1f] select-none text-right pr-2 pt-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="h-[60px] text-xs text-gray-400 font-medium relative -top-2.5">
                          {format(setHours(new Date(), i), 'h a')}
                        </div>
                      ))}
                    </div>

                    {/* Grid Columns */}
                    <div className="flex-1 grid relative bg-white dark:bg-[#1f1f1f]" style={{ gridTemplateColumns: `repeat(${weekDays.length}, 1fr)` }}>
                      {/* Current Time Indicator */}
                      {isToday(currentDate) && (
                        <div
                          className="absolute w-full z-10 pointer-events-none flex items-center"
                          style={{
                            top: (new Date().getHours() * 60 + new Date().getMinutes()) + 'px'
                          }}
                        >
                          <div className="w-[60px] text-right pr-2 text-red-500 text-xs font-bold leading-none">
                            {format(new Date(), 'h:mm a')}
                          </div>
                          <div className="flex-1 h-[2px] bg-red-500 relative">
                            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                          </div>
                        </div>
                      )}

                      {/* Grid Lines */}
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-full border-t border-gray-100 dark:border-[#333]"
                          style={{ top: i * 60, height: 60 }}
                        />
                      ))}

                      {/* Day Columns BG */}
                      {weekDays.map((_, i) => (
                        <div key={i} className="border-r border-gray-100 dark:border-[#333] last:border-r-0 h-full relative" />
                      ))}

                      {/* Events */}
                      {eventsForGrid.map((event, idx) => (
                        <div
                          key={event.id}
                          style={event.style}
                          className={`absolute px-1 py-0.5 z-10 group overflow-hidden transition-all duration-200`}
                        >
                          <div
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setActiveTaskId(event.id);
                              setDragStart({
                                x: 0,
                                y: 0,
                                time: event.start,
                                dayIndex: getDayIndexFromX(e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - 60, (containerRef.current?.getBoundingClientRect().width || 0) - 60, weekDays.length)
                              });
                              setDragCurrent({
                                x: 0,
                                y: 0,
                                time: event.start,
                                dayIndex: getDayIndexFromX(e.clientX - (containerRef.current?.getBoundingClientRect().left || 0) - 60, (containerRef.current?.getBoundingClientRect().width || 0) - 60, weekDays.length)
                              });
                              setDragMode('move');
                            }}
                            className={`h-full w-full rounded-md border-l-4 p-1.5 text-xs cursor-pointer shadow-sm hover:shadow-md transition-shadow relative
                              ${event.completed ? 'bg-gray-100 border-gray-400 text-gray-500 dark:bg-[#333] dark:border-gray-500 dark:text-gray-400' :
                                event.category === 'Work' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:border-blue-500 dark:text-blue-300' :
                                  event.category === 'Personal' ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-500 dark:text-green-300' :
                                    'bg-purple-50 border-purple-500 text-purple-700 dark:bg-purple-900/20 dark:border-purple-500 dark:text-purple-300'}
                            `}
                          >
                            {/* Resize Handle */}
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 z-20"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setActiveTaskId(event.id);
                                setDragStart({ x: 0, y: 0, time: event.start, dayIndex: 0 }); // Day index doesn't matter for resize
                                setDragCurrent({ x: 0, y: 0, time: event.end, dayIndex: 0 });
                                setDragMode('resize');
                              }}
                            />

                            <div className="font-semibold truncate flex items-center gap-1">
                              {event.isSpecial && <Sparkles className="w-3 h-3 text-orange-500 shrink-0" />}
                              {event.title}
                            </div>
                            <div className="opacity-80 truncate text-[10px]">
                              {format(parse(event.time!, 'HH:mm', new Date()), 'h:mm a')} - {format(addMinutes(parse(event.time!, 'HH:mm', new Date()), event.duration || 60), 'h:mm a')}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-0.5 opacity-70 truncate mt-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Drag Preview (Create) */}
                      {dragMode === 'create' && dragStart && dragCurrent && (
                        <div
                          style={{
                            top: (Math.min(dragStart.time, dragCurrent.time) / 60) * HOUR_HEIGHT,
                            height: (Math.abs(dragCurrent.time - dragStart.time) / 60) * HOUR_HEIGHT || (30 / 60 * HOUR_HEIGHT),
                            left: `${(dragStart.dayIndex / weekDays.length) * 100}%`,
                            width: `${100 / weekDays.length}%`,
                            position: 'absolute'
                          }}
                          className="bg-[#e0b596]/30 border-2 border-[#e0b596] border-dashed rounded-md z-20 pointer-events-none"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'locations' && <NearbyLocations tasks={tasks.filter(t => !t.completed)} />}

            {(activeView === 'pending' || activeView === 'completed') && (
              <div className="max-w-4xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize flex items-center gap-3">
                  {activeView === 'pending' ? <Clock className="w-8 h-8 text-[#e0b596]" /> : <CheckCircle className="w-8 h-8 text-green-500" />}
                  {activeView} Tasks
                </h2>
                <div className="grid gap-4">
                  {tasks
                    .filter(t => activeView === 'pending' ? !t.completed : t.completed)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(task => (
                      <motion.div
                        layout
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-[#292929] p-4 rounded-xl border border-gray-200 dark:border-[#333] shadow-sm flex items-center justify-between group"
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-400 hover:border-[#e0b596]'}`}
                          >
                            {task.completed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                          </button>
                          <div>
                            <h3 className={`font-semibold text-lg ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{task.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                              <CalendarIcon className="w-3.5 h-3.5" /> {task.date} at {task.time}
                              {task.duration && <span className="text-xs bg-gray-100 dark:bg-black/30 px-2 py-0.5 rounded ml-2">{task.duration}m</span>}
                            </p>
                            {task.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{task.description.replace(/<!-- metadata: .*? -->/g, '').trim()}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setSelectedTask(task)} className="p-2 text-gray-400 hover:text-[#e0b596] hover:bg-gray-100 dark:hover:bg-[#333] rounded-lg">
                            <Settings className="w-4 h-4" /> {/* Edit Icon placeholder really */}
                          </button>
                          <button onClick={() => onDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  {tasks.filter(t => activeView === 'pending' ? !t.completed : t.completed).length === 0 && (
                    <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                      <p className="text-lg">No {activeView} tasks found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeView === 'specials' && (
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl">
                    <Sparkles className="w-8 h-8 text-orange-500 dark:text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Specials in the Day</h2>
                    <p className="text-gray-500 dark:text-gray-400">Discover festivals, holidays, and special moments.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Calendar Panel */}
                  <div className="lg:col-span-5 xl:col-span-4">
                    <div className="bg-white dark:bg-[#292929] rounded-2xl border border-gray-200 dark:border-[#333] p-6 shadow-sm">
                      <DayPicker
                        mode="single"
                        selected={currentDate}
                        onSelect={(date) => date && setCurrentDate(date)}
                        modifiers={{
                          special: (date) => allSpecials.some(f => f.date === format(date, 'yyyy-MM-dd'))
                        }}
                        modifiersStyles={{
                          special: { fontWeight: 'bold', color: '#f59e0b' },
                          selected: { backgroundColor: '#e0b596', color: 'white' },
                          today: { color: '#e0b596', fontWeight: 'bold' }
                        }}
                        styles={{
                          root: { width: '100%', margin: 0 },
                          months: { width: '100%' },
                          table: { width: '100%' },
                          day: { margin: '0 auto' },
                          nav_button: { color: theme === 'dark' ? '#f5f5f5' : '#111827' },
                          caption: { color: theme === 'dark' ? '#f5f5f5' : '#111827' },
                          head_cell: { color: theme === 'dark' ? '#9ca3af' : '#6b7280' }
                        }}
                        className="custom-day-picker w-full"
                      />
                    </div>
                  </div>

                  {/* Events List */}
                  <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-[#292929] rounded-2xl border border-gray-200 dark:border-[#333] p-8 min-h-[400px]">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        Events for {format(currentDate, 'MMMM d, yyyy')}
                      </h3>

                      {specialsForDate.length > 0 ? (
                        <div className="space-y-4">
                          {specialsForDate.map((event, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-[#1f1f1f] border border-gray-100 dark:border-[#333] hover:border-[#e0b596]/30 transition-colors">
                              <div className={`p-3 rounded-full ${event.type === 'religious' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' :
                                event.type === 'public' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                  event.type === 'seasonal' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                    'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                                }`}>
                                {event.type === 'birthday' ? <Gift className="w-5 h-5" /> :
                                  event.type === 'anniversary' ? <Gift className="w-5 h-5" /> :
                                    event.type === 'religious' ? <Moon className="w-5 h-5" /> :
                                      event.type === 'public' ? <Briefcase className="w-5 h-5" /> :
                                        <Sparkles className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-white">{event.name}</h4>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] capitalize text-gray-500 dark:text-gray-400">
                                  {event.type} Event
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 dark:text-gray-400">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-[#333] rounded-full flex items-center justify-center mb-4">
                            <CalendarIcon className="w-8 h-8 opacity-50" />
                          </div>
                          <p className="text-lg font-medium">No special events found for this day.</p>
                          <p className="text-sm mt-1">Select another date from the calendar to view specials.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render Modals */}
      <AnimatePresence>
        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidebar(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#1b1b1b] shadow-2xl p-6 lg:hidden flex flex-col border-r border-gray-200 dark:border-[#292929]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Menu</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#292929] rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex flex-col gap-2 space-y-1">
                <button
                  onClick={() => { setActiveView('home'); setShowSidebar(false); }}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'home' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>

                <button
                  onClick={() => {
                    setActiveView('calendar');
                    setShowSidebar(false);
                  }}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'calendar' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
                >
                  <CalendarIcon className="w-5 h-5" />
                  <span>Calendar</span>
                </button>

                <button
                  onClick={() => { setActiveView('specials'); setShowSidebar(false); }}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'specials' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Specials</span>
                </button>

                <button
                  onClick={() => { setActiveView('pending'); setShowSidebar(false); }}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'pending' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
                >
                  <Hourglass className="w-5 h-5" />
                  <span>Pending Tasks</span>
                </button>

                <button
                  onClick={() => { setActiveView('completed'); setShowSidebar(false); }}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all ${activeView === 'completed' ? 'bg-gray-100 dark:bg-[#292929] text-[#e0b596] font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50'}`}
                >
                  <Check className="w-5 h-5" />
                  <span>Completed</span>
                </button>
              </nav>

              <div className="mt-auto border-t border-gray-100 dark:border-[#292929] pt-6 space-y-2">
                <button
                  onClick={() => { toggleTheme(); }}
                  className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50 transition-all"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  onClick={() => { setShowSettings(true); setShowSidebar(false); }}
                  className="w-full flex items-center gap-4 p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#292929]/50 transition-all"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
        {createModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl h-[80vh]">
              <CreateReminder
                onCreateTask={(t) => {
                  onAddTask(t);
                  setCreateModal({ isOpen: false });
                }}
                initialDate={createModal.date}
                initialTime={createModal.time}
                initialDuration={createModal.duration}
                onClose={() => setCreateModal({ isOpen: false })}
              />
            </motion.div>
          </div>
        )}

        {selectedTask && (
          <TaskDetails
            task={selectedTask}
            initialEditMode={openInEditMode}
            onClose={() => { setSelectedTask(null); setOpenInEditMode(false); }}
            // Pass handlers...
            onToggleComplete={onToggleComplete}
            onDeleteTask={onDeleteTask}
            onUpdateTask={onUpdateTask}
          />
        )}

        {showSettings && (
          <SettingsPanel
            userEmail={userEmail}
            initialName={userName}
            onClose={() => setShowSettings(false)}
            onNotificationChange={() => { }}
            onUpdateUser={onUpdateUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
