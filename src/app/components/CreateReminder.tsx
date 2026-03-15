import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { format, parse, isSameDay, addMinutes, max, isBefore, subMinutes, startOfDay } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlignLeft,
  Repeat,
  X,
  ChevronDown,
  ChevronRight,
  Info,
  CircleAlert
} from 'lucide-react';
import { Task } from '@/app/types';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';

interface CreateReminderProps {
  tasks: Task[];
  onCreateTask: (task: Task) => void;
  initialDate?: string;
  initialTime?: string;
  initialDuration?: number;
  onClose?: () => void;
}

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function DatePicker({ value, onChange }: DatePickerProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const parsedDate = parse(value, 'yyyy-MM-dd', new Date());

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    if (show) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="w-full text-left text-[13px] font-semibold focus:outline-none hover:text-[#e0b596] transition-colors whitespace-nowrap bg-transparent"
      >
        {format(parsedDate, 'dd-MM-yyyy')}
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-1.5 p-1 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl z-50 min-w-max"
          >
            <DayPicker
              mode="single"
              selected={parsedDate}
              onSelect={(date) => {
                if (date) {
                  onChange(format(date, 'yyyy-MM-dd'));
                  setShow(false);
                }
              }}
              disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
              modifiers={{ today: new Date() }}
              modifiersStyles={{
                today: { border: '2px solid #e0b596', fontWeight: 'bold', borderRadius: '50%' },
                selected: { backgroundColor: '#e0b596', color: 'white' }
              }}
              className="!m-0 text-[12px] p-2 [&_.rdp-button]:h-6 [&_.rdp-button]:w-6 [&_.rdp-head_cell]:h-6 [&_.rdp-head_cell]:w-6 [&_.rdp-head_cell]:text-[10px] [&_.rdp-caption_label]:text-[13px] [&_.rdp-day]:text-[12px] [&_.rdp-day]:text-gray-900 dark:[&_.rdp-day]:text-gray-100 [&_.rdp-caption_label]:text-gray-900 dark:[&_.rdp-caption_label]:text-gray-100"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

function TimePicker({ value, onChange }: TimePickerProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);
  const mRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    if (show) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show]);

  useEffect(() => {
    if (show) {
      const h = parseInt(format(parse(value, 'HH:mm', new Date()), 'h'));
      const m = parseInt(format(parse(value, 'HH:mm', new Date()), 'mm'));
      if (hRef.current) hRef.current.scrollTop = (h - 1) * 32;
      if (mRef.current) mRef.current.scrollTop = m * 32;
    }
  }, [show, value]);

  const updateTime = (h: string, m: string, p: string) => {
    onChange(format(parse(`${h}:${m} ${p}`, 'h:mm a', new Date()), 'HH:mm'));
  };

  const currentTime = parse(value, 'HH:mm', new Date());
  const hVal = format(currentTime, 'h');
  const mVal = format(currentTime, 'mm');
  const pVal = format(currentTime, 'a');

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="w-full text-left text-[13px] font-semibold focus:outline-none hover:text-[#e0b596] transition-colors whitespace-nowrap"
      >
        {format(currentTime, 'hh:mm a')}
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#292929] border border-gray-200 dark:border-[#333] rounded-[1.5rem] shadow-2xl z-50 flex flex-col gap-1.5 min-w-[140px]"
          >
            <div className="flex items-center justify-center gap-1 h-24 relative">
              <div className="absolute inset-x-0.5 top-1/2 -translate-y-1/2 h-8 bg-[#e0b596]/10 rounded-lg pointer-events-none" />
              
              <div ref={hRef} className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory scroll-smooth py-8">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                  <div 
                    key={h} 
                    className="h-8 flex items-center justify-center snap-center text-[12px] font-bold cursor-pointer"
                    onClick={() => updateTime(h.toString(), mVal, pVal)}
                  >
                    {h.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>

              <div className="text-[#e0b596] font-bold text-[12px]">:</div>

              <div ref={mRef} className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory scroll-smooth py-8">
                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                  <div 
                    key={m} 
                    className="h-8 flex items-center justify-center snap-center text-[12px] font-bold cursor-pointer"
                    onClick={() => updateTime(hVal, m.toString().padStart(2, '0'), pVal)}
                  >
                    {m.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-0.5 ml-1">
                {['AM', 'PM'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateTime(hVal, mVal, p)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${pVal === p ? 'bg-[#e0b596] text-white shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setShow(false)} className="w-full py-1 h-7 text-[10px] font-bold rounded-lg bg-[#e0b596]/10 text-[#e0b596] hover:bg-[#e0b596]/20 border border-[#e0b596]/20 mt-1">
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CreateReminder({
  tasks,
  onCreateTask,
  initialDate,
  initialTime,
  initialDuration = 30,
  onClose
}: CreateReminderProps) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(() => {
    if (initialTime) return initialTime;
    const now = new Date();
    // Default to the next available 30-min slot if today, or current hour
    return format(addMinutes(now, 5), 'HH:mm');
  });
  
  const [endDate, setEndDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(() => {
    const start = parse(initialTime || format(addMinutes(new Date(), 5), 'HH:mm'), 'HH:mm', new Date());
    return format(addMinutes(start, initialDuration), 'HH:mm');
  });

  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [repeat, setRepeat] = useState('never');
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Sync End Time when Start Time changes
  const handleStartTimeChange = (newStartTime: string) => {
    const prevStart = parse(startTime, 'HH:mm', new Date());
    const prevEnd = parse(endTime, 'HH:mm', new Date());
    const duration = Math.max(30, (prevEnd.getTime() - prevStart.getTime()) / (1000 * 60));
    
    setStartTime(newStartTime);
    const nextStart = parse(newStartTime, 'HH:mm', new Date());
    setEndTime(format(addMinutes(nextStart, duration), 'HH:mm'));
  };

  const tasksForDay = tasks.filter(t => t.date === startDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Please enter a title');
      return;
    }

    const start = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const end = parse(`${endDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    if (isBefore(start, subMinutes(new Date(), 1))) {
      toast.error('Cannot create tasks in the past');
      return;
    }

    const finalDuration = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));

    const metaData = JSON.stringify({ location, duration: finalDuration, repeat, endDate, endTime });
    const finalDescription = description.trim() ? `${description.trim()}\n\n<!-- metadata: ${metaData} -->` : `<!-- metadata: ${metaData} -->`;

    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description: finalDescription,
      date: startDate,
      time: startTime,
      category: 'work',
      completed: false,
      createdAt: new Date().toISOString(),
      duration: finalDuration,
      location: location,
    };

    onCreateTask(newTask);
    toast.success('Event scheduled');
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col md:flex-row bg-white dark:bg-[#1b1b1b] text-gray-900 dark:text-[#f5f5f5] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 dark:border-[#292929] max-w-2xl w-full mx-auto h-full">
      <div className="flex-[1.5] flex flex-col p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Reminder</h2>
          <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#292929] rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          <input
            type="text"
            placeholder="What's the plan?"
            className="w-full bg-transparent text-3xl font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 border-none p-0 selection:bg-[#e0b596]/30"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <div className="space-y-2">
            {/* Start Row */}
            <div className="flex items-center gap-2">
              <div className="flex-[1.8] flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333]">
                <CalendarIcon className="w-4 h-4 text-[#e0b596]" />
                <DatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    setEndDate(val);
                  }}
                />
              </div>
              <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333]">
                <Clock className="w-4 h-4 text-[#e0b596]" />
                <TimePicker value={startTime} onChange={handleStartTimeChange} />
              </div>
            </div>

            {/* End Row */}
            <div className="flex items-center gap-2">
              <div className="flex-[1.8] flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333]">
                <CalendarIcon className="w-4 h-4 text-gray-400 opacity-50" />
                <div className="opacity-50 flex-1 flex">
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                  />
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333]">
                <Clock className="w-4 h-4 text-gray-400 opacity-50" />
                <TimePicker value={endTime} onChange={setEndTime} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#252525] p-3.5 rounded-2xl border border-gray-100 dark:border-[#333]">
            <MapPin className="w-5 h-5 text-[#e0b596]" />
            <input
              type="text"
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none w-full placeholder:text-gray-400 dark:placeholder:text-gray-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#e0b596] transition-colors"
          >
            {showMoreOptions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            More options
          </button>

          <AnimatePresence>
            {showMoreOptions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-2"
              >
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#252525] p-3.5 rounded-2xl border border-gray-100 dark:border-[#333]">
                  <Repeat className="w-5 h-5 text-[#e0b596]" />
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                    className="bg-transparent text-sm font-medium focus:outline-none w-full appearance-none cursor-pointer"
                  >
                    <option value="never">Does not repeat</option>
                    <option value="daily">Every day</option>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                  </select>
                </div>
                <div className="flex items-start gap-2 bg-gray-50 dark:bg-[#252525] p-3.5 rounded-2xl border border-gray-100 dark:border-[#333]">
                  <AlignLeft className="w-5 h-5 text-[#e0b596] mt-0.5" />
                  <textarea
                    placeholder="Add notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-transparent text-sm font-medium focus:outline-none w-full min-h-[80px] resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="pt-2 flex items-center justify-between mt-4">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 text-sm font-bold hover:text-gray-600 dark:hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#e0b596] hover:bg-[#d4a37f] text-white text-sm font-bold px-10 py-5 h-auto rounded-2xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            Create Task
          </Button>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-[240px] bg-gray-50 dark:bg-[#232323] border-l border-gray-200 dark:border-[#292929] flex-col">
        <div className="p-5 border-b border-gray-200 dark:border-[#292929] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs text-gray-500 uppercase tracking-widest">Schedule</h3>
            <span className="text-[10px] bg-[#e0b596]/10 text-[#e0b596] px-2 py-1 rounded-full font-bold">
              {format(parse(startDate, 'yyyy-MM-dd', new Date()), 'MMM d')}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white dark:hover:bg-[#333] rounded-md transition-colors text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {tasksForDay.length > 0 ? (
            <div className="relative pl-5 border-l-2 border-gray-200 dark:border-[#333] space-y-8">
              {tasksForDay.map((task) => (
                <div key={task.id} className="relative">
                  <div className="absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1b1b1b] border-2 border-[#e0b596]" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#e0b596] uppercase tracking-tighter">
                      {task.time ? format(parse(task.time, 'HH:mm', new Date()), 'h:mm a') : '--'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <p className={`text-base font-semibold leading-tight text-gray-800 dark:text-gray-200 ${task.completed ? 'line-through opacity-50' : ''}`}>
                        {task.title}
                      </p>
                      {!task.completed && isBefore(parse(`${task.date} ${task.time || '00:00'}`, 'yyyy-MM-dd HH:mm', new Date()), new Date()) && (
                        <CircleAlert className="w-3.5 h-3.5 text-amber-500/80" />
                      )}
                    </div>
                    {task.location && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {task.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSameDay(parse(startDate, 'yyyy-MM-dd', new Date()), new Date()) && (
                <div className="relative">
                  <div className="absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <span className="text-xs font-bold text-red-500 uppercase">Now</span>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="w-14 h-14 bg-gray-200 dark:bg-[#333] rounded-2xl flex items-center justify-center">
                <Info className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-400">No events scheduled<br />for this day.</p>
            </div>
          )}
        </div>
        <div className="p-5 bg-white dark:bg-[#1b1b1b] border-t border-gray-200 dark:border-[#292929]">
          <p className="text-xs text-gray-400 leading-tight">
            Reviewing your schedule helps you avoid conflicts and plan your day more effectively.
          </p>
        </div>
      </div>

      <style>{`
        /* Overrides if any */
      `}</style>
    </div>
  );
}
