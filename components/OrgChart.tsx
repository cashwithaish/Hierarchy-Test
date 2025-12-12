import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Employee } from '../types';
import { User, ChevronUp, ZoomIn, ZoomOut, Maximize, Focus } from 'lucide-react';

interface OrgChartProps {
  rootNode: Employee;
  onNodeClick: (node: Employee) => void;
  onGoUp?: () => void;
}

const CARD_WIDTH = 260;
const CARD_HEIGHT = 100;
const VERTICAL_SPACING = 140; 
const HORIZONTAL_SPACING = 80;

const OrgChart: React.FC<OrgChartProps> = ({ rootNode, onNodeClick, onGoUp }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  
  // Compute layout once per rootNode change
  const { nodes, links } = useMemo(() => {
    const hierarchy = d3.hierarchy<Employee>(rootNode);
    const treeLayout = d3.tree<Employee>()
      .nodeSize([CARD_WIDTH + HORIZONTAL_SPACING, CARD_HEIGHT + VERTICAL_SPACING]);
    
    treeLayout(hierarchy);
    
    return {
      nodes: hierarchy.descendants(),
      links: hierarchy.links(),
    };
  }, [rootNode]);

  // Setup Zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        if (gRef.current) {
          d3.select(gRef.current).attr('transform', event.transform);
          setZoomTransform(event.transform);
        }
      });

    svg.call(zoom)
       .on("dblclick.zoom", null); // Disable double click zoom

    // Initial Fit
    fitToScreen();

    // Store zoom instance for buttons
    (svgRef.current as any).__zoomObj = zoom;

  }, [rootNode, nodes]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = (svgRef.current as any).__zoomObj;
    if (zoom) {
      svg.transition().duration(300).call(zoom.scaleBy, factor);
    }
  };

  const fitToScreen = () => {
    if (!svgRef.current || !gRef.current) return;
    
    // Calculate bounding box of the graph
    // We can't use gRef.current.getBBox() easily if it's currently transformed heavily or not rendered yet,
    // so we calculate bounds from data.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    // Add card dimensions
    minX -= CARD_WIDTH / 2;
    maxX += CARD_WIDTH / 2;
    // Y is usually 0 at top for root
    maxY += CARD_HEIGHT;

    const width = maxX - minX;
    const height = maxY - minY;
    
    const svgWidth = svgRef.current.clientWidth;
    const svgHeight = svgRef.current.clientHeight;
    
    const padding = 100;
    const scale = Math.min(
      (svgWidth - padding) / width, 
      (svgHeight - padding) / height
    );
    // Limit max initial scale
    const clampedScale = Math.min(Math.max(scale, 0.2), 1);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const tx = svgWidth / 2 - centerX * clampedScale;
    const ty = svgHeight / 2 - centerY * clampedScale - (height * clampedScale / 2) + 50; // Bias slightly to top

    const svg = d3.select(svgRef.current);
    const zoom = (svgRef.current as any).__zoomObj;
    
    if (zoom) {
      svg.transition().duration(750).call(
        zoom.transform, 
        d3.zoomIdentity.translate(tx, ty).scale(clampedScale)
      );
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden rounded-xl border border-slate-200 shadow-inner dot-pattern">
      
      {/* Controls Toolbar */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg border border-slate-100">
        <button 
          onClick={() => handleZoom(1.2)}
          className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button 
          onClick={() => handleZoom(0.8)}
          className="p-2 hover:bg-slate-100 rounded-md text-slate-600 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="h-px bg-slate-200 my-1" />
        <button 
          onClick={fitToScreen}
          className="p-2 hover:bg-indigo-50 hover:text-indigo-600 rounded-md text-slate-600 transition-colors"
          title="Fit to Screen"
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>

      {/* Root Navigation (Manager) */}
      {rootNode.managerId && onGoUp && (
        <div className="absolute top-6 left-6 z-20">
          <button 
            onClick={onGoUp}
            className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur text-indigo-700 rounded-full shadow-md border border-indigo-100 hover:bg-indigo-50 hover:pl-3 transition-all font-medium text-sm group"
          >
            <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span>Go Up to Manager</span>
          </button>
        </div>
      )}

      {/* Visualization */}
      <svg 
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <g ref={gRef}>
          {/* Links */}
          {links.map((link, i) => {
            const sourceX = link.source.x!;
            const sourceY = link.source.y! + CARD_HEIGHT;
            const targetX = link.target.x!;
            const targetY = link.target.y!;

            const path = d3.linkVertical()
              .x((d: any) => d[0])
              .y((d: any) => d[1])
              ({ source: [sourceX, sourceY], target: [targetX, targetY] });

            return (
              <path
                key={`link-${i}`}
                d={path || ""}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                className="opacity-60"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isRoot = node.data.id === rootNode.id;
            const hasChildren = node.data.children && node.data.children.length > 0;
            
            return (
              <foreignObject
                key={`node-${node.data.id}`}
                x={node.x! - CARD_WIDTH / 2}
                y={node.y!}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                className="overflow-visible"
              >
                <div 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent drag/zoom start on click
                    onNodeClick(node.data);
                  }}
                  className={`
                    group relative w-full h-full bg-white rounded-lg shadow-sm border transition-all duration-300 hover:scale-105
                    ${isRoot 
                      ? 'border-indigo-400 ring-4 ring-indigo-50/50 shadow-lg z-10' 
                      : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Color Bar Top */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-lg ${isRoot ? 'bg-indigo-500' : 'bg-slate-300 group-hover:bg-indigo-400'} transition-colors`} />

                  <div className="flex items-center h-full p-4 gap-4">
                    {/* Avatar */}
                    <div className={`
                      flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm
                      ${isRoot 
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' 
                        : 'bg-gradient-to-br from-slate-400 to-slate-500 group-hover:from-indigo-400 group-hover:to-indigo-600'
                      }
                      transition-all
                    `}>
                       {node.data.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-col min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-800 truncate" title={node.data.name}>
                        {node.data.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                        #{node.data.id}
                      </p>
                      
                      {/* Direct Reports Badge */}
                      {hasChildren && (
                        <div className="mt-2 flex items-center gap-1.5">
                           <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                             <User className="w-3 h-3 mr-1" />
                             {node.data.children.length}
                           </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Focus Action Overlay (visible on hover) */}
                  {!isRoot && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-indigo-50 p-1.5 rounded-md text-indigo-600 shadow-sm border border-indigo-100" title="Focus View">
                        <Focus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              </foreignObject>
            );
          })}
        </g>
      </svg>
      
      {/* Legend/Status Overlay */}
      <div className="absolute bottom-6 left-6 pointer-events-none opacity-50 text-xs text-slate-400 select-none">
        {nodes.length} loaded nodes • Use mouse to pan • Scroll to zoom
      </div>
    </div>
  );
};

export default OrgChart;