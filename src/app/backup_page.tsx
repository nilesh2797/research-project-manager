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
    completedSessions: 0
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
      setDailyStats(prev => ({
        ...prev,
        workTime: prev.workTime + sessionTime,
        completedSessions
      }));
      
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
    <div className="min-h-screen bg-gray-50">
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
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
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
            <div className="bg-white rounded-lg shadow-sm border p-6">
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
            <div className="bg-white rounded-lg shadow-sm border p-6">
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

// Simple markdown renderer
const renderMarkdown = (text) => {
  if (!text) return '';
  
  // Convert markdown to HTML
  let html = text
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // ...existing code...
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg my-2 overflow-x-auto"><code class="text-sm">$1</code></pre>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1 <span class="inline-block w-3 h-3">↗</span></a>')
    // Lists
    .replace(/^\* (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');
  
  // Wrap in paragraphs
  html = '<p class="mb-2">' + html + '</p>';
  
  // Wrap consecutive list items in ul tags
  html = html.replace(/(<li class="ml-4 list-disc">.*?<\/li>(?:\s*<li class="ml-4 list-disc">.*?<\/li>)*)/gs, '<ul class="my-2">$1</ul>');
  html = html.replace(/(<li class="ml-4 list-decimal">.*?<\/li>(?:\s*<li class="ml-4 list-decimal">.*?<\/li>)*)/gs, '<ol class="my-2">$1</ol>');
  
  return html;
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
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [githubSettings, setGithubSettings] = useState({
    token: '',
    repo: '',
    filePath: 'ml-research-projects.json'
  });

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
            currentH2 = null; // Reset H2 when we hit H1
            currentH3 = null; // Reset H3 when we hit H1
            currentH1 = {
              type: 'h1',
              text: h1Match[1],
              id: generateSectionId(h1Match[1]),
              content: []
            };
            sections.push(currentH1);
          } else if (h2Match) {
            flushContent();
            currentH3 = null; // Reset H3 when we hit H2
            currentH2 = {
              type: 'h2',
              text: h2Match[1],
              id: generateSectionId(h2Match[1]),
              content: []
            };
            // Always nest H2 under the most recent H1
            if (currentH1) {
              currentH1.content.push(currentH2);
            } else {
              // If no H1 exists, create an implicit one for orphaned H2s
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
            // H3 goes under H2 if available, otherwise under H1
            if (currentH2) {
              currentH2.content.push(currentH3);
            } else if (currentH1) {
              currentH1.content.push(currentH3);
            } else {
              // Create implicit hierarchy for orphaned H3
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={createMarkdownComponents(paneId)}>
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
        
        // Don't render implicit sections as headers
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

  // Filtering and sorting for dashboard
  const getFilteredProjects = () => {
    let filtered = projects.filter(project => {
      const matchesSearch = searchTerm === '' || 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'urgency':
          const urgencyOrder = { high: 3, medium: 2, low: 1 };
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        case 'status':
          return a.status.localeCompare(b.status);
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'created':
        default:
          return new Date(b.createdDate) - new Date(a.createdDate);
      }
    });
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
      <div className="min-h-screen bg-gray-50">
        {/* Project Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
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
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentProject.name || 'Untitled Project'}
                  </h1>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[currentProject.status]}`}>
                  {currentProject.status.replace('-', ' ')}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Pomodoro Widget */}
                <PomodoroWidget
                  pomodoro={pomodoro}
                  currentProject={currentProject}
                  onOpenFullView={() => setShowPomodoroPage(true)}
                />
                
                <button
                  onClick={toggleEditMode}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isEditing
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  <span>{isEditing ? 'Save' : 'Edit'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Project Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Project Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border p-4">
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

            <div className="bg-white rounded-lg shadow-sm border p-4">
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

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Timer className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium text-gray-900">Time Tracked</h3>
              </div>
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="font-medium">Today:</span> {pomodoro.formatDuration(pomodoro.dailyStats.workTime)}
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
          <div className="bg-white rounded-lg shadow-sm border mb-6">
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
                    <h2 className="text-lg font-medium text-gray-900">Tasks</h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tasks..."
                          value={todoSearch}
                          onChange={(e) => setTodoSearch(e.target.value)}
                          className="text-sm border border-gray-300 rounded px-3 py-1 w-48"
                        />
                      </div>
                      <select
                        value={todoSort}
                        onChange={(e) => setTodoSort(e.target.value)}
                        className="text-sm border border-gray-300 rounded px-3 py-1"
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
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {getFilteredAndSortedTodos().map(todo => (
                      <div key={todo.id} className="bg-gray-50 rounded-lg p-4 border">
                        {editingTodoId === todo.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={todo.name}
                              onChange={(e) => updateTodo(todo.id, { name: e.target.value })}
                              placeholder="Task name..."
                              className="w-full border border-gray-300 rounded px-3 py-2 font-medium"
                              autoFocus
                            />
                            <textarea
                              value={todo.details}
                              onChange={(e) => updateTodo(todo.id, { details: e.target.value })}
                              placeholder="Task details..."
                              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                              rows="3"
                            />
                            <div className="flex items-center space-x-4">
                              <input
                                type="date"
                                value={todo.dueDate}
                                onChange={(e) => updateTodo(todo.id, { dueDate: e.target.value })}
                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                              />
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingTodoId(null)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => deleteTodo(todo.id)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-3">
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
                              <div className={`font-medium cursor-pointer ${todo.done ? 'line-through text-gray-500' : ''}`}>
                                {todo.name || 'Untitled Task'}
                              </div>
                              {todo.details && (
                                <div className="text-sm text-gray-600 mt-1">{todo.details}</div>
                              )}
                              {todo.dueDate && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Due: {new Date(todo.dueDate).toLocaleDateString()}</span>
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
                    <h2 className="text-lg font-medium text-gray-900">Milestones</h2>
                    <button
                      onClick={addMilestone}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Milestone</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {getFilteredAndSortedMilestones().map(milestone => (
                      <div key={milestone.id} className="bg-gray-50 rounded-lg p-4 border">
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
                              <div className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
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
                    <h2 className="text-lg font-medium text-gray-900">Experiments</h2>
                    <button
                      onClick={addExperiment}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Experiment</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {getFilteredAndSortedExperiments().map(exp => (
                      <div key={exp.id} className="bg-gray-50 rounded-lg p-4 border">
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
                              <span className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString()}</span>
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

              {activeTab === 'brainstorming' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Brainstorming Ideas</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => expandAllSections('brainstorming')}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Expand All
                      </button>
                      <button
                        onClick={() => collapseTopLevel('brainstorming', currentProject.brainstormingIdeas || '')}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Collapse Sections
                      </button>
                    </div>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={currentProject.brainstormingIdeas}
                      onChange={(e) => updateProject({ ...currentProject, brainstormingIdeas: e.target.value })}
                      className="w-full h-96 border border-gray-300 rounded-lg p-4 font-mono text-sm"
                      placeholder="# Ideas and Brainstorming

## Core Concepts
- Idea 1
- Idea 2

## Future Directions
- Direction 1
- Direction 2"
                    />
                  ) : (
                    <div className="bg-white border rounded-lg p-6 min-h-[400px]">
                      {renderMarkdownWithFolding(currentProject.brainstormingIdeas, 'brainstorming')}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'links' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-medium text-gray-900">Core Links & References</h2>
                  {isEditing ? (
                    <textarea
                      value={currentProject.coreLinks}
                      onChange={(e) => updateProject({ ...currentProject, coreLinks: e.target.value })}
                      className="w-full h-64 border border-gray-300 rounded-lg p-4 font-mono text-sm"
                      placeholder="# Important Links

## Papers
- [Paper Title](https://example.com)

## Code Repositories
- [Repo Name](https://github.com/user/repo)

## Datasets
- [Dataset Name](https://example.com)"
                    />
                  ) : (
                    <div className="bg-white border rounded-lg p-6 min-h-[300px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={createMarkdownComponents('links')}>
                        {currentProject.coreLinks || 'No links added yet...'}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Project Notes</h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => expandAllSections('notes')}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Expand All
                      </button>
                      <button
                        onClick={() => collapseTopLevel('notes', currentProject.notes || '')}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        Collapse Sections
                      </button>
                    </div>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={currentProject.notes}
                      onChange={(e) => updateProject({ ...currentProject, notes: e.target.value })}
                      className="w-full h-96 border border-gray-300 rounded-lg p-4 font-mono text-sm"
                      placeholder="# Project Notes

## Overview
Write your project overview here...

## Technical Details
Document implementation details...

## Challenges
- Challenge 1
- Challenge 2"
                    />
                  ) : (
                    <div className="bg-white border rounded-lg p-6 min-h-[400px]">
                      {renderMarkdownWithFolding(currentProject.notes, 'notes')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">ML Research Manager</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Pomodoro Widget */}
              <PomodoroWidget
                pomodoro={pomodoro}
                onOpenFullView={() => setShowPomodoroPage(true)}
              />
              
              <button
                onClick={createProject}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="in-progress">In Progress</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredProjects().map(project => (
            <div
              key={project.id}
              onClick={() => setCurrentProject(project)}
              className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {project.name || 'Untitled Project'}
                  </h3>
                  <div className="flex items-center space-x-1 ml-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[project.priority]}`}>
                      {project.priority}
                    </span>
                  </div>
                </div>

                {project.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center justify-between mb-4">
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

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Tasks: {project.todos?.filter(t => t.done).length || 0}/{project.todos?.length || 0}</span>
                  <span>Experiments: {project.experimentLogs?.length || 0}</span>
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

        {getFilteredProjects().length === 0 && (
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
    </div>
  );
}

export default MLResearchManager;