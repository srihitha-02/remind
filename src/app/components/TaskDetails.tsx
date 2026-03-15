import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Tag, 
  MapPin, 
  Navigation, 
  Sparkles, 
  AlignLeft, 
  Repeat, 
  ChevronDown, 
  ChevronRight, 
  Info,
  CircleAlert
} from 'lucide-react';
import { Task } from '@/app/types';
import { format, parse, isSameDay, addMinutes, isBefore } from 'date-fns';
import { toast } from 'sonner';
import { DayPicker } from 'react-day-picker';

interface TaskDetailsProps {
  task: Task;
  tasks: Task[];
  onClose: () => void;
  onToggleComplete: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTask: (task: Task) => void;
  initialEditMode?: boolean;
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
                  <div key={h} className="h-8 flex items-center justify-center snap-center text-[12px] font-bold cursor-pointer" onClick={() => updateTime(h.toString(), mVal, pVal)}>
                    {h.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="text-[#e0b596] font-bold text-[12px]">:</div>
              <div ref={mRef} className="flex-1 h-full overflow-y-auto no-scrollbar snap-y snap-mandatory scroll-smooth py-8">
                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                  <div key={m} className="h-8 flex items-center justify-center snap-center text-[12px] font-bold cursor-pointer" onClick={() => updateTime(hVal, m.toString().padStart(2, '0'), pVal)}>
                    {m.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-0.5 ml-1">
                {['AM', 'PM'].map(p => (
                  <button key={p} type="button" onClick={() => updateTime(hVal, mVal, p)} className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${pVal === p ? 'bg-[#e0b596] text-white' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400'}`}>
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

export function TaskDetails({
  task,
  tasks,
  onClose,
  onToggleComplete,
  onDeleteTask,
  onUpdateTask,
  initialEditMode = false,
}: TaskDetailsProps) {

  const [isEditing, setIsEditing] = useState(initialEditMode);

  // Helper to parse metadata
  const parsedMetadata = (() => {
    const desc = task.description || '';
    const match = desc.match(/<!-- metadata: (.+) -->/);
    if (match) {
      try { return JSON.parse(match[1]); } catch (e) { return null; }
    }
    return null;
  })();

  const [title, setTitle] = useState(task.title);
  const [startDate, setStartDate] = useState(task.date);
  const [startTime, setStartTime] = useState(task.time || '12:00');
  const [endDate, setEndDate] = useState(parsedMetadata?.endDate || task.date);
  const [endTime, setEndTime] = useState(parsedMetadata?.endTime || '12:30');
  const [location, setLocation] = useState(parsedMetadata?.location || task.location || '');
  const [description, setDescription] = useState(task.description ? task.description.replace(/<!-- metadata: .+ -->/, '').trim() : '');
  const [repeat, setRepeat] = useState(parsedMetadata?.repeat || 'never');
  const [isSpecial, setIsSpecial] = useState(parsedMetadata?.isSpecial || false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setTitle(task.title);
      setStartDate(task.date);
      setStartTime(task.time || '12:00');
      setEndDate(parsedMetadata?.endDate || task.date);
      setEndTime(parsedMetadata?.endTime || '12:30');
      setLocation(parsedMetadata?.location || task.location || '');
      setDescription(task.description ? task.description.replace(/<!-- metadata: .+ -->/, '').trim() : '');
      setRepeat(parsedMetadata?.repeat || 'never');
      setIsSpecial(parsedMetadata?.isSpecial || false);
    }
  }, [isEditing, task, parsedMetadata]);

  const handleStartTimeChange = (newStartTime: string) => {
    const prevStart = parse(startTime, 'HH:mm', new Date());
    const prevEnd = parse(endTime, 'HH:mm', new Date());
    const duration = Math.max(30, (prevEnd.getTime() - prevStart.getTime()) / (1000 * 60));
    setStartTime(newStartTime);
    const nextStart = parse(newStartTime, 'HH:mm', new Date());
    setEndTime(format(addMinutes(nextStart, duration), 'HH:mm'));
  };

  const tasksForDay = tasks.filter(t => t.date === startDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col md:flex-row bg-white dark:bg-[#1b1b1b] text-gray-900 dark:text-[#f5f5f5] rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 dark:border-[#292929] max-w-2xl w-full mx-auto h-[85vh]"
      >
        <div className="flex-[1.5] flex flex-col p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {isEditing ? 'Edit Reminder' : 'Reminder Details'}
            </h2>
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#292929] rounded-full transition-colors">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          <div className="space-y-5">
            {isEditing ? (
              <input
                type="text"
                placeholder="What's the plan?"
                className="w-full bg-transparent text-3xl font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:ring-0 border-none p-0 selection:bg-[#e0b596]/30"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold leading-tight">{task.title}</h1>
                <div className="flex items-center gap-2">
                  <Badge className={`
                      ${task.category === 'Work' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      task.category === 'Personal' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'} border-none px-2 py-0.5
                    `}>
                    {task.category}
                  </Badge>
                  {isSpecial && (
                    <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-none px-2 py-0.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Special
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {/* Start Row */}
              <div className="flex items-center gap-2">
                <div className={`flex-[1.8] flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] ${!isEditing ? 'opacity-80' : ''}`}>
                  <CalendarIcon className="w-4 h-4 text-[#e0b596]" />
                  {isEditing ? (
                    <DatePicker value={startDate} onChange={(val) => { setStartDate(val); setEndDate(val); }} />
                  ) : (
                    <span className="text-[13px] font-semibold">{format(parse(startDate, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}</span>
                  )}
                </div>
                <div className={`flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] ${!isEditing ? 'opacity-80' : ''}`}>
                  <Clock className="w-4 h-4 text-[#e0b596]" />
                  {isEditing ? (
                    <TimePicker value={startTime} onChange={handleStartTimeChange} />
                  ) : (
                    <span className="text-[13px] font-semibold">{format(parse(startTime, 'HH:mm', new Date()), 'hh:mm a')}</span>
                  )}
                </div>
              </div>

              {/* End Row */}
              <div className="flex items-center gap-2">
                <div className="flex-[1.8] flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] opacity-50">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  {isEditing ? (
                    <DatePicker value={endDate} onChange={setEndDate} />
                  ) : (
                    <span className="text-[13px] font-semibold">{format(parse(endDate, 'yyyy-MM-dd', new Date()), 'dd-MM-yyyy')}</span>
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-[#252525] px-3 py-2 rounded-2xl border border-gray-100 dark:border-[#333] opacity-50">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {isEditing ? (
                    <TimePicker value={endTime} onChange={setEndTime} />
                  ) : (
                    <span className="text-[13px] font-semibold">{format(parse(endTime, 'HH:mm', new Date()), 'hh:mm a')}</span>
                  )}
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 bg-gray-50 dark:bg-[#252525] p-3.5 rounded-2xl border border-gray-100 dark:border-[#333] ${!isEditing ? 'opacity-80' : ''}`}>
              <MapPin className="w-5 h-5 text-[#e0b596]" />
              {isEditing ? (
                <input
                  type="text"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent text-sm font-medium focus:outline-none w-full placeholder:text-gray-400 dark:placeholder:text-gray-600"
                />
              ) : (
                <span className="text-sm font-medium">{location || 'No location'}</span>
              )}
            </div>

            {isEditing && (
              <button
                type="button"
                onClick={() => setShowMoreOptions(!showMoreOptions)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#e0b596] transition-colors"
              >
                {showMoreOptions ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                More options
              </button>
            )}

            <AnimatePresence>
              {(showMoreOptions || !isEditing) && (
                <motion.div
                  initial={isEditing ? { height: 0, opacity: 0 } : { height: 'auto', opacity: 1 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  {isEditing && (
                    <>
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
                      <div className="flex items-center gap-2 p-1">
                        <input
                          type="checkbox"
                          id="isSpecial"
                          checked={isSpecial}
                          onChange={(e) => setIsSpecial(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-[#e0b596] focus:ring-[#e0b596]"
                        />
                        <label htmlFor="isSpecial" className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                          Mark as Special
                        </label>
                      </div>
                    </>
                  )}
                  <div className={`flex items-start gap-2 bg-gray-50 dark:bg-[#252525] p-3.5 rounded-2xl border border-gray-100 dark:border-[#333] ${!isEditing ? 'opacity-80' : ''}`}>
                    <AlignLeft className="w-5 h-5 text-[#e0b596] mt-0.5" />
                    {isEditing ? (
                      <textarea
                        placeholder="Add notes..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-transparent text-sm font-medium focus:outline-none w-full min-h-[80px] resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      />
                    ) : (
                      <p className="text-sm font-medium whitespace-pre-wrap">{description || 'No notes'}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="pt-4 flex items-center justify-between mt-auto border-t border-gray-100 dark:border-[#292929]">
            {isEditing ? (
              <>
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="text-gray-400 text-sm font-bold hover:text-gray-600 dark:hover:text-white h-auto py-4 px-2">
                  Cancel
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => { onDeleteTask(task.id); onClose(); }}
                    className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-bold h-auto py-4 px-4 rounded-xl"
                  >
                    Delete
                  </Button>
                  <Button
                    onClick={() => {
                      const start = parse(`${startDate} ${startTime}`, 'yyyy-MM-dd HH:mm', new Date());
                      const end = parse(`${endDate} ${endTime}`, 'yyyy-MM-dd HH:mm', new Date());
                      const finalDuration = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
                      const metaData = JSON.stringify({ location, duration: finalDuration, repeat, endDate, endTime, isSpecial });
                      const finalDescription = description.trim() ? `${description.trim()}\n\n<!-- metadata: ${metaData} -->` : `<!-- metadata: ${metaData} -->`;

                      onUpdateTask({
                        ...task,
                        title,
                        description: finalDescription,
                        date: startDate,
                        time: startTime,
                        location,
                        duration: finalDuration
                      });
                      toast.success('Changes saved');
                      setIsEditing(false);
                      onClose();
                    }}
                    className="bg-[#e0b596] hover:bg-[#d4a37f] text-white text-sm font-bold px-8 py-4 h-auto rounded-2xl shadow-lg transition-all"
                  >
                    Save Changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={() => { onDeleteTask(task.id); onClose(); }}
                  className="text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-bold h-auto py-4 px-4 rounded-xl"
                >
                  Delete
                </Button>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => { onToggleComplete(task.id); onClose(); }}
                    className={`text-sm font-bold border-2 rounded-2xl h-auto py-4 px-6 transition-all ${task.completed ? 'text-green-500 border-green-500 hover:bg-green-50' : 'text-gray-400 border-gray-200 hover:border-[#e0b596]'}`}
                  >
                    {task.completed ? 'Completed' : 'Mark Done'}
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-[#e0b596] hover:bg-[#d4a37f] text-white text-sm font-bold px-8 py-4 h-auto rounded-2xl shadow-lg transition-all"
                  >
                    Edit Task
                  </Button>
                </div>
              </>
            )}
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
                {tasksForDay.map((t) => (
                  <div key={t.id} className="relative">
                    <div className={`absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1b1b1b] border-2 ${t.id === task.id ? 'border-[#e0b596] scale-125 ring-4 ring-[#e0b596]/10' : 'border-gray-300'}`} />
                    <div className="space-y-1">
                      <span className={`text-xs font-bold uppercase tracking-tighter ${t.id === task.id ? 'text-[#e0b596]' : 'text-gray-400'}`}>
                        {t.time ? format(parse(t.time, 'HH:mm', new Date()), 'h:mm a') : '--'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-base font-semibold leading-tight ${
                          t.id === task.id ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400'
                        } ${t.completed ? 'line-through opacity-50' : ''}`}>
                          {t.title}
                        </p>
                        {!t.completed && isBefore(parse(`${t.date} ${t.time || '00:00'}`, 'yyyy-MM-dd HH:mm', new Date()), new Date()) && (
                          <CircleAlert className="w-3.5 h-3.5 text-amber-500/80" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
      </motion.div>
    </motion.div>
  );
}


