'use client';

import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  // Add a new state for tracking which todo is being edited
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editingMilestoneId, setEditingMilestoneId] = useState(null);
  const [editingExperimentId, setEditingExperimentId] = useState(null);

  // Add a new state for tracking collapsed sections
  const [collapsedSections, setCollapsedSections] = useState({});

  // Add new state for sorting and searching within sections
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

  // Helper functions for filtering and sorting
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
        case 'newest':
          return b.id - a.id;
        case 'due-soon':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'due-far':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(b.dueDate) - new Date(a.dueDate);
        case 'completed':
          return b.done - a.done;
        case 'pending':
          return a.done - b.done;
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
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
        case 'newest':
          return b.id - a.id;
        case 'date-soon':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date) - new Date(b.date);
        case 'date-far':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date) - new Date(a.date);
        case 'completed':
          return b.completed - a.completed;
        case 'pending':
          return a.completed - b.completed;
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
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
        case 'newest':
          return b.id - a.id;
        case 'date-newest':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date) - new Date(a.date);
        case 'date-oldest':
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date) - new Date(b.date);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });
  };

  const getNextMilestone = (project) => {
    const pendingMilestones = project.milestones.filter(m => !m.completed);
    
    if (pendingMilestones.length === 0) return null;
    
    // Sort by date first (if available), then by creation order
    return pendingMilestones.sort((a, b) => {
      // If both have dates, sort by date
      if (a.date && b.date) {
        return new Date(a.date) - new Date(b.date);
      }
      // If only one has a date, prioritize it
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      // If neither has a date, sort by creation order (most recent first)
      return a.id - b.id;
    })[0];
  };
  
// ...existing code...

  // Update the quick action handlers to pass the project directly:
  const handleQuickAddTodo = (e, project) => {
    e.stopPropagation(); // Prevent opening the project
    setCurrentProject(project);
    setTimeout(() => {
      setActiveTab('todos');
      // Call addTodo with the project directly instead of relying on currentProject state
      addTodoToProject(project);
    }, 100);
  };

  const handleQuickAddExperiment = (e, project) => {
    e.stopPropagation();
    setCurrentProject(project);
    setTimeout(() => {
      setActiveTab('experiments');
      // Call addExperiment with the project directly
      addExperimentToProject(project);
    }, 100);
  };

  const handleQuickEditNotes = (e, project) => {
    e.stopPropagation();
    setCurrentProject(project);
    setTimeout(() => {
      setActiveTab('notes');
      setIsEditing(true);
    }, 100);
  };

  // Create new functions that accept a project parameter:
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
    setEditingTodoId(newTodo.id); // Start editing the new todo immediately
  };

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
    setEditingExperimentId(newExperiment.id); // Start editing the new experiment
  };

// Keep the original functions for use within the project view:
const addTodo = () => {
  if (!currentProject) return; // Add safety check
  addTodoToProject(currentProject);
};

const addExperiment = () => {
  if (!currentProject) return; // Add safety check
  addExperimentToProject(currentProject);
};

// Also add safety checks to other functions that depend on currentProject:
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
};

const updateExperiment = (expId, updates) => {
  if (!currentProject) return;
  const updated = {
    ...currentProject,
    experimentLogs: currentProject.experimentLogs.map(e => e.id === expId ? { ...e, ...updates } : e)
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
};

// Update milestone functions for consistency:
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
  setIsEditing(true); // Automatically enable edit mode
};

const updateMilestone = (milestoneId, updates) => {
  if (!currentProject) return;
  const updated = {
    ...currentProject,
    milestones: currentProject.milestones.map(m => m.id === milestoneId ? { ...m, ...updates } : m)
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
};


  // Load data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ml-research-projects');
    if (saved) {
      setProjects(JSON.parse(saved));
    }
    
    // Load GitHub settings from localStorage
    setGithubSettings({
      token: localStorage.getItem('github-token') || '',
      repo: localStorage.getItem('github-repo') || '',
      filePath: 'ml-research-projects.json'
    });
  }, []);

  // Save to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('ml-research-projects', JSON.stringify(projects));
  }, [projects]);

  // Save GitHub settings to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('github-token', githubSettings.token);
      localStorage.setItem('github-repo', githubSettings.repo);
    }
  }, [githubSettings]);

  // Add keyboard event handler for escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsEditing(false);
        setEditingTodoId(null);
        setEditingMilestoneId(null);
        setEditingExperimentId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Add click outside handler
  const handleClickOutside = (event) => {
    // Check if click is outside any editable area
    const isClickInsideEditableArea = event.target.closest('.editable-area') || 
                                     event.target.closest('textarea') || 
                                     event.target.closest('input') ||
                                     event.target.closest('button');
    
    if (!isClickInsideEditableArea) {
      setIsEditing(false);
      setEditingTodoId(null);
      setEditingMilestoneId(null);
      setEditingExperimentId(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const addProject = () => {
    const newProject = { ...initialProject, id: Date.now() };
    setProjects([...projects, newProject]);
    setCurrentProject(newProject);
    setIsEditing(true);
  };

  const updateProject = (updatedProject) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setCurrentProject(updatedProject);
  };

  const deleteProject = (id) => {
    setProjects(projects.filter(p => p.id !== id));
    if (currentProject && currentProject.id === id) {
      setCurrentProject(null);
    }
  };

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

  const syncWithGitHub = async (direction = 'push') => {
    if (!githubSettings.token || !githubSettings.repo) {
      alert('Please configure GitHub settings first');
      setShowSettings(true);
      return;
    }

    setSyncStatus('syncing');
    
    try {
      if (direction === 'pull') {
        const fileData = await githubAPI.getFile();
        if (fileData) {
          setProjects(fileData.content);
          setSyncStatus('pulled');
        } else {
          setSyncStatus('no-remote-file');
        }
      } else {
        // Push to GitHub
        const fileData = await githubAPI.getFile();
        await githubAPI.saveFile(projects, fileData?.sha);
        setSyncStatus('pushed');
      }
    } catch (error) {
      console.error('GitHub sync error:', error);
      setSyncStatus('error');
      alert(`GitHub sync failed: ${error.message}`);
    }
    
    setTimeout(() => setSyncStatus('idle'), 3000);
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
  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
              onChange={(e) => setGithubSettings({...githubSettings, token: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-900 mt-1">
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
              onChange={(e) => setGithubSettings({...githubSettings, repo: e.target.value})}
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
              onChange={(e) => setGithubSettings({...githubSettings, filePath: e.target.value})}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
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

  if (currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-700">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {setCurrentProject(null); setIsEditing(false);}}
                  className="text-gray-900 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentProject.name || 'Untitled Project'}
                </h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[currentProject.status]}`}>
                  {currentProject.status}
                </span>
              </div>
              <div className="flex items-center space-x-2">
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
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1 h-7 rounded ${isEditing ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                >
                  {isEditing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Project Header Info */}
        {isEditing && (
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Project Name</label>
                  <input
                    type="text"
                    value={currentProject.name}
                    onChange={(e) => updateProject({...currentProject, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Priority</label>
                  <select
                    value={currentProject.priority}
                    onChange={(e) => updateProject({...currentProject, priority: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Status</label>
                  <select
                    value={currentProject.status}
                    onChange={(e) => updateProject({...currentProject, status: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="planning">Planning</option>
                    <option value="in-progress">In Progress</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'todos', label: 'To-dos', icon: CheckCircle },
                { key: 'milestones', label: 'Milestones', icon: Target },
                { key: 'results', label: 'Results', icon: BarChart3 },
                { key: 'experiments', label: 'Experiments', icon: FlaskConical },
                { key: 'brainstorming', label: 'Ideas', icon: Lightbulb },
                { key: 'links', label: 'Links', icon: Link },
                { key: 'notes', label: 'Notes', icon: FileText }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-900 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'todos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <h2 className="text-lg font-medium text-gray-900">To-dos</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search todos..."
                      value={todoSearch}
                      onChange={(e) => setTodoSearch(e.target.value)}
                      className="pl-10 pr-4 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={todoSort}
                    onChange={(e) => setTodoSort(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="due-soon">Due Date (Soon)</option>
                    <option value="due-far">Due Date (Far)</option>
                    <option value="pending">Pending First</option>
                    <option value="completed">Completed First</option>
                    <option value="name">Name A-Z</option>
                  </select>
                  <button
                    onClick={addTodo}
                    className="bg-blue-600 text-white px-4 py-2 h-8 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
              
              {todoSearch && (
                <div className="text-sm text-gray-600">
                  Showing {getFilteredAndSortedTodos().length} of {currentProject.todos.length} todos
                </div>
              )}
              
              <div className="space-y-3">
                {getFilteredAndSortedTodos().map(todo => (
                  <div key={todo.id} className="bg-white rounded-lg border p-4">
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => updateTodo(todo.id, { done: !todo.done })}
                        className="mt-1"
                      >
                        {todo.done ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-800" />
                        )}
                      </button>
                      <div className="flex-1">
                        {editingTodoId === todo.id ? (
                          <div className="space-y-3 editable-area">
                            <input
                              type="text"
                              placeholder="Todo name..."
                              value={todo.name}
                              onChange={(e) => updateTodo(todo.id, { name: e.target.value })}
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingTodoId(null);
                                }
                              }}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                type="datetime-local"
                                value={todo.dueDate}
                                onChange={(e) => updateTodo(todo.id, { dueDate: e.target.value })}
                                className="border border-gray-300 rounded px-3 py-2"
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingTodoId(null);
                                  }
                                }}
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingTodoId(null)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteTodo(todo.id)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <textarea
                              placeholder="Details..."
                              value={todo.details}
                              onChange={(e) => updateTodo(todo.id, { details: e.target.value })}
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              rows="3"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingTodoId(null);
                                }
                              }}
                            />
                            {todo.done && (
                              <textarea
                                placeholder="Result..."
                                value={todo.result}
                                onChange={(e) => updateTodo(todo.id, { result: e.target.value })}
                                className="w-full border border-gray-300 rounded px-3 py-2"
                                rows="3"
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditingTodoId(null);
                                  }
                                }}
                              />
                            )}
                            <div className="text-xs text-gray-500">
                              Press ESC to save and exit editing
                            </div>
                          </div>
                        ) : (
                          <div 
                            onDoubleClick={() => setEditingTodoId(todo.id)}
                            className="cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className={`font-medium ${todo.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                  {todo.name || 'Untitled Todo'}
                                </h3>
                                {todo.details && <p className="text-gray-800 mt-1">{todo.details}</p>}
                                {todo.dueDate && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    Due: {new Date(todo.dueDate).toLocaleString()}
                                  </p>
                                )}
                                {todo.result && (
                                  <div className="mt-2 p-2 bg-green-50 rounded">
                                    <p className="text-sm text-green-800">{todo.result}</p>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => setEditingTodoId(todo.id)}
                                className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {getFilteredAndSortedTodos().length === 0 && todoSearch && (
                  <div className="text-center py-8 text-gray-500">
                    No todos found matching "{todoSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <h2 className="text-lg font-medium">Milestones</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search milestones..."
                      value={milestoneSearch}
                      onChange={(e) => setMilestoneSearch(e.target.value)}
                      className="pl-10 pr-4 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={milestoneSort}
                    onChange={(e) => setMilestoneSort(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="date-soon">Date (Soon)</option>
                    <option value="date-far">Date (Far)</option>
                    <option value="pending">Pending First</option>
                    <option value="completed">Completed First</option>
                    <option value="name">Name A-Z</option>
                  </select>
                  <button
                    onClick={addMilestone}
                    className="bg-blue-600 text-white px-4 py-2 h-8 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
              
              {milestoneSearch && (
                <div className="text-sm text-gray-600">
                  Showing {getFilteredAndSortedMilestones().length} of {currentProject.milestones.length} milestones
                </div>
              )}
              
              <div className="space-y-3">
                {getFilteredAndSortedMilestones().map(milestone => (
                  <div key={milestone.id} className="bg-white rounded-lg border p-4">
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => updateMilestone(milestone.id, { completed: !milestone.completed })}
                        className="mt-1"
                      >
                        {milestone.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Target className="w-5 h-5 text-gray-800" />
                        )}
                      </button>
                      <div className="flex-1">
                        {editingMilestoneId === milestone.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Milestone name..."
                              value={milestone.name}
                              onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })}
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              autoFocus
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                type="date"
                                value={milestone.date}
                                onChange={(e) => updateMilestone(milestone.id, { date: e.target.value })}
                                className="border border-gray-300 rounded px-3 py-2"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setEditingMilestoneId(null)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteMilestone(milestone.id)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <textarea
                              placeholder="Description..."
                              value={milestone.description}
                              onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })}
                              className="w-full border border-gray-300 rounded px-3 py-2"
                              rows="2"
                            />
                          </div>
                        ) : (
                          <div 
                            onDoubleClick={() => setEditingMilestoneId(milestone.id)}
                            className="cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                          >
                            <h3 className={`font-medium ${milestone.completed ? 'line-through text-gray-900' : ''}`}>
                              {milestone.name || 'Untitled Milestone'}
                            </h3>
                            {milestone.description && <p className="text-gray-800 mt-1">{milestone.description}</p>}
                            {milestone.date && (
                              <p className="text-sm text-gray-900 mt-1">
                                Date: {new Date(milestone.date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {getFilteredAndSortedMilestones().length === 0 && milestoneSearch && (
                  <div className="text-center py-8 text-gray-500">
                    No milestones found matching "{milestoneSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'experiments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <h2 className="text-lg font-medium">Experiment Logs</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search experiments..."
                      value={experimentSearch}
                      onChange={(e) => setExperimentSearch(e.target.value)}
                      className="pl-10 pr-4 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={experimentSort}
                    onChange={(e) => setExperimentSort(e.target.value)}
                    className="text-sm border border-gray-300 rounded-lg px-3 py-1"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="date-newest">Date (Newest)</option>
                    <option value="date-oldest">Date (Oldest)</option>
                    <option value="name">Name A-Z</option>
                  </select>
                  <button
                    onClick={addExperiment}
                    className="bg-blue-600 text-white px-4 py-2 h-8 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
              
              {experimentSearch && (
                <div className="text-sm text-gray-600">
                  Showing {getFilteredAndSortedExperiments().length} of {currentProject.experimentLogs.length} experiments
                </div>
              )}
              
              <div className="space-y-4">
                {getFilteredAndSortedExperiments().map(exp => (
                  <div key={exp.id} className="bg-white rounded-lg border p-4">
                    {editingExperimentId === exp.id ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <input
                            type="text"
                            placeholder="Experiment name..."
                            value={exp.name}
                            onChange={(e) => updateExperiment(exp.id, { name: e.target.value })}
                            className="flex-1 border border-gray-300 rounded px-3 py-2"
                            autoFocus
                          />
                          <div className="flex space-x-2 ml-3">
                            <button
                              onClick={() => setEditingExperimentId(null)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteExperiment(exp.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="date"
                          value={exp.date}
                          onChange={(e) => updateExperiment(exp.id, { date: e.target.value })}
                          className="border border-gray-300 rounded px-3 py-2"
                        />
                        <textarea
                          placeholder="Experiment description..."
                          value={exp.description}
                          onChange={(e) => updateExperiment(exp.id, { description: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          rows="3"
                        />
                        <textarea
                          placeholder="Results..."
                          value={exp.results}
                          onChange={(e) => updateExperiment(exp.id, { results: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          rows="3"
                        />
                        <textarea
                          placeholder="Takeaways..."
                          value={exp.takeaways}
                          onChange={(e) => updateExperiment(exp.id, { takeaways: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2"
                          rows="2"
                        />
                      </div>
                    ) : (
                      <div 
                        onDoubleClick={() => setEditingExperimentId(exp.id)}
                        className="cursor-pointer hover:bg-gray-50 rounded p-2 -m-2"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">{exp.name || 'Untitled Experiment'}</h3>
                          <span className="text-sm text-gray-900">{exp.date}</span>
                        </div>
                        {exp.description && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Description:</h4>
                            <p className="text-gray-800">{exp.description}</p>
                          </div>
                        )}
                        {exp.results && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-900">Results:</h4>
                            <p className="text-gray-800">{exp.results}</p>
                          </div>
                        )}
                        {exp.takeaways && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Takeaways:</h4>
                            <p className="text-gray-800">{exp.takeaways}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {getFilteredAndSortedExperiments().length === 0 && experimentSearch && (
                  <div className="text-center py-8 text-gray-500">
                    No experiments found matching "{experimentSearch}"
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === 'brainstorming' || activeTab === 'links' || activeTab === 'notes') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">
                  {activeTab === 'brainstorming' ? 'Brainstorming Ideas' :
                  activeTab === 'links' ? 'Core Links' : 'Notes'}
                </h2>
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
              <div className="bg-white rounded-lg border p-4">
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

          {activeTab === 'results' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Results</h2>
              <div className="bg-white rounded-lg border p-4">
                {isEditing ? (
                  <div className="editable-area">
                    <textarea
                      value={currentProject.results}
                      onChange={(e) => updateProject({...currentProject, results: e.target.value})}
                      placeholder="Enter your results data here... (CSV, tables, or any format)

Example formats:
- CSV data
- JSON results
- Statistical summaries
- Performance metrics
- Charts and graphs descriptions

Press ESC to exit edit mode"
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
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap font-mono text-sm">
                        {currentProject.results || ''}
                      </pre>
                    </div>
                    {!currentProject.results && (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                        <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg mb-2">No results data yet</p>
                        <p className="text-sm">Double-click here to start entering results...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        {showSettings && <SettingsModal />}
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">ML Research Manager</h1>
            </div>
            <div className="flex items-center space-x-2">
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
              <button
                onClick={addProject}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 h-7"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-900">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="name">Name</option>
                <option value="priority">Priority</option>
                <option value="urgency">Urgency</option>
                <option value="status">Status</option>
                <option value="dueDate">Due Date</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto w-12 h-12 text-gray-800" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
            <p className="mt-1 text-sm text-gray-900">Get started by creating a new project.</p>
            <div className="mt-6">
              <button
                onClick={addProject}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>New Project</span>
              </button>
            </div>
          </div>
        ) : (

      // Update the project grid section:
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {getFilteredAndSortedProjects().map(project => {
        const nextDue = getNextDueItem(project);
        const nextMilestone = getNextMilestone(project);
        const completedTodos = project.todos.filter(t => t.done).length;
        const totalTodos = project.todos.length;
        const completedMilestones = project.milestones.filter(m => m.completed).length;
        const totalMilestones = project.milestones.length;
        const topTodos = getTopTodos(project);

        return (
          <div
            key={project.id}
            onClick={() => setCurrentProject(project)}
            className="bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer p-6 relative group"
          >
            {/* Quick Action Buttons */}
            <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => handleQuickAddTodo(e, project)}
                className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                title="Quick add todo"
              >
                <Plus className="w-3.5 h-3.5 text-blue-700" />
              </button>
              <button
                onClick={(e) => handleQuickAddExperiment(e, project)}
                className="p-1.5 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                title="Quick add experiment"
              >
                <FlaskConical className="w-3.5 h-3.5 text-purple-700" />
              </button>
              <button
                onClick={(e) => handleQuickEditNotes(e, project)}
                className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                title="Quick edit notes"
              >
                <FileText className="w-3.5 h-3.5 text-green-700" />
              </button>
            </div>

            <div className="flex items-start justify-between mb-3 pr-20">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {project.name || 'Untitled Project'}
              </h3>
              <div className="flex space-x-2 flex-shrink-0">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[project.priority]}`}>
                  {project.priority}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                  {project.status}
                </span>
              </div>
            </div>

            {project.description && (
              <p className="text-gray-800 text-sm mb-4 line-clamp-2">{project.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">To-dos</span>
                <span className="font-medium">{completedTodos}/{totalTodos}</span>
              </div>
              {totalTodos > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(completedTodos / totalTodos) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900">Milestones</span>
                <span className="font-medium">{completedMilestones}/{totalMilestones}</span>
              </div>
              {totalMilestones > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(completedMilestones / totalMilestones) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Top 3 Todos */}
            {topTodos.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-900 uppercase tracking-wide mb-2">
                  Top To-dos
                </h4>
                <div className="space-y-1">
                  {topTodos.map(todo => (
                    <div key={todo.id} className="flex items-center space-x-2 text-sm">
                      <Circle className="w-3 h-3 text-gray-800 flex-shrink-0" />
                      <span className="truncate flex-1">{todo.name || 'Untitled'}</span>
                      {todo.dueDate && (
                        <span className="text-xs text-orange-600">
                          {new Date(todo.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Pending Milestone */}
            {nextMilestone && (
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-900 uppercase tracking-wide mb-2">
                  Next Milestone
                </h4>
                <div className="flex items-center space-x-2 text-sm">
                  <Target className="w-3 h-3 text-blue-600 flex-shrink-0" />
                  <span className="truncate flex-1">{nextMilestone.name || 'Untitled'}</span>
                  {nextMilestone.date && (
                    <span className="text-xs text-blue-600">
                      {new Date(nextMilestone.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {nextDue && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Next: {nextDue.name}
                    </p>
                    <p className="text-xs text-yellow-600">
                      {nextDue.type === 'todo' ? 'Due' : 'Date'}: {new Date(nextDue.dueDate || nextDue.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-900">
              <span>Created: {new Date(project.createdDate).toLocaleDateString()}</span>
              <span>{project.experimentLogs.length} experiments</span>
            </div>
          </div>
        );
      })}
      </div>

        )}
      </div>
      {showSettings && <SettingsModal />}
    </div>
  );
}

export default MLResearchManager;