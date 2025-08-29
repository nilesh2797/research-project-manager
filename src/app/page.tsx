'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Circle, 
  FileText, 
  Target, 
  BarChart3, 
  FlaskConical, 
  Lightbulb, 
  Link, 
  Edit3, 
  Save, 
  X,
  ArrowLeft,
  Upload,
  Download,
  Github,
  RefreshCw,
  Settings,
  ExternalLink,
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  TrendingUp,
  Coffee
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS

// Pomodoro Timer Hook
const usePomodoroTimer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isBreak, setIsBreak] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [dailyStats, setDailyStats] = useState({
    date: new Date().toDateString(),
    workTime: 0,
    breakTime: 0,
    sessions: 0,
    completedSessions: 0,
    projectBreakdown: {}
  });
  const [allTimeStats, setAllTimeStats] = useState({
    totalWorkTime: 0,
    totalBreakTime: 0,
    totalSessions: 0,
    projectBreakdown: {}
  });
  const [settings, setSettings] = useState({
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsUntilLongBreak: 4,
    soundEnabled: true
  });
  
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRvIAAABXQVZFZm10IAAAAAABAAEATD...'); // Simple beep sound
  }, []);

  // Load saved data
  useEffect(() => {
    const savedStats = localStorage.getItem('pomodoro-daily-stats');
    const savedAllTime = localStorage.getItem('pomodoro-all-time-stats');
    const savedSettings = localStorage.getItem('pomodoro-settings');
    const savedSession = localStorage.getItem('pomodoro-current-session');

    if (savedStats) {
      const stats = JSON.parse(savedStats);
      if (stats.date === new Date().toDateString()) {
        setDailyStats(stats);
      } else {
        // New day, reset daily stats
        const newStats = {
          date: new Date().toDateString(),
          workTime: 0,
          breakTime: 0,
          sessions: 0,
          completedSessions: 0
        };
        setDailyStats(newStats);
        localStorage.setItem('pomodoro-daily-stats', JSON.stringify(newStats));
      }
    }

    if (savedAllTime) {
      setAllTimeStats(JSON.parse(savedAllTime));
    }

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    if (savedSession) {
      const session = JSON.parse(savedSession);
      setCurrentSession(session);
      setIsBreak(session.isBreak);
      setTimeLeft(session.timeLeft);
    }
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('pomodoro-daily-stats', JSON.stringify(dailyStats));
  }, [dailyStats]);

  useEffect(() => {
    localStorage.setItem('pomodoro-all-time-stats', JSON.stringify(allTimeStats));
  }, [allTimeStats]);

  useEffect(() => {
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('pomodoro-current-session', JSON.stringify({
        ...currentSession,
        timeLeft,
        isBreak
      }));
    }
  }, [currentSession, timeLeft, isBreak]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const handleSessionComplete = () => {
    setIsRunning(false);
    
    if (settings.soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {}); // Ignore errors
    }

    const sessionTime = isBreak 
      ? (isBreak === 'long' ? settings.longBreak : settings.shortBreak) * 60
      : settings.workDuration * 60;

    // Update stats
    if (isBreak) {
      setDailyStats(prev => ({
        ...prev,
        breakTime: prev.breakTime + sessionTime
      }));
      setAllTimeStats(prev => ({
        ...prev,
        totalBreakTime: prev.totalBreakTime + sessionTime
      }));
    } else {
      const completedSessions = dailyStats.completedSessions + 1;

      setDailyStats(prev => {
        const newProjectBreakdown = { ...prev.projectBreakdown };
        if (currentSession?.projectId) {
          const key = `${currentSession.projectId}-${currentSession.projectName}`;
          newProjectBreakdown[key] = (newProjectBreakdown[key] || 0) + sessionTime;
        }
        
        return {
          ...prev,
          workTime: prev.workTime + sessionTime,
          completedSessions: prev.completedSessions + 1,
          projectBreakdown: newProjectBreakdown
        };
      });
      
      setAllTimeStats(prev => {
        const newProjectBreakdown = { ...prev.projectBreakdown };
        if (currentSession?.projectId) {
          const key = `${currentSession.projectId}-${currentSession.projectName}`;
          newProjectBreakdown[key] = (newProjectBreakdown[key] || 0) + sessionTime;
        }
        
        return {
          ...prev,
          totalWorkTime: prev.totalWorkTime + sessionTime,
          totalSessions: prev.totalSessions + 1,
          projectBreakdown: newProjectBreakdown
        };
      });

      // Determine next break type
      const nextBreakType = completedSessions % settings.sessionsUntilLongBreak === 0 ? 'long' : 'short';
      setIsBreak(nextBreakType);
      setTimeLeft((nextBreakType === 'long' ? settings.longBreak : settings.shortBreak) * 60);
      return;
    }

    // After break, go back to work
    setIsBreak(false);
    setTimeLeft(settings.workDuration * 60);
  };

  const startTimer = (projectId = null, projectName = null, taskId = null, taskName = null) => {
    if (!currentSession && !isBreak) {
      setCurrentSession({
        projectId,
        projectName,
        taskId,
        taskName,
        startTime: Date.now(),
        isBreak: false
      });
      setDailyStats(prev => ({
        ...prev,
        sessions: prev.sessions + 1
      }));
    }
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak 
      ? (isBreak === 'long' ? settings.longBreak : settings.shortBreak) * 60
      : settings.workDuration * 60);
    if (!isBreak) {
      setCurrentSession(null);
      localStorage.removeItem('pomodoro-current-session');
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(settings.workDuration * 60);
    setCurrentSession(null);
    localStorage.removeItem('pomodoro-current-session');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return {
    isRunning,
    timeLeft,
    isBreak,
    currentSession,
    dailyStats,
    allTimeStats,
    settings,
    setSettings,
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    formatTime,
    formatDuration
  };
};

// Pomodoro Widget Component (for headers)
const PomodoroWidget = ({ pomodoro, currentProject = null, onOpenFullView }) => {
  const { 
    isRunning, 
    timeLeft, 
    isBreak, 
    currentSession, 
    startTimer, 
    pauseTimer, 
    resetTimer,
    formatTime 
  } = pomodoro;

  const getBackgroundColor = () => {
    if (isBreak) return 'bg-blue-50 border-blue-200';
    if (isRunning) return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  };

  const getTextColor = () => {
    if (isBreak) return 'text-blue-700';
    if (isRunning) return 'text-red-700';
    return 'text-green-700';
  };

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${getBackgroundColor()} ${getTextColor()}`}>
      <Timer className="w-4 h-4" />
      <span className="font-mono text-sm font-medium">
        {formatTime(timeLeft)}
      </span>
      {isBreak && (
        <Coffee className="w-3 h-3" />
      )}
      <div className="flex items-center space-x-1">
        {!isRunning ? (
          <button
            onClick={() => startTimer(
              currentProject?.id,
              currentProject?.name,
              null,
              null
            )}
            className="p-1 hover:bg-white/50 rounded"
            title="Start Pomodoro"
          >
            <Play className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="p-1 hover:bg-white/50 rounded"
            title="Pause Pomodoro"
          >
            <Pause className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={resetTimer}
          className="p-1 hover:bg-white/50 rounded"
          title="Reset Pomodoro"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <button
          onClick={onOpenFullView}
          className="p-1 hover:bg-white/50 rounded"
          title="Open Pomodoro View"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// Full Pomodoro Page Component
const PomodoroPage = ({ pomodoro, projects, onBack }) => {
  const {
    isRunning,
    timeLeft,
    isBreak,
    currentSession,
    dailyStats,
    allTimeStats,
    settings,
    setSettings,
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    formatTime,
    formatDuration
  } = pomodoro;

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const getCircularProgress = () => {
    const total = isBreak 
      ? (isBreak === 'long' ? settings.longBreak : settings.shortBreak) * 60
      : settings.workDuration * 60;
    return ((total - timeLeft) / total) * 100;
  };

  const getAvailableTasks = () => {
    if (!selectedProject) return [];
    return selectedProject.todos?.filter(todo => !todo.done) || [];
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-600">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button onClick={onBack} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Pomodoro Timer</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowStats(true)}
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Stats</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Timer Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                {isBreak ? (isBreak === 'long' ? 'Long Break' : 'Short Break') : 'Work Session'}
              </h2>
              {currentSession && !isBreak && (
                <div className="text-sm text-gray-600">
                  <div>{currentSession.projectName || 'No project selected'}</div>
                  {currentSession.taskName && (
                    <div className="text-xs">Task: {currentSession.taskName}</div>
                  )}
                </div>
              )}
            </div>

            {/* Circular Progress */}
            <div className="relative w-48 h-48 mx-auto mb-8">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - getCircularProgress() / 100)}`}
                  className={`transition-all duration-1000 ${
                    isBreak ? 'text-blue-500' : isRunning ? 'text-red-500' : 'text-green-500'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-gray-900">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {isBreak ? 'Break Time' : 'Focus Time'}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              {!isRunning ? (
                <button
                  onClick={() => startTimer(
                    selectedProject?.id,
                    selectedProject?.name,
                    selectedTask?.id,
                    selectedTask?.name
                  )}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Play className="w-5 h-5" />
                  <span>Start</span>
                </button>
              ) : (
                <button
                  onClick={pauseTimer}
                  className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </button>
              )}
              <button
                onClick={stopTimer}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Square className="w-5 h-5" />
                <span>Stop</span>
              </button>
              <button
                onClick={resetTimer}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Task Selection & Stats */}
          <div className="space-y-6">
            {/* Task Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Selection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const project = projects.find(p => p.id === parseInt(e.target.value));
                      setSelectedProject(project);
                      setSelectedTask(null);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    disabled={isRunning && !isBreak}
                  >
                    <option value="">Select a project...</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name || 'Untitled Project'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task (Optional)
                    </label>
                    <select
                      value={selectedTask?.id || ''}
                      onChange={(e) => {
                        const task = getAvailableTasks().find(t => t.id === parseInt(e.target.value));
                        setSelectedTask(task);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      disabled={isRunning && !isBreak}
                    >
                      <option value="">No specific task</option>
                      {getAvailableTasks().map(task => (
                        <option key={task.id} value={task.id}>
                          {task.name || 'Untitled Task'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Progress</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(dailyStats.workTime)}
                  </div>
                  <div className="text-sm text-gray-600">Work Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dailyStats.completedSessions}
                  </div>
                  <div className="text-sm text-gray-600">Sessions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pomodoro Settings</h2>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={settings.workDuration}
                  onChange={(e) => setSettings({...settings, workDuration: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  min="1"
                  max="60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Break (minutes)
                </label>
                <input
                  type="number"
                  value={settings.shortBreak}
                  onChange={(e) => setSettings({...settings, shortBreak: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Long Break (minutes)
                </label>
                <input
                  type="number"
                  value={settings.longBreak}
                  onChange={(e) => setSettings({...settings, longBreak: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  min="1"
                  max="60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sessions until Long Break
                </label>
                <input
                  type="number"
                  value={settings.sessionsUntilLongBreak}
                  onChange={(e) => setSettings({...settings, sessionsUntilLongBreak: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  min="2"
                  max="10"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => setSettings({...settings, soundEnabled: e.target.checked})}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Enable sound notifications
                </label>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Time Tracking Statistics</h2>
              <button onClick={() => setShowStats(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* All Time Stats */}
              <div>
                <h3 className="text-md font-semibold mb-3">All Time</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {formatDuration(allTimeStats.totalWorkTime)}
                    </div>
                    <div className="text-sm text-gray-600">Total Work</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      {allTimeStats.totalSessions}
                    </div>
                    <div className="text-sm text-gray-600">Sessions</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-xl font-bold text-purple-600">
                      {formatDuration(allTimeStats.totalBreakTime)}
                    </div>
                    <div className="text-sm text-gray-600">Break Time</div>
                  </div>
                </div>
              </div>

              {/* Project Breakdown */}
              <div>
                <h3 className="text-md font-semibold mb-3">Project Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(allTimeStats.projectBreakdown).map(([projectKey, time]) => {
                    const [projectId, projectName] = projectKey.split('-');
                    return (
                      <div key={projectKey} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-medium">{projectName || 'Untitled Project'}</span>
                        <span className="text-green-600 font-semibold">{formatDuration(time)}</span>
                      </div>
                    );
                  })}
                  {Object.keys(allTimeStats.projectBreakdown).length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No project data yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Initial data structure
const initialProject = {
  id: Date.now(),
  name: '',
  priority: 'medium',
  urgency: 'medium',
  status: 'planning',
  description: '',
  createdDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  tags: [],
  todos: [],
  milestones: [],
  results: [],
  experimentLogs: [],
  brainstormingIdeas: '',
  coreLinks: '',
  notes: ''
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const statusColors = {
  planning: 'bg-gray-100 text-gray-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  'on-hold': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

function MLResearchManager() {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [activeTab, setActiveTab] = useState('todos');
  const [sortBy, setSortBy] = useState('priority');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [githubSettings, setGithubSettings] = useState({
    token: '',
    repo: '',
    filePath: 'ml-research-projects.json',
    autoSync: true, // Add auto-sync setting
    syncInterval: 5 // Sync every 5 minutes
  });

  // Add auto-sync state
  const [autoSyncTimer, setAutoSyncTimer] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Add Pomodoro states
  const [showPomodoroPage, setShowPomodoroPage] = useState(false);
  const pomodoro = usePomodoroTimer();

  // Add editing states
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editingExperimentId, setEditingExperimentId] = useState(null);

  // Add collapsed sections state
  const [collapsedSections, setCollapsedSections] = useState({});

  // Add sorting and searching states
  const [todoSort, setTodoSort] = useState('newest');
  const [todoSearch, setTodoSearch] = useState('');
  const [milestoneSort, setMilestoneSort] = useState('newest');
  const [milestoneSearch, setMilestoneSearch] = useState('');
  const [experimentSort, setExperimentSort] = useState('newest');
  const [experimentSearch, setExperimentSearch] = useState('');

  // Add state to track changes
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [lastSyncedData, setLastSyncedData] = useState(null);

  // Function to toggle section collapse
  const toggleSection = (paneId, sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [paneId]: {
        ...prev[paneId],
        [sectionId]: !prev[paneId]?.[sectionId]
      }
    }));
  };

  // Generate a unique ID for sections
  const generateSectionId = (text) => {
    return text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  };

  // Enhanced hierarchical markdown rendering with proper H1->H2->H3 nesting
  const renderMarkdownWithFolding = (content, paneId) => {
    if (!content) return <div className="text-gray-500 italic">No content yet...</div>;
    
    // Parse content into a hierarchical structure where H2s always belong to preceding H1
    const parseHierarchicalContent = (text) => {
      const lines = text.split('\n');
      const sections = [];
      let currentH1 = null;
      let currentH2 = null;
      let currentH3 = null;
      let contentBuffer = [];
      
      const flushContent = () => {
        if (contentBuffer.length > 0) {
          const content = contentBuffer.join('\n').trim();
          if (content) {
            if (currentH3) {
              currentH3.content.push({ type: 'content', text: content });
            } else if (currentH2) {
              currentH2.content.push({ type: 'content', text: content });
            } else if (currentH1) {
              currentH1.content.push({ type: 'content', text: content });
            } else {
              sections.push({ type: 'content', text: content });
            }
          }
          contentBuffer = [];
        }
      };
      
      lines.forEach(line => {
        const h1Match = line.match(/^# (.+)$/);
        const h2Match = line.match(/^## (.+)$/);
        const h3Match = line.match(/^### (.+)$/);
        
        if (h1Match) {
          flushContent();
          currentH2 = null;
          currentH3 = null;
          currentH1 = {
            type: 'h1',
            text: h1Match[1],
            id: generateSectionId(h1Match[1]),
            content: []
          };
          sections.push(currentH1);
        } else if (h2Match) {
          flushContent();
          currentH3 = null;
          currentH2 = {
            type: 'h2',
            text: h2Match[1],
            id: generateSectionId(h2Match[1]),
            content: []
          };
          if (currentH1) {
            currentH1.content.push(currentH2);
          } else {
            const implicitH1 = {
              type: 'h1',
              text: 'Content',
              id: generateSectionId('content'),
              content: [currentH2],
              isImplicit: true
            };
            sections.push(implicitH1);
            currentH1 = implicitH1;
          }
        } else if (h3Match) {
          flushContent();
          currentH3 = {
            type: 'h3',
            text: h3Match[1],
            id: generateSectionId(h3Match[1]),
            content: []
          };
          if (currentH2) {
            currentH2.content.push(currentH3);
          } else if (currentH1) {
            currentH1.content.push(currentH3);
          } else {
            const implicitH2 = {
              type: 'h2',
              text: 'Content',
              id: generateSectionId('content-h2'),
              content: [currentH3],
              isImplicit: true
            };
            const implicitH1 = {
              type: 'h1',
              text: 'Content',
              id: generateSectionId('content-h1'),
              content: [implicitH2],
              isImplicit: true
            };
            sections.push(implicitH1);
            currentH1 = implicitH1;
            currentH2 = implicitH2;
          }
        } else {
          contentBuffer.push(line);
        }
      });
      
      flushContent();
      return sections;
    };
    
    // Render a section with proper nesting and indentation
    const renderSection = (section, level = 0) => {
      if (section.type === 'content') {
        return (
          <div key={Math.random()} className="mb-3">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]} 
              rehypePlugins={[rehypeKatex]}
              components={createMarkdownComponents(paneId)}
            >
              {section.text}
            </ReactMarkdown>
          </div>
        );
      }
      
      const isCollapsed = collapsedSections[paneId]?.[section.id];
      const hasContent = section.content && section.content.length > 0;
      
      const headerClasses = {
        h1: 'text-2xl font-bold mt-6 mb-4',
        h2: 'text-xl font-semibold mt-5 mb-3',
        h3: 'text-lg font-medium mt-4 mb-2'
      };
      
      const indentClasses = {
        h1: '',
        h2: 'ml-4',
        h3: 'ml-8'
      };
      
      if (section.isImplicit) {
        return (
          <div key={section.id} className={`${indentClasses[section.type]}`}>
            {hasContent && (
              <div className="mt-2">
                {section.content.map((subsection, index) => renderSection(subsection, level + 1))}
              </div>
            )}
          </div>
        );
      }
      
      return (
        <div key={section.id} className={`${indentClasses[section.type]} mb-4`}>
          <button
            onClick={() => toggleSection(paneId, section.id)}
            className={`flex items-center space-x-2 ${headerClasses[section.type]} text-gray-900 hover:text-blue-600 transition-colors w-full text-left`}
          >
            {hasContent && (
              <span className={`transform transition-transform text-sm ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
                ▶
              </span>
            )}
            <span>{section.text}</span>
          </button>
          
          {hasContent && (
            <div className={`transition-all duration-300 overflow-hidden ${
              isCollapsed ? 'max-h-0 opacity-0' : 'max-h-none opacity-100'
            }`}>
              <div className="ml-6 mt-2">
                {section.content.map((subsection, index) => renderSection(subsection, level + 1))}
              </div>
            </div>
          )}
        </div>
      );
    };
    
    const sections = parseHierarchicalContent(content);
    
    return (
      <div className="prose prose-sm max-w-none">
        {sections.map((section, index) => renderSection(section))}
      </div>
    );
  };

  // Update the collapse functions to work with the new hierarchy
  const expandAllSections = (paneId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [paneId]: {}
    }));
  };

  const collapseAllSections = (paneId, content) => {
    const parseAllHeaders = (text) => {
      const headers = [];
      const lines = text.split('\n');
      
      lines.forEach(line => {
        const match = line.match(/^(#{1,3}) (.+)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          const id = generateSectionId(text);
          headers.push({ level, text, id });
        }
      });
      
      return headers;
    };
    
    const headers = parseAllHeaders(content);
    const newState = {};
    
    headers.forEach(header => {
      newState[header.id] = true;
    });
    
    setCollapsedSections(prev => ({
      ...prev,
      [paneId]: newState
    }));
  };

  // Add a function to collapse only H1 sections (which will collapse their H2s and H3s too)
  const collapseTopLevel = (paneId, content) => {
    const parseH1Headers = (text) => {
      const headers = [];
      const lines = text.split('\n');
      
      lines.forEach(line => {
        const h1Match = line.match(/^# (.+)$/);
        if (h1Match) {
          headers.push(generateSectionId(h1Match[1]));
        }
      });
      
      return headers;
    };
    
    const h1Headers = parseH1Headers(content);
    const newState = {};
    
    h1Headers.forEach(headerId => {
      newState[headerId] = true;
    });
    
    setCollapsedSections(prev => ({
      ...prev,
      [paneId]: newState
    }));
  };

  // Enhanced ReactMarkdown components with folding
  const createMarkdownComponents = (paneId) => ({
    h1: ({children}) => {
      const sectionId = generateSectionId(children.toString());
      const isCollapsed = collapsedSections[paneId]?.[sectionId];
      return (
        <div className="mb-4">
          <button
            onClick={() => toggleSection(paneId, sectionId)}
            className="flex items-center space-x-2 text-2xl font-bold mt-6 mb-4 text-gray-900 hover:text-blue-600 transition-colors w-full text-left"
          >
            <span className={`transform transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
              ▶
            </span>
            <span>{children}</span>
          </button>
        </div>
      );
    },
    h2: ({children}) => {
      const sectionId = generateSectionId(children.toString());
      const isCollapsed = collapsedSections[paneId]?.[sectionId];
      return (
        <div className="mb-3">
          <button
            onClick={() => toggleSection(paneId, sectionId)}
            className="flex items-center space-x-2 text-xl font-semibold mt-4 mb-3 text-gray-900 hover:text-blue-600 transition-colors w-full text-left"
          >
            <span className={`transform transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
              ▶
            </span>
            <span>{children}</span>
          </button>
        </div>
      );
    },
    h3: ({children}) => {
      const sectionId = generateSectionId(children.toString());
      const isCollapsed = collapsedSections[paneId]?.[sectionId];
      return (
        <div className="mb-2">
          <button
            onClick={() => toggleSection(paneId, sectionId)}
            className="flex items-center space-x-2 text-lg font-semibold mt-4 mb-2 text-gray-900 hover:text-blue-600 transition-colors w-full text-left"
          >
            <span className={`transform transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
              ▶
            </span>
            <span>{children}</span>
          </button>
        </div>
      );
    },
    // Wrap content in collapsible containers
    div: ({children, 'data-section': sectionId}) => {
      if (!sectionId) return <div>{children}</div>;
      const isCollapsed = collapsedSections[activeTab]?.[sectionId];
      return (
        <div className={`transition-all duration-200 overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-none'}`}>
          <div className="pb-4">
            {children}
          </div>
        </div>
      );
    },
    // ...other existing components...
    p: ({children}) => <p className="mb-3 text-gray-800">{children}</p>,
    a: ({href, children}) => (
      <a href={href} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
        {children} <span className="inline-block w-3 h-3">↗</span>
      </a>
    ),
    // ...rest of existing components...
    code: ({children, className}) => {
      const isInline = !className;
      return isInline ? (
        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-red-600">{children}</code>
      ) : (
        <code className={className}>{children}</code>
      );
    },
    pre: ({children}) => (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 overflow-x-auto">{children}</pre>
    ),
    ul: ({children}) => <ul className="list-disc ml-6 my-3">{children}</ul>,
    ol: ({children}) => <ol className="list-decimal ml-6 my-3">{children}</ol>,
    li: ({children}) => <li className="my-1">{children}</li>,
    blockquote: ({children}) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic text-gray-700">
        {children}
      </blockquote>
    ),
    table: ({children}) => (
      <table className="table-auto border-collapse border border-gray-300 my-4 w-full">{children}</table>
    ),
    th: ({children}) => (
      <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">{children}</th>
    ),
    td: ({children}) => (
      <td className="border border-gray-300 px-3 py-2">{children}</td>
    ),
  });

  // Complete the helper functions
  const getFilteredAndSortedTodos = () => {
    if (!currentProject?.todos) return [];
    
    let filtered = currentProject.todos.filter(todo => {
      if (!todoSearch) return true;
      return (
        todo.name.toLowerCase().includes(todoSearch.toLowerCase()) ||
        (todo.details && todo.details.toLowerCase().includes(todoSearch.toLowerCase())) ||
        (todo.result && todo.result.toLowerCase().includes(todoSearch.toLowerCase()))
      );
    });

    return filtered.sort((a, b) => {
      switch (todoSort) {
        case 'oldest':
          return a.id - b.id;
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'completed':
          return Number(a.done) - Number(b.done);
        case 'pending':
          return Number(b.done) - Number(a.done);
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'newest':
        default:
          return b.id - a.id;
      }
    });
  };

  const getFilteredAndSortedMilestones = () => {
    if (!currentProject?.milestones) return [];
    
    let filtered = currentProject.milestones.filter(milestone => {
      if (!milestoneSearch) return true;
      return (
        milestone.name.toLowerCase().includes(milestoneSearch.toLowerCase()) ||
        (milestone.description && milestone.description.toLowerCase().includes(milestoneSearch.toLowerCase()))
      );
    });

    return filtered.sort((a, b) => {
      switch (milestoneSort) {
        case 'oldest':
          return a.id - b.id;
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'completed':
          return Number(a.completed) - Number(b.completed);
        case 'pending':
          return Number(b.completed) - Number(a.completed);
        case 'date':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date) - new Date(b.date);
        case 'newest':
        default:
          return b.id - a.id;
      }
    });
  };

  const getFilteredAndSortedExperiments = () => {
    if (!currentProject?.experimentLogs) return [];
    
    let filtered = currentProject.experimentLogs.filter(exp => {
      if (!experimentSearch) return true;
      return (
        exp.name.toLowerCase().includes(experimentSearch.toLowerCase()) ||
        (exp.description && exp.description.toLowerCase().includes(experimentSearch.toLowerCase())) ||
        (exp.results && exp.results.toLowerCase().includes(experimentSearch.toLowerCase())) ||
        (exp.takeaways && exp.takeaways.toLowerCase().includes(experimentSearch.toLowerCase()))
      );
    });

    return filtered.sort((a, b) => {
      switch (experimentSort) {
        case 'oldest':
          return a.id - b.id;
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'date':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date) - new Date(b.date);
        case 'newest':
        default:
          return b.id - a.id;
      }
    });
  };

  const getNextMilestone = (project) => {
    const pendingMilestones = project.milestones.filter(m => !m.completed);
    
    if (pendingMilestones.length === 0) return null;
    
    return pendingMilestones.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date) - new Date(b.date);
      }
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return a.id - b.id;
    })[0];
  };

  // Project management functions
  const createProject = () => {
    const newProject = { ...initialProject, id: Date.now() };
    setProjects([...projects, newProject]);
    setCurrentProject(newProject);
    setIsEditing(true);
  };

  const updateProject = (updatedProject) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (currentProject?.id === updatedProject.id) {
      setCurrentProject(updatedProject);
    }
  };

  const deleteProject = (projectId) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
    }
  };

  const duplicateProject = (project) => {
    const duplicated = {
      ...project,
      id: Date.now(),
      name: `${project.name} (Copy)`,
      createdDate: new Date().toISOString().split('T')[0],
      status: 'planning'
    };
    setProjects([...projects, duplicated]);
  };

  // Todo management functions
  const addTodoToProject = (project) => {
    const newTodo = {
      id: Date.now(),
      name: '',
      done: false,
      details: '',
      dueDate: '',
      result: ''
    };
    const updated = {
      ...project,
      todos: [...(project.todos || []), newTodo]
    };
    updateProject(updated);
    setEditingTodoId(newTodo.id);
  };

  const addTodo = () => {
    if (!currentProject) return;
    addTodoToProject(currentProject);
  };

  const updateTodo = (todoId, updates) => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      todos: currentProject.todos.map(t => t.id === todoId ? { ...t, ...updates } : t)
    };
    updateProject(updated);
  };

  const deleteTodo = (todoId) => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      todos: currentProject.todos.filter(t => t.id !== todoId)
    };
    updateProject(updated);
    setEditingTodoId(null);
  };

  // Milestone management functions
  const addMilestone = () => {
    if (!currentProject) return;
    const newMilestone = {
      id: Date.now(),
      name: '',
      date: '',
      description: '',
      completed: false
    };
    const updated = {
      ...currentProject,
      milestones: [...(currentProject.milestones || []), newMilestone]
    };
    updateProject(updated);
    setEditingMilestoneId(newMilestone.id);
  };

  const updateMilestone = (milestoneId, updates) => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      milestones: currentProject.milestones.map(m => 
        m.id === milestoneId ? { ...m, ...updates } : m
      )
    };
    updateProject(updated);
  };

  const deleteMilestone = (milestoneId) => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      milestones: currentProject.milestones.filter(m => m.id !== milestoneId)
    };
    updateProject(updated);
    setEditingMilestoneId(null);
  };

  // Experiment management functions
  const addExperimentToProject = (project) => {
    const newExperiment = {
      id: Date.now(),
      name: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      results: '',
      takeaways: ''
    };
    const updated = {
      ...project,
      experimentLogs: [...(project.experimentLogs || []), newExperiment]
    };
    updateProject(updated);
    setEditingExperimentId(newExperiment.id);
  };

  const addExperiment = () => {
    if (!currentProject) return;
    addExperimentToProject(currentProject);
  };

  const updateExperiment = (expId, updates) => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      experimentLogs: currentProject.experimentLogs.map(e => 
        e.id === expId ? { ...e, ...updates } : e
      )
    };
    updateProject(updated);
  };

  const deleteExperiment = (expId) => {
    if (!currentProject) return;
    const updated = {
      ...currentProject,
      experimentLogs: currentProject.experimentLogs.filter(e => e.id !== expId)
    };
    updateProject(updated);
    setEditingExperimentId(null);
  };

  // Quick action handlers
  const handleQuickAddTodo = (e, project) => {
    e.stopPropagation();
    setCurrentProject(project);
    setIsEditing(false);
    setEditingMilestoneId(null);
    setEditingExperimentId(null);
    setActiveTab('todos');
    
    setTimeout(() => {
      addTodoToProject(project);
    }, 100);
  };

  const handleQuickAddExperiment = (e, project) => {
    e.stopPropagation();
    setCurrentProject(project);
    setIsEditing(false);
    setEditingTodoId(null);
    setEditingMilestoneId(null);
    setActiveTab('experiments');
    
    setTimeout(() => {
      addExperimentToProject(project);
    }, 100);
  };

  const handleQuickEditNotes = (e, project) => {
    e.stopPropagation();
    setCurrentProject(project);
    setEditingTodoId(null);
    setEditingMilestoneId(null);
    setEditingExperimentId(null);
    setActiveTab('notes');
    
    setTimeout(() => {
      setIsEditing(true);
    }, 100);
  };

  // Navigation functions
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setEditingTodoId(null);
      setEditingMilestoneId(null);
      setEditingExperimentId(null);
    }
  };

  const goBackToDashboard = () => {
    setCurrentProject(null);
    setIsEditing(false);
    setEditingTodoId(null);
    setEditingMilestoneId(null);
    setEditingExperimentId(null);
    setActiveTab('todos');
  };

  // Data persistence
  useEffect(() => {
    const savedProjects = localStorage.getItem('ml-research-projects');
    const savedGithubSettings = localStorage.getItem('github-settings');
    
    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
    
    if (savedGithubSettings) {
      setGithubSettings(JSON.parse(savedGithubSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ml-research-projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('github-settings', JSON.stringify(githubSettings));
  }, [githubSettings]);

  // Auto-sync effect - only sync when there are changes
  useEffect(() => {
    if (githubSettings.autoSync && githubSettings.token && githubSettings.repo) {
      // Clear existing timer
      if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
      }

      // Set up new timer
      const timer = setInterval(() => {
        // Only sync if there are unsynced changes
        if (hasUnsyncedChanges) {
          syncWithGitHub('push', true); // true indicates this is an auto-sync
        }
      }, githubSettings.syncInterval * 60 * 1000); // Convert minutes to milliseconds

      setAutoSyncTimer(timer);

      // Cleanup function
      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    } else {
      // Clear timer if auto-sync is disabled
      if (autoSyncTimer) {
        clearInterval(autoSyncTimer);
        setAutoSyncTimer(null);
      }
    }
  }, [githubSettings.autoSync, githubSettings.token, githubSettings.repo, githubSettings.syncInterval, hasUnsyncedChanges]);

  // Track changes to projects data
  useEffect(() => {
    if (lastSyncedData) {
      const currentDataStr = JSON.stringify(projects);
      const lastSyncedDataStr = JSON.stringify(lastSyncedData);
      setHasUnsyncedChanges(currentDataStr !== lastSyncedDataStr);
    } else {
      // If we don't have last synced data, assume there are changes
      setHasUnsyncedChanges(projects.length > 0);
    }
  }, [projects, lastSyncedData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setEditingTodoId(null);
        setEditingMilestoneId(null);
        setEditingExperimentId(null);
        setIsEditing(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const exportData = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'ml-research-projects.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedProjects = JSON.parse(e.target.result);
          setProjects(importedProjects);
          setSyncStatus('imported');
          setTimeout(() => setSyncStatus('idle'), 2000);
        } catch (error) {
          alert('Error importing data: Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  // GitHub API functions
  const githubAPI = {
    async getFile() {
      const response = await fetch(`https://api.github.com/repos/${githubSettings.repo}/contents/${githubSettings.filePath}`, {
        headers: {
          'Authorization': `token ${githubSettings.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.status === 404) {
        return null; // File doesn't exist yet
      }
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        content: JSON.parse(atob(data.content)),
        sha: data.sha
      };
    },

    async saveFile(content, sha = null) {
      const body = {
        message: `Update ML research projects - ${new Date().toISOString()}`,
        content: btoa(JSON.stringify(content, null, 2))
      };
      
      if (sha) {
        body.sha = sha;
      }
      
      const response = await fetch(`https://api.github.com/repos/${githubSettings.repo}/contents/${githubSettings.filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubSettings.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      return response.json();
    }
  };

  const syncWithGitHub = async (direction = 'push', isAutoSync = false) => {
    if (!githubSettings.token || !githubSettings.repo) {
      if (!isAutoSync) {
        alert('Please configure GitHub settings first');
        setShowSettings(true);
      }
      return;
    }

    // Don't show loading state for auto-sync to avoid UI flicker
    if (!isAutoSync) {
      setSyncStatus('syncing');
    }
    
    try {
      if (direction === 'pull') {
        const fileData = await githubAPI.getFile();
        if (fileData) {
          setProjects(fileData.content);
          setLastSyncedData(fileData.content); // Track what we just synced
          setHasUnsyncedChanges(false); // Reset change flag
          setSyncStatus('pulled');
          setLastSyncTime(new Date());
        } else {
          setSyncStatus('no-remote-file');
        }
      } else {
        // Push to GitHub
        const fileData = await githubAPI.getFile();
        await githubAPI.saveFile(projects, fileData?.sha);
        setLastSyncedData([...projects]); // Track what we just synced (deep copy)
        setHasUnsyncedChanges(false); // Reset change flag
        if (!isAutoSync) {
          setSyncStatus('pushed');
        }
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('GitHub sync error:', error);
      if (!isAutoSync) {
        setSyncStatus('error');
        alert(`GitHub sync failed: ${error.message}`);
      }
    }
    
    if (!isAutoSync) {
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const getFilteredAndSortedProjects = () => {
    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'urgency':
          const urgencyOrder = { high: 3, medium: 2, low: 1 };
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        case 'dueDate':
          return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  };

  const getTopTodos = (project) => {
    return project.todos
      .filter(todo => !todo.done)
      .sort((a, b) => {
        // Sort by due date first, then by creation order
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return a.id - b.id;
      })
      .slice(0, 3);
  };

  const getTodoBackgroundColor = (dueDate) => {
    if (!dueDate) return 'bg-gray-100 border-gray-300'; // Default gray for no due date
    
    const now = new Date();
    // Fix: Create date object that respects local timezone
    const due = new Date(dueDate + 'T23:59:59'); // Add time to prevent UTC interpretation
    const diffInHours = (due - now) / (1000 * 60 * 60); // Difference in hours
    const oneWeekInHours = 168; // 7 days = 168 hours
    
    // If overdue (red spectrum - more overdue = more intense red)
    if (diffInHours < 0) {
      const overdueHours = Math.abs(diffInHours);
      // Cap at 7 days (168 hours) for maximum intensity calculation
      const maxOverdueHours = 168;
      const intensity = Math.min(overdueHours / maxOverdueHours, 1);
      
      if (intensity > 0.7) {
        return 'bg-red-200 border-red-400'; // Very overdue (most intense)
      } else if (intensity > 0.5) {
        return 'bg-red-100 border-red-300'; // Quite overdue  
      } else if (intensity > 0.3) {
        return 'bg-red-100 border-red-300'; // Moderately overdue
      } else if (intensity > 0.1) {
        return 'bg-red-50 border-red-200'; // Slightly overdue
      } else {
        return 'bg-red-50 border-red-200'; // Just overdue (least intense)
      }
    }
    
    // If due more than a week away (gray)
    if (diffInHours > oneWeekInHours) {
      return 'bg-gray-100 border-gray-300';
    }
    
    // If due within a week (green spectrum - closer to now = more intense green)
    const weekProgress = 1 - (diffInHours / oneWeekInHours); // 0 to 1, where 1 is closest to now
    
    if (diffInHours <= 24) {
      return 'bg-green-300 border-green-500'; // Very close (most intense green)
    } else if (diffInHours <= 48) {
      return 'bg-green-200 border-green-400'; // Close
    } else if (diffInHours <= 72) {
      return 'bg-green-100 border-green-300'; // Moderately close
    } else if (diffInHours <= oneWeekInHours) {
      return 'bg-green-50 border-green-200'; // Somewhat close
    } else {
      return 'bg-green-50 border-green-100'; // Week away (lightest green)
    }
  };

  const getNextDueItem = (project) => {
    const dueTodos = project.todos.filter(t => !t.done && t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const dueMilestones = project.milestones.filter(m => !m.completed && m.date).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const nextTodo = dueTodos[0];
    const nextMilestone = dueMilestones[0];
    
    if (!nextTodo && !nextMilestone) return null;
    if (!nextTodo) return { type: 'milestone', ...nextMilestone };
    if (!nextMilestone) return { type: 'todo', ...nextTodo };
    
    return new Date(nextTodo.dueDate) < new Date(nextMilestone.date) 
      ? { type: 'todo', ...nextTodo }
      : { type: 'milestone', ...nextMilestone };
  };

// Settings Modal Component
const SettingsModal = () => {
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  const handleBackdropClick = () => {
    setShowSettings(false);
  };

  const handleInputFocus = (e) => {
    e.stopPropagation();
  };

  const handleInputChange = (field, value) => {
    setGithubSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        onClick={handleModalClick}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">GitHub Sync Settings</h2>
          <button onClick={() => setShowSettings(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              placeholder="ghp_..."
              value={githubSettings.token}
              onChange={(e) => handleInputChange('token', e.target.value)}
              onFocus={handleInputFocus}
              onClick={handleInputFocus}
              onMouseDown={handleInputFocus}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-600 mt-1">
              Create a token with 'repo' scope at GitHub → Settings → Developer settings
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Repository (username/repo-name)
            </label>
            <input
              type="text"
              placeholder="johndoe/ml-research-data"
              value={githubSettings.repo}
              onChange={(e) => handleInputChange('repo', e.target.value)}
              onFocus={handleInputFocus}
              onClick={handleInputFocus}
              onMouseDown={handleInputFocus}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              File Path
            </label>
            <input
              type="text"
              value={githubSettings.filePath}
              onChange={(e) => handleInputChange('filePath', e.target.value)}
              onFocus={handleInputFocus}
              onClick={handleInputFocus}
              onMouseDown={handleInputFocus}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          
          {/* Auto-sync settings */}
          <div className="border-t pt-4">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="autoSync"
                checked={githubSettings.autoSync}
                onChange={(e) => handleInputChange('autoSync', e.target.checked)}
                onFocus={handleInputFocus}
                onClick={handleInputFocus}
                className="mr-2"
              />
              <label htmlFor="autoSync" className="text-sm font-medium text-gray-900">
                Enable Auto-Sync
              </label>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Automatically sync changes to GitHub at regular intervals
            </p>
            
            {githubSettings.autoSync && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Sync Interval (minutes)
                </label>
                <select
                  value={githubSettings.syncInterval}
                  onChange={(e) => handleInputChange('syncInterval', parseInt(e.target.value))}
                  onFocus={handleInputFocus}
                  onClick={handleInputFocus}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>
            )}
            
            {lastSyncTime && (
              <div className="mt-3 text-xs text-gray-500">
                Last sync: {lastSyncTime.toLocaleString()}
              </div>
            )}
          </div>
          
          <div className="flex space-x-2 pt-4">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  // Show Pomodoro page if requested
  if (showPomodoroPage) {
    return (
      <PomodoroPage
        pomodoro={pomodoro}
        projects={projects}
        onBack={() => setShowPomodoroPage(false)}
      />
    );
  }

  // Show project detail view if a project is selected
  if (currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-500 border-gray-100">
        {/* Project Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 sticky">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goBackToDashboard}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentProject.name}
                    onChange={(e) => updateProject({ ...currentProject, name: e.target.value })}
                    className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none"
                    placeholder="Project Name"
                  />
                ) : (
                  <h1 className="text-xl font-bold text-gray-900">
                    {currentProject.name || 'Untitled Project'}
                  </h1>
                )}
                                {isEditing ? (
                  <select
                  value={currentProject.priority}
                  onChange={(e) => updateProject({ ...currentProject, priority: e.target.value })}
                  className="px-2 py-1 rounded text-xs border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  </select>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[currentProject.priority]}`}>
                  {currentProject.priority}
                  </span>
                )}
                {isEditing ? (
                  <select
                  value={currentProject.status}
                  onChange={(e) => updateProject({ ...currentProject, status: e.target.value })}
                  className="px-2 py-1 rounded text-xs border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                  <option value="planning">Planning</option>
                  <option value="in-progress">WIP</option>
                  <option value="on-hold">Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[currentProject.status]}`}>
                  {currentProject.status.replace('-', ' ')}
                  </span>
                )}
                
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importData}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="flex items-center space-x-1 px-3 h-7 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import</span>
                  </label>
                  <button
                    onClick={exportData}
                    className="flex items-center space-x-1 px-3 h-7 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <button
                    onClick={() => syncWithGitHub('pull')}
                    disabled={syncStatus === 'syncing'}
                    className="flex items-center space-x-1 px-3 h-7 py-1 text-sm bg-green-100 hover:bg-green-200 rounded disabled:opacity-50"
                    title="Pull from GitHub"
                  >
                    {syncStatus === 'syncing' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Pull</span>
                  </button>
                  <button
                    onClick={() => syncWithGitHub('push')}
                    disabled={syncStatus === 'syncing'}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded disabled:opacity-50 h-7"
                    title="Push to GitHub"
                  >
                    {syncStatus === 'syncing' ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Github className="w-4 h-4" />
                    )}
                    <span>
                      {syncStatus === 'syncing' ? 'Syncing...' : 
                        syncStatus === 'pushed' ? 'Pushed!' : 
                        syncStatus === 'pulled' ? 'Pulled!' :
                        syncStatus === 'error' ? 'Error!' :
                        syncStatus === 'no-remote-file' ? 'No file!' : 'Push'}
                    </span>
                  </button>
                </div>
                <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center space-x-1 px-3 h-7 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${currentProject.name || 'Untitled Project'}"?`)) {
                      deleteProject(currentProject.id);
                    }
                  }}
                  className="px-3 py-1 h-7 rounded bg-red-100 text-red-700 hover:bg-red-200"
                  title="Delete project"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleEditMode}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isEditing
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  {/* <span>{isEditing ? 'Save' : 'Edit'}</span> */}
                </button>
                {/* Pomodoro Widget */}
                <PomodoroWidget
                  pomodoro={pomodoro}
                  currentProject={currentProject}
                  onOpenFullView={() => setShowPomodoroPage(true)}
                />
            
              </div>
            </div>
          </div>
        </div>

        {/* Project Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Project Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Progress</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tasks:</span>
                  <span>{currentProject.todos?.filter(t => t.done).length || 0}/{currentProject.todos?.length || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${currentProject.todos?.length ? 
                        (currentProject.todos.filter(t => t.done).length / currentProject.todos.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Next Milestone</h3>
              </div>
              {(() => {
                const nextMilestone = getNextMilestone(currentProject);
                return nextMilestone ? (
                  <div>
                    <div className="text-sm font-medium">{nextMilestone.name}</div>
                    <div className="text-xs text-gray-500">
                      {nextMilestone.date ? new Date(nextMilestone.date).toLocaleDateString() : 'No date set'}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No upcoming milestones</div>
                );
              })()}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Timer className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-gray-900">Time Tracked</h3>
              </div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Today:</span> {pomodoro.formatDuration(
                    pomodoro.dailyStats.projectBreakdown[`${currentProject.id}-${currentProject.name}`] || 0
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Total: {pomodoro.formatDuration(
                    pomodoro.allTimeStats.projectBreakdown[`${currentProject.id}-${currentProject.name}`] || 0
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'todos', label: 'Tasks', icon: CheckCircle },
                  { id: 'milestones', label: 'Milestones', icon: Target },
                  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
                  { id: 'brainstorming', label: 'Ideas', icon: Lightbulb },
                  { id: 'links', label: 'Links', icon: Link },
                  { id: 'notes', label: 'Notes', icon: FileText }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'todos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">View Tasks</h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 h-7 py-1">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={todoSearch}
                          onChange={(e) => setTodoSearch(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-3 py-1 w-48 h-7"
                        />
                      </div>
                      <select
                        value={todoSort}
                        onChange={(e) => setTodoSort(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-3 py-1 h-7"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="alphabetical">Alphabetical</option>
                        <option value="completed">Completed First</option>
                        <option value="pending">Pending First</option>
                        <option value="dueDate">Due Date</option>
                      </select>
                      <button
                        onClick={addTodo}
                        className="flex items-center space-x-2 px-4 py-1 h-7 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        {/* <span>Add Task</span> */}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {getFilteredAndSortedTodos().map(todo => (
                      <div key={todo.id} className={`bg-gray-50 rounded-lg p-2 text-sm ${editingTodoId === todo.id ? "bg-gray-50" : getTodoBackgroundColor(todo.dueDate)}`}>
                        {editingTodoId === todo.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={todo.name}
                              onChange={(e) => updateTodo(todo.id, { name: e.target.value })}
                              placeholder="Task name..."
                              className="w-full border border-gray-200 rounded px-3 py-2 font-medium text-sm"
                              autoFocus
                            />
                            <textarea
                              value={todo.details}
                              onChange={(e) => updateTodo(todo.id, { details: e.target.value })}
                              placeholder="Task details..."
                              className="w-full border border-gray-200 rounded px-3 py-2 text-xs"
                              rows="3"
                            />
                            <div className="flex items-center space-x-4">
                              <input
                                type="date"
                                value={todo.dueDate}
                                onChange={(e) => updateTodo(todo.id, { dueDate: e.target.value })}
                                className="border border-gray-200 rounded px-3 py-2 text-xs"
                              />
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingTodoId(null)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => deleteTodo(todo.id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex items-start space-x-3 p-2 rounded-lg`}>
                            <button
                              onClick={() => updateTodo(todo.id, { done: !todo.done })}
                              className="mt-1"
                            >
                              {todo.done ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <Circle className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <div className="flex-1" onClick={() => setEditingTodoId(todo.id)}>
                              <div className={`font-medium text-sm cursor-pointer text-gray-700 ${todo.done ? 'line-through text-gray-700' : ''}`}>
                                {todo.name || 'Untitled Task'}
                              </div>
                              {todo.details && (
                                <div className="text-sm text-gray-600 mt-1">{todo.details}</div>
                              )}
                              {todo.dueDate && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Due: {new Date(todo.dueDate + 'T00:00:00').toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            {!todo.done && (
                              <button
                                onClick={() => pomodoro.startTimer(
                                  currentProject.id,
                                  currentProject.name,
                                  todo.id,
                                  todo.name
                                )}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                                title="Start Pomodoro for this task"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'milestones' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">View Milestones</h2>
                    <div className="flex items-center space-x-2 h-7 py-1">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search milestones..."
                          value={milestoneSearch}
                          onChange={(e) => setMilestoneSearch(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-3 py-1 h-7 w-48"
                        />
                      <select
                        value={milestoneSort}
                        onChange={(e) => setMilestoneSort(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-3 py-1 h-7"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="alphabetical">Alphabetical</option>
                        <option value="completed">Completed First</option>
                        <option value="pending">Pending First</option>
                        <option value="dueDate">Due Date</option>
                      </select>
                      <button
                      onClick={addMilestone}
                      className="flex items-center space-x-2 px-4 py-2 h-7 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      {/* <span>Add Milestone</span> */}
                    </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {getFilteredAndSortedMilestones().map(milestone => (
                      <div key={milestone.id} className={`bg-gray-50 rounded-lg p-2 text-sm ${editingTodoId === milestone.id ? "bg-gray-50" : getTodoBackgroundColor(milestone.date)}`}>
                        {editingMilestoneId === milestone.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={milestone.name}
                              onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })}
                              placeholder="Milestone name..."
                              className="w-full border border-gray-300 rounded px-3 py-2 font-medium"
                              autoFocus
                            />
                            <input
                              type="date"
                              value={milestone.date}
                              onChange={(e) => updateMilestone(milestone.id, { date: e.target.value })}
                              className="border border-gray-300 rounded px-3 py-2 text-sm"
                            />
                            <textarea
                              value={milestone.description}
                              onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })}
                              placeholder="Milestone description..."
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              rows="3"
                            />
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setEditingMilestoneId(null)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => deleteMilestone(milestone.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-3" onClick={() => setEditingMilestoneId(milestone.id)}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMilestone(milestone.id, { completed: !milestone.completed });
                              }}
                              className="mt-1"
                            >
                              {milestone.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <Target className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <div className="flex-1 cursor-pointer">
                              <div className={`font-medium text-gray-700 ${milestone.completed ? 'line-through text-gray-700' : ''}`}>
                                {milestone.name || 'Untitled Milestone'}
                              </div>
                              {milestone.date && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(milestone.date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {milestone.description && (
                                <div className="text-sm text-gray-600 mt-1">{milestone.description}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

                {activeTab === 'experiments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Experiment Logging</h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 h-7 py-1">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search experiments..."
                      value={experimentSearch}
                      onChange={(e) => setExperimentSearch(e.target.value)}
                      className="text-sm border border-gray-300 rounded px-3 py-1 w-48 h-7"
                    />
                    </div>
                    <select
                    value={experimentSort}
                    onChange={(e) => setExperimentSort(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-3 py-1 h-7"
                    >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="date">By Date</option>
                    </select>
                    <button
                    onClick={addExperiment}
                    className="flex items-center space-x-2 px-4 py-1 h-7 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                    <Plus className="w-4 h-4" />
                    {/* <span>Add Experiment</span> */}
                    </button>
                  </div>
                  </div>

                  <div className="space-y-4">
                  {getFilteredAndSortedExperiments().map(exp => (
                    <div key={exp.id} className="bg-gray-50 rounded-lg p-2 text-sm border border-gray-200">
                    {editingExperimentId === exp.id ? (
                      <div className="space-y-3">
                      <input
                        type="text"
                        value={exp.name}
                        onChange={(e) => updateExperiment(exp.id, { name: e.target.value })}
                        placeholder="Experiment name..."
                        className="w-full border border-gray-300 rounded px-3 py-2 font-medium"
                        autoFocus
                      />
                      <input
                        type="date"
                        value={exp.date}
                        onChange={(e) => updateExperiment(exp.id, { date: e.target.value })}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <textarea
                        value={exp.description}
                        onChange={(e) => updateExperiment(exp.id, { description: e.target.value })}
                        placeholder="Experiment description..."
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        rows="3"
                      />
                      <textarea
                        value={exp.results}
                        onChange={(e) => updateExperiment(exp.id, { results: e.target.value })}
                        placeholder="Results..."
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        rows="3"
                      />
                      <textarea
                        value={exp.takeaways}
                        onChange={(e) => updateExperiment(exp.id, { takeaways: e.target.value })}
                        placeholder="Key takeaways..."
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        rows="2"
                      />
                      <div className="flex items-center space-x-2">
                        <button
                        onClick={() => setEditingExperimentId(null)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                        Save
                        </button>
                        <button
                        onClick={() => deleteExperiment(exp.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                        Delete
                        </button>
                      </div>
                      </div>
                    ) : (
                      <div className="cursor-pointer" onClick={() => setEditingExperimentId(exp.id)}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{exp.name || 'Untitled Experiment'}</h3>
                        <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(exp.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {exp.description && (
                        <div className="text-sm text-gray-600 mb-2">{exp.description}</div>
                      )}
                      {exp.results && (
                        <div className="text-sm mb-2">
                        <span className="font-medium text-gray-700">Results:</span> {exp.results}
                        </div>
                      )}
                      {exp.takeaways && (
                        <div className="text-sm">
                        <span className="font-medium text-gray-700">Takeaways:</span> {exp.takeaways}
                        </div>
                      )}
                      </div>
                    )}
                    </div>
                  ))}
                  </div>
                </div>
                )}

          {(activeTab === 'brainstorming' || activeTab === 'links' || activeTab === 'notes') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                {/* <h2 className="text-lg font-medium">
                  {activeTab === 'brainstorming' ? 'Brainstorming Ideas' :
                  activeTab === 'links' ? 'Core Links' : 'Notes'}
                </h2> */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const content = activeTab === 'brainstorming' ? currentProject.brainstormingIdeas :
                                     activeTab === 'links' ? currentProject.coreLinks : currentProject.notes;
                      collapseAllSections(activeTab, content);
                    }}
                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Collapse All
                  </button>
                  <button
                    onClick={() => expandAllSections(activeTab)}
                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Expand All
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                {isEditing ? (
                  <div className="editable-area">
                    <textarea
                      value={activeTab === 'brainstorming' ? currentProject.brainstormingIdeas :
                            activeTab === 'links' ? currentProject.coreLinks : currentProject.notes}
                      onChange={(e) => updateProject({
                        ...currentProject,
                        [activeTab === 'brainstorming' ? 'brainstormingIdeas' :
                        activeTab === 'links' ? 'coreLinks' : 'notes']: e.target.value
                      })}
                      placeholder={`Enter your ${activeTab === 'brainstorming' ? 'ideas' :
                                  activeTab === 'links' ? 'links' : 'notes'} here... (Markdown supported)

# Main Topic
Your content here...

## Subtopic 
More details...

### Sub-subtopic
Even more details...

Press ESC to exit edit mode`}
                      className="w-full border border-gray-300 rounded px-4 py-3 font-mono text-sm resize-y"
                      rows="20"
                      style={{ minHeight: '500px' }}
                      autoFocus
                    />
                    <div className="mt-3 flex justify-between items-center text-sm text-gray-600">
                      <span>Tip: Press ESC to exit edit mode, double-click to re-enter</span>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center space-x-1"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onDoubleClick={() => setIsEditing(true)}
                    className="cursor-pointer hover:bg-gray-50 rounded p-2 -m-2 min-h-[500px] transition-colors"
                  >
                    {renderMarkdownWithFolding(
                      activeTab === 'brainstorming' ? currentProject.brainstormingIdeas :
                      activeTab === 'links' ? currentProject.coreLinks : currentProject.notes,
                      activeTab
                    )}
                    {!(activeTab === 'brainstorming' ? currentProject.brainstormingIdeas :
                       activeTab === 'links' ? currentProject.coreLinks : currentProject.notes) && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                        <FileText className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg mb-2">No content yet</p>
                        <p className="text-sm">Double-click here to start writing...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
        {showSettings && <SettingsModal />}
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gray-50 text-gray-600">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Project Manager</h1>
            </div>    
            <div className="flex items-center space-x-4 h-7">
              <button
                onClick={createProject}
                className="flex items-center space-x-2 px-4 py-3 h-7 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                {/* <span>New Project</span> */}
              </button>
              {/* Sync Controls */}
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded cursor-pointer h-7"
              >
                <Upload className="w-4 h-4" />
                <span>Import</span>
              </label>
              <button
                onClick={exportData}
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded h-7"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => syncWithGitHub('pull')}
                disabled={syncStatus === 'syncing'}
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-green-100 hover:bg-green-200 rounded disabled:opacity-50 h-7"
                title="Pull from GitHub"
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Pull</span>
              </button>
              <button
                onClick={() => syncWithGitHub('push')}
                disabled={syncStatus === 'syncing'}
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-100 hover:bg-blue-200 rounded disabled:opacity-50 h-7"
                title="Push to GitHub"
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                <span>
                  {syncStatus === 'syncing' ? 'Syncing...' : 
                  syncStatus === 'pushed' ? 'Pushed!' : 
                  syncStatus === 'pulled' ? 'Pulled!' :
                  syncStatus === 'error' ? 'Error!' :
                  syncStatus === 'no-remote-file' ? 'No file!' : 'Push'}
                </span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded h-7"
              >
                <Settings className="w-4 h-4" />
              </button>
              {/* Auto-sync indicator */}
              {githubSettings.autoSync && githubSettings.token && githubSettings.repo && (
                <div className={`flex items-center space-x-1 px-2 py-1 border rounded text-xs ${
                  hasUnsyncedChanges 
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700' 
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    hasUnsyncedChanges 
                      ? 'bg-yellow-500 animate-pulse' 
                      : 'bg-green-500'
                  }`}></div>
                  <span>
                    {hasUnsyncedChanges ? 'Changes pending' : 'Auto-sync active'}
                  </span>
                </div>
              )}
              {/* Pomodoro Widget */}
              <PomodoroWidget
                pomodoro={pomodoro}
                onOpenFullView={() => setShowPomodoroPage(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6 h-9">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-full pl-10 pr-4 py-2 border border-gray-300 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border h-9 text-sm border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="in-progress">WIP</option>
            <option value="on-hold">Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border h-9 text-sm border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="created">Recently Created</option>
            <option value="name">Name</option>
            <option value="priority">Priority</option>
            <option value="urgency">Urgency</option>
            <option value="status">Status</option>
            <option value="dueDate">Due Date</option>
          </select>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
          {getFilteredAndSortedProjects().map(project => (
            <div
              key={project.id}
              onClick={() => setCurrentProject(project)}
              className="bg-white rounded-lg shadow-sm border border-gray-300 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {project.name || 'Untitled Project'}
            </h3>
            <div className="flex items-center space-x-1 ml-2">
            <div className="text-xs text-gray-500 bg-purple-50 px-2 py-1 rounded-full border border-purple-200">
              {pomodoro.formatDuration(
                pomodoro.allTimeStats.projectBreakdown[`${project.id}-${project.name}`] || 0
              )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[project.priority]}`}>
              {project.priority}
              </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
              {project.status.replace('-', ' ')}
            </span>
            {project.dueDate && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            </div>
          </div>

          {project.description && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {project.description}
            </p>
          )}

                    {/* Next Milestone */}
                    <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Target className="w-4 h-4 mr-1" />
            <span>Milestones ({project.milestones?.filter(t => t.completed).length || 0}/{project.milestones?.length || 0})</span>
            </h4>
            {(() => {
              const nextMilestone = getNextMilestone(project);
              return nextMilestone ? (
                <div className="flex items-center text-xs bg-yellow-50 border border-yellow-200 rounded-lg p-3 py-2 mb-2">
            <span className="truncate flex-1">{nextMilestone.name}</span>
            {nextMilestone.date && (
              <span className="ml-2 text-gray-400 flex-shrink-0">
                {new Date(nextMilestone.date).toLocaleDateString()}
              </span>
            )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No upcoming milestones</p>
              );
            })()}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${project.milestones?.length ? 
            (project.milestones.filter(t => t.completed).length / project.milestones.length) * 100 : 0}%`
              }}
            />
          </div>

          {/* Top 3 Todos */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Top Tasks ({project.todos?.filter(t => t.done).length || 0}/{project.todos?.length || 0})
            </h4>
            {getTopTodos(project).length > 0 ? (
              <div className="space-y-1">
              {getTopTodos(project).map(todo => (
              <div key={todo.id} className={`flex items-center text-xs rounded-lg p-3 py-2 mb-2 ${getTodoBackgroundColor(todo.dueDate)}`}>
                <span className="truncate flex-1">{todo.name || 'Untitled Task'}</span>
                {todo.dueDate && (
                  <span className="ml-2 text-gray-400 flex-shrink-0">
                    {new Date(todo.dueDate + 'T00:00:00').toLocaleDateString()}
                  </span>
                )}
              </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No pending tasks</p>
            )}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${project.todos?.length ? 
            (project.todos.filter(t => t.done).length / project.todos.length) * 100 : 0}%`
              }}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => handleQuickAddTodo(e, project)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              title="Quick add task"
            >
              <Plus className="w-3 h-3" />
              <span>Task</span>
            </button>
            <button
              onClick={(e) => handleQuickAddExperiment(e, project)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
              title="Quick add experiment"
            >
              <FlaskConical className="w-3 h-3" />
              <span>Exp</span>
            </button>
            <button
              onClick={(e) => handleQuickEditNotes(e, project)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              title="Quick edit notes"
            >
              <Edit3 className="w-3 h-3" />
              <span>Notes</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                pomodoro.startTimer(project.id, project.name);
              }}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Start Pomodoro"
            >
              <Play className="w-3 h-3" />
              <span>Focus</span>
            </button>
          </div>
              </div>
            </div>
          ))}
        </div>

        {getFilteredAndSortedProjects().length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-4">
              {projects.length === 0 
                ? "Get started by creating your first research project."
                : "Try adjusting your search or filter criteria."
              }
            </p>
            {projects.length === 0 && (
              <button
                onClick={createProject}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Project</span>
              </button>
            )}
          </div>
        )}
      </div>
      {showSettings && <SettingsModal />}
      {showPomodoroPage && (
        <PomodoroPage
          pomodoro={pomodoro}
          onClose={() => setShowPomodoroPage(false)}
        />
      )}
    </div>
  );
}

export default MLResearchManager;