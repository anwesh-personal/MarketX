import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Globe, 
  Shield, 
  Cpu, 
  Database, 
  Server, 
  Zap, 
  Cloud, 
  Activity, 
  X, 
  Plus, 
  Minus, 
  HardDrive,
  Layers,
  ArrowRight,
  Lock
} from 'lucide-react';

/**
 * ------------------------------------------------------------------
 * 1. DATA MODEL & CONTENT
 * ------------------------------------------------------------------
 * This section defines the exact text, labels, and hierarchy of the diagram.
 * Edit this array to change the text "word for word".
 */

const NODE_WIDTH = 260;
const NODE_HEIGHT = 110;

const initialNodes = [
  // --- Entry Points ---
  { 
    id: 'user', 
    x: 50, 
    y: 300, 
    type: 'client',
    data: { 
      label: 'Users', 
      sub: 'Mobile & Web Clients',
      icon: <Smartphone className="text-blue-500" size={28} />,
      status: 'active',
      metrics: { active: '45k', region: 'Global' },
      description: "The end-users accessing the application via browsers or mobile apps. Requests originate here over HTTPS."
    } 
  },
  { 
    id: 'dns', 
    x: 350, 
    y: 300, 
    type: 'network',
    data: { 
      label: 'Route 53', 
      sub: 'DNS Service',
      icon: <Globe className="text-indigo-500" size={28} />,
      status: 'active',
      metrics: { latency: '12ms', type: 'A Record' },
      description: "Translates human readable domain names (www.example.com) into IP addresses that computers use to connect to each other."
    } 
  },
  
  // --- Edge / Distribution ---
  { 
    id: 'cdn', 
    x: 650, 
    y: 150, 
    type: 'network',
    data: { 
      label: 'CloudFront', 
      sub: 'CDN / Static Assets',
      icon: <Cloud className="text-sky-500" size={28} />,
      status: 'active',
      metrics: { hit_rate: '92%', bandwidth: '45TB' },
      description: "Content Delivery Network. Caches static content (images, CSS, JS) at edge locations close to users to minimize latency."
    } 
  },
  { 
    id: 'lb', 
    x: 650, 
    y: 450, 
    type: 'infrastructure',
    data: { 
      label: 'Load Balancer', 
      sub: 'Application Load Balancer',
      icon: <Layers className="text-violet-500" size={28} />,
      status: 'active',
      metrics: { reqs: '2.5k/s', health: 'Healthy' },
      description: "Distributes incoming application traffic across multiple targets (EC2 instances) in multiple Availability Zones."
    } 
  },

  // --- Compute Layer ---
  { 
    id: 'web-tier', 
    x: 950, 
    y: 300, 
    type: 'compute',
    data: { 
      label: 'Web Server Fleet', 
      sub: 'Auto Scaling Group',
      icon: <Server className="text-emerald-500" size={28} />,
      status: 'scaling',
      metrics: { instances: '12', cpu: '45%' },
      description: "Handles HTTP requests/responses. Stateless servers that render the UI or proxy API requests to the application tier."
    } 
  },
  { 
    id: 'app-tier', 
    x: 950, 
    y: 550, 
    type: 'compute',
    data: { 
      label: 'App Server Fleet', 
      sub: 'Business Logic / API',
      icon: <Cpu className="text-emerald-600" size={28} />,
      status: 'active',
      metrics: { instances: '8', memory: '60%' },
      description: "Contains the core application logic. Processes data, communicates with databases, and handles complex transactions."
    } 
  },

  // --- Data Layer ---
  { 
    id: 'cache', 
    x: 1250, 
    y: 450, 
    type: 'cache',
    data: { 
      label: 'Redis Cluster', 
      sub: 'ElastiCache',
      icon: <Zap className="text-amber-500" size={28} />,
      status: 'active',
      metrics: { keys: '1.2M', eviction: '0' },
      description: "In-memory caching layer. Stores session data and frequently accessed DB queries to improve read performance."
    } 
  },
  { 
    id: 'db-primary', 
    x: 1250, 
    y: 700, 
    type: 'database',
    data: { 
      label: 'Primary DB', 
      sub: 'Aurora / PostgreSQL',
      icon: <Database className="text-blue-600" size={28} />,
      status: 'active',
      metrics: { role: 'Writer', iops: '4000' },
      description: "The source of truth. Handles all WRITE operations. Replicates data to Standby/Read Replicas asynchronously."
    } 
  },
  { 
    id: 'db-replica', 
    x: 1550, 
    y: 700, 
    type: 'database',
    data: { 
      label: 'Read Replica', 
      sub: 'Aurora / PostgreSQL',
      icon: <HardDrive className="text-slate-500" size={28} />,
      status: 'passive',
      metrics: { role: 'Reader', lag: '<10ms' },
      description: "Handles READ-only traffic to offload the primary database. Can be promoted to Primary in case of failure."
    } 
  }
];

const initialEdges = [
  { id: 'e1', source: 'user', target: 'dns', label: 'Resolve' },
  { id: 'e2', source: 'user', target: 'cdn', label: 'Static' },
  { id: 'e3', source: 'user', target: 'lb', label: 'Dynamic' },
  { id: 'e4', source: 'lb', target: 'web-tier', label: 'HTTP' },
  { id: 'e5', source: 'web-tier', target: 'app-tier', label: 'API Call' },
  { id: 'e6', source: 'app-tier', target: 'cache', label: 'Read/Write' },
  { id: 'e7', source: 'app-tier', target: 'db-primary', label: 'Persist' },
  { id: 'e8', source: 'db-primary', target: 'db-replica', label: 'Replicate' },
];

/**
 * ------------------------------------------------------------------
 * 2. UTILITY FUNCTIONS (Geometry & Physics)
 * ------------------------------------------------------------------
 */

const generatePath = (start, end) => {
  if (!start || !end) return '';
  const startX = start.x + NODE_WIDTH;
  const startY = start.y + NODE_HEIGHT / 2;
  const endX = end.x;
  const endY = end.y + NODE_HEIGHT / 2;

  const dist = Math.abs(endX - startX) * 0.5;
  const cp1x = startX + dist;
  const cp1y = startY;
  const cp2x = endX - dist;
  const cp2y = endY;

  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
};

/**
 * ------------------------------------------------------------------
 * 3. SUB-COMPONENTS (Visual Layer)
 * ------------------------------------------------------------------
 */

// A. Interactive Connection Lines
const ConnectionLine = ({ edge, startNode, endNode }) => {
  if (!startNode || !endNode) return null;
  const path = generatePath(startNode, endNode);

  return (
    <g className="group pointer-events-auto">
      {/* Hit Area (Invisible) */}
      <path d={path} stroke="transparent" strokeWidth="25" fill="none" />
      
      {/* Base Line */}
      <path 
        d={path} 
        stroke="#e2e8f0" 
        strokeWidth="3" 
        fill="none" 
        className="transition-colors duration-300 group-hover:stroke-blue-200"
      />

      {/* Animated Data Packet */}
      <path 
        d={path} 
        stroke="url(#gradient-flow)" 
        strokeWidth="3" 
        fill="none"
        strokeDasharray="10 10"
        className="opacity-60"
      >
        <animate 
          attributeName="stroke-dashoffset" 
          from="40" 
          to="0" 
          dur="1.5s" 
          repeatCount="indefinite" 
        />
      </path>

      {/* Label Badge */}
      <foreignObject
        x={(startNode.x + NODE_WIDTH + endNode.x) / 2 - 35}
        y={(startNode.y + endNode.y + NODE_HEIGHT) / 2 - 12}
        width="70"
        height="24"
      >
        <div className="flex items-center justify-center w-full h-full">
           <span className="bg-white/90 backdrop-blur text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 shadow-sm whitespace-nowrap group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
             {edge.label}
           </span>
        </div>
      </foreignObject>
    </g>
  );
};

// B. Draggable Node Card
const NodeCard = ({ node, onMouseDown, onClick }) => {
  return (
    <motion.div
      className="absolute group"
      style={{ x: node.x, y: node.y, width: NODE_WIDTH, height: NODE_HEIGHT }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onClick={() => onClick(node)}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`
        relative h-full bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] 
        border border-slate-200
        transition-all duration-300 ease-out
        hover:shadow-[0_8px_24px_rgba(59,130,246,0.1)] hover:border-blue-300 cursor-pointer
        overflow-hidden
      `}>
        {/* Card Content */}
        <div className="relative p-4 flex items-center gap-4 h-full z-10">
          <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:bg-white group-hover:shadow-md transition-all duration-300">
            {node.data.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800 leading-tight mb-1 group-hover:text-blue-600 transition-colors">
              {node.data.label}
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-2 truncate">
              {node.data.sub}
            </p>
            
            <div className="flex flex-wrap gap-1.5">
               {Object.entries(node.data.metrics).slice(0, 2).map(([key, value]) => (
                 <div key={key} className="px-1.5 py-0.5 bg-slate-100/80 rounded text-[9px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200/50">
                   {key}: <span className="text-slate-700">{value}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Decor: Active Status Indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
           <span className={`
             w-2 h-2 rounded-full 
             ${node.data.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
             ${node.data.status === 'scaling' ? 'bg-blue-500 animate-pulse' : ''}
             ${node.data.status === 'passive' ? 'bg-slate-300' : ''}
           `} />
        </div>
      </div>
      
      {/* Decor: Connection Anchor Points */}
      <div className="absolute top-1/2 -left-1 w-2 h-2 bg-white border border-slate-300 rounded-full" />
      <div className="absolute top-1/2 -right-1 w-2 h-2 bg-white border border-slate-300 rounded-full" />
    </motion.div>
  );
};

// C. Detailed Info Modal
const DetailModal = ({ node, onClose }) => {
  return (
    <AnimatePresence>
      {node && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            layoutId={`modal-${node.id}`}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal Header */}
            <div className="relative bg-slate-50/50 p-6 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-blue-600">
                  {node.data.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-slate-900">{node.data.label}</h2>
                  <p className="text-sm font-medium text-slate-500">{node.data.sub}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 -mr-2 -mt-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  <Activity size={12} /> Component Role
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {node.data.description}
                </p>
              </div>

              <div>
                <h4 className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  <Zap size={12} /> Performance Metrics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(node.data.metrics).map(([key, value]) => (
                    <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">{key}</span>
                      <span className="text-sm font-bold text-slate-900 font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
               <span className="text-[10px] text-slate-400 font-mono">ID: {node.id}</span>
               <button 
                 onClick={onClose}
                 className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-slate-900/20"
               >
                 Close Panel
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * ------------------------------------------------------------------
 * 4. MAIN APPLICATION
 * ------------------------------------------------------------------
 */

export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Viewport State
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 0.75 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const containerRef = useRef(null);
  const dragRef = useRef({ active: false, nodeId: null });

  // ----------------------------------------------------------------
  // Interaction Logic (Zoom, Pan, Drag)
  // ----------------------------------------------------------------

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newZoom = Math.min(Math.max(viewState.zoom - e.deltaY * zoomSensitivity, 0.4), 2);
      setViewState(prev => ({ ...prev, zoom: newZoom }));
    } else {
      setViewState(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [viewState.zoom]);

  const handleMouseMove = useCallback((e) => {
    if (isDraggingCanvas) {
      setViewState(prev => ({
        ...prev,
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
    
    if (dragRef.current.active) {
      const { nodeId } = dragRef.current;
      const scale = viewState.zoom;
      setNodes(prev => prev.map(n => 
        n.id === nodeId 
          ? { ...n, x: n.x + e.movementX / scale, y: n.y + e.movementY / scale } 
          : n
      ));
    }
  }, [isDraggingCanvas, viewState.zoom]);

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
    dragRef.current.active = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove]);

  return (
    <div className="relative w-full h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-blue-200">
      
      {/* SVG Filters for Gradients */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="gradient-flow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
          backgroundSize: `${30 * viewState.zoom}px ${30 * viewState.zoom}px`,
          backgroundPosition: `${viewState.x}px ${viewState.y}px`
        }}
      />

      {/* Main Interactive Canvas */}
      <div 
        ref={containerRef}
        className={`w-full h-full ${isDraggingCanvas ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          if (e.target === containerRef.current) setIsDraggingCanvas(true);
        }}
      >
        <div 
          className="w-full h-full origin-top-left will-change-transform"
          style={{
            transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})`
          }}
        >
          {/* Edges Layer */}