import React from 'react';
import { 
  Pencil, 
  RectangleHorizontal, 
  Circle, 
  Eraser, 
  Move,
} from 'lucide-react';
import { IconButton } from './IconButton';

interface DrawingToolbarProps {
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  currentColor: string;
  setColor: (color: string) => void;
  currentLineWidth: number;
  setLineWidth: (width: number) => void;
}

const colors = ['#000000', 'red', 'green', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
const lineWidths = [2, 4, 6, 8, 12];

export function DrawingToolbar({
  selectedTool,
  setSelectedTool,
  currentColor,
  setColor,
  currentLineWidth,
  setLineWidth,
}: DrawingToolbarProps) {
  return (
    <div className="fixed top-4 left-4 bg-white rounded-xl shadow-lg p-3 space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 px-2">Tools</h3>
        <div className="flex gap-2">
          <IconButton
            onClick={() => setSelectedTool("pencil")}
            activated={selectedTool === "pencil"}
            icon={<Pencil className="w-5 h-5" />}
            label="Pencil"
          />
          <IconButton
            onClick={() => setSelectedTool("rect")}
            activated={selectedTool === "rect"}
            icon={<RectangleHorizontal className="w-5 h-5" />}
            label="Rectangle"
          />
          <IconButton
            onClick={() => setSelectedTool("circle")}
            activated={selectedTool === "circle"}
            icon={<Circle className="w-5 h-5" />}
            label="Circle"
          />
          <IconButton
            onClick={() => setSelectedTool("eraser")}
            activated={selectedTool === "eraser"}
            icon={<Eraser className="w-5 h-5" />}
            label="Eraser"
          />
          <IconButton
            onClick={() => setSelectedTool("move")}
            activated={selectedTool === "move"}
            icon={<Move className="w-5 h-5" />}
            label="Move"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 px-2">Colors</h3>
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <IconButton
              key={color}
              onClick={() => setColor(color)}
              activated={currentColor === color}
              icon={
                <div 
                  className="w-5 h-5 rounded-full border border-gray-200"
                  style={{ backgroundColor: color }}
                />
              }
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-gray-500 px-2">Line Width</h3>
        <div className="flex gap-2">
          {lineWidths.map((width) => (
            <IconButton
              key={width}
              onClick={() => setLineWidth(width)}
              activated={currentLineWidth === width}
              icon={
                <div className="w-5 flex items-center">
                  <div
                    className="w-full rounded-full bg-gray-800"
                    style={{ height: `${width}px` }}
                  />
                </div>
              }
            />
          ))}
        </div>
      </div>
        </div>
  );
}