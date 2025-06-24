import { Game } from "@/draw/Game";
import { Pencil, RectangleHorizontal, Circle, Eraser, Move, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { clearCanvas, Tool } from "./Canvas";

export const Topbar = ({
    selectedTool,
    setSelectedTool,
    game,
    roomId
  }: {
    selectedTool: Tool;
    setSelectedTool: (s: Tool) => void;
    game: Game | undefined;
    roomId: string;
  }) => {
    const colors = ["black", "red", "green", "blue", "yellow", "purple"];
    const lineWidths = [2, 5, 10, 15];
  
    const [selectedColor, setSelectedColor] = useState<string>("black");
    const [selectedLineWidth, setSelectedLineWidth] = useState<number>(5);
    const [showClearAlert, setShowClearAlert] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showWidthPicker, setShowWidthPicker] = useState(false);
  
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center">
        {/* Main Toolbar */}
        <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-3 py-2 flex items-center gap-2">
          {/* Tools Group */}
          <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
            <button
              onClick={() => setSelectedTool("pencil")}
              className={`p-2 rounded-lg transition-all ${
                selectedTool === "pencil" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedTool("rect")}
              className={`p-2 rounded-lg transition-all ${
                selectedTool === "rect" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <RectangleHorizontal className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedTool("circle")}
              className={`p-2 rounded-lg transition-all ${
                selectedTool === "circle" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Circle className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedTool("eraser")}
              className={`p-2 rounded-lg transition-all ${
                selectedTool === "eraser" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Eraser className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedTool("move")}
              className={`p-2 rounded-lg transition-all ${
                selectedTool === "move" ? "bg-blue-100 text-blue-600" : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Move className="w-5 h-5" />
            </button>
          </div>
  
          {/* Color Picker */}
          <div className="relative px-3 border-r border-gray-200">
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowWidthPicker(false);
              }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div
                className="w-5 h-5 rounded-full border border-gray-300"
                style={{ backgroundColor: selectedColor }}
              />
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
  
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg p-2 grid grid-cols-3 gap-2 z-50">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      game?.setColor(color);
                      setShowColorPicker(false);
                    }}
                    className="rounded-lg pr-4 hover:bg-gray-100 transition-all"
                  >
                    <div
                      className="w-6 h-6 rounded-full border border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
  
          {/* Line Width Picker */}
          <div className="relative px-3 border-r border-gray-200">
            <button
              onClick={() => {
                setShowWidthPicker(!showWidthPicker);
                setShowColorPicker(false);
              }}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all"
            >
              <div className="w-5 h-5 flex items-center">
                <div
                  className="bg-black rounded-full"
                  style={{ width: "100%", height: `${selectedLineWidth}px` }}
                />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
  
            {showWidthPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg p-2 space-y-2 z-50">
                {lineWidths.map((width) => (
                  <button
                    key={width}
                    onClick={() => {
                      setSelectedLineWidth(width);
                      game?.setLineWidth(width);
                      setShowWidthPicker(false);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-all w-full flex items-center justify-center"
                  >
                    <div
                      className="bg-black rounded-full"
                      style={{ width: "24px", height: `${width}px` }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
  
          {/* Clear Canvas Button */}
          <button
            onClick={() => setShowClearAlert(true)}
            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
  
        {/* Clear Alert Modal */}
        {showClearAlert && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white mt-24 rounded-2xl shadow-lg max-w-sm w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900">Clear Canvas</h2>
              <p className="mt-2 text-gray-600">
                Are you sure you want to clear the canvas? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowClearAlert(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearCanvas(roomId);
                    setShowClearAlert(false);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                >
                  Clear Canvas
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };