"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

function Calendar({
  className,
  selectedRange,
  onRangeChange,
  onApply,
  onCancel,
  onPresetClick,
  showSidebar = false,
  ...props
}) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    return selectedRange?.from ? new Date(selectedRange.from.getFullYear(), selectedRange.from.getMonth(), 1) : new Date()
  })
  const [tempRange, setTempRange] = React.useState(selectedRange || { from: null, to: null })
  const [hoveredDate, setHoveredDate] = React.useState(null)
  const [selectedPreset, setSelectedPreset] = React.useState('custom')

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const subDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
  };

  const startOfWeek = (date) => {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    result.setDate(result.getDate() + diff);
    return result;
  };

  const endOfWeek = (date) => {
    const result = new Date(date);
    const day = result.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    result.setDate(result.getDate() + diff);
    return result;
  };

  const startOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const endOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  React.useEffect(() => {
    if (selectedRange) {
      setTempRange(selectedRange)
      if (selectedRange.from) {
        setCurrentMonth(new Date(selectedRange.from.getFullYear(), selectedRange.from.getMonth(), 1))
      }
    }
  }, [selectedRange])

  const handlePresetClick = (preset) => {
    setSelectedPreset(preset);
    
    if (preset === 'custom') {
      return;
    }
    
    const today = new Date();
    let from, to;
    
    switch (preset) {
      case 'last7days':
        from = subDays(today, 6);
        to = today;
        break;
      case 'last14days':
        from = subDays(today, 13);
        to = today;
        break;
      case 'last30days':
        from = subDays(today, 29);
        to = today;
        break;
      case 'thisWeek':
        from = startOfWeek(today);
        to = endOfWeek(today);
        break;
      case 'thisMonth':
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      case 'previousWeek':
        const lastWeek = subDays(today, 7);
        from = startOfWeek(lastWeek);
        to = endOfWeek(lastWeek);
        break;
      case 'previousMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        from = startOfMonth(lastMonth);
        to = endOfMonth(lastMonth);
        break;
      default:
        return;
    }
    
    const newRange = { from, to };
    setTempRange(newRange);
    setCurrentMonth(new Date(from.getFullYear(), from.getMonth(), 1));
    
    // Don't call onPresetClick here - let user click Apply button to apply the filter
  };

  const isInRange = (date) => {
    if (!tempRange.from) return false;
    
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (tempRange.to) {
      const normalizedFrom = new Date(tempRange.from.getFullYear(), tempRange.from.getMonth(), tempRange.from.getDate());
      const normalizedTo = new Date(tempRange.to.getFullYear(), tempRange.to.getMonth(), tempRange.to.getDate());
      return normalizedDate >= normalizedFrom && normalizedDate <= normalizedTo;
    }
    
    if (hoveredDate) {
      const normalizedFrom = new Date(tempRange.from.getFullYear(), tempRange.from.getMonth(), tempRange.from.getDate());
      const normalizedHovered = new Date(hoveredDate.getFullYear(), hoveredDate.getMonth(), hoveredDate.getDate());
      const start = tempRange.from < hoveredDate ? normalizedFrom : normalizedHovered;
      const end = tempRange.from < hoveredDate ? normalizedHovered : normalizedFrom;
      return normalizedDate >= start && normalizedDate <= end;
    }
    
    return false;
  };

  const isRangeStart = (date) => {
    if (!tempRange.from) return false;
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const normalizedFrom = new Date(tempRange.from.getFullYear(), tempRange.from.getMonth(), tempRange.from.getDate());
    
    if (tempRange.to) {
      return normalizedDate.getTime() === normalizedFrom.getTime();
    }
    if (hoveredDate) {
      const normalizedHovered = new Date(hoveredDate.getFullYear(), hoveredDate.getMonth(), hoveredDate.getDate());
      return tempRange.from < hoveredDate ? 
        normalizedDate.getTime() === normalizedFrom.getTime() : 
        normalizedDate.getTime() === normalizedHovered.getTime();
    }
    return normalizedDate.getTime() === normalizedFrom.getTime();
  };

  const isRangeEnd = (date) => {
    if (!tempRange.from) return false;
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (tempRange.to) {
      const normalizedTo = new Date(tempRange.to.getFullYear(), tempRange.to.getMonth(), tempRange.to.getDate());
      return normalizedDate.getTime() === normalizedTo.getTime();
    }
    if (hoveredDate) {
      const normalizedHovered = new Date(hoveredDate.getFullYear(), hoveredDate.getMonth(), hoveredDate.getDate());
      return tempRange.from < hoveredDate ? 
        normalizedDate.getTime() === normalizedHovered.getTime() : 
        normalizedDate.getTime() === new Date(tempRange.from.getFullYear(), tempRange.from.getMonth(), tempRange.from.getDate()).getTime();
    }
    return false;
  };

  const handleDateClick = (date) => {
    if (!tempRange.from) {
      setTempRange({ from: date, to: null });
    } else if (tempRange.from && !tempRange.to) {
      if (date < tempRange.from) {
        setTempRange({ from: date, to: tempRange.from });
      } else {
        setTempRange({ from: tempRange.from, to: date });
      }
      setHoveredDate(null);
    } else {
      setTempRange({ from: date, to: null });
      setHoveredDate(null);
    }
    setSelectedPreset('custom');
  };

  const handleDateHover = (date) => {
    if (tempRange.from && !tempRange.to) {
      setHoveredDate(date);
    }
  };

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);
    
    // Previous month days
    const prevMonthDays = firstDay === 0 ? 6 : firstDay - 1;
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevMonthTotal = daysInMonth(prevMonth);
    
    for (let i = prevMonthTotal - prevMonthDays + 1; i <= prevMonthTotal; i++) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), i);
      const inRange = isInRange(date);
      const isStart = isRangeStart(date);
      const isEnd = isRangeEnd(date);
      
      days.push(
        <button
          key={`prev-${i}`}
          className={`h-9 w-9 flex items-center justify-center text-xs rounded-full transition-colors ${
            inRange && !isStart && !isEnd ? 'bg-accent text-accent-foreground' :
            isStart || isEnd ? 'bg-primary text-primary-foreground font-medium' :
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => handleDateHover(date)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          {i}
        </button>
      );
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const inRange = isInRange(date);
      const isStart = isRangeStart(date);
      const isEnd = isRangeEnd(date);
      const isToday = new Date().toDateString() === date.toDateString();
      
      days.push(
        <button
          key={`current-${i}`}
          className={`h-9 w-9 flex items-center justify-center text-xs rounded-full transition-colors font-medium ${
            inRange && !isStart && !isEnd ? 'bg-accent text-accent-foreground' :
            isStart || isEnd ? 'bg-primary text-primary-foreground' :
            isToday ? 'bg-accent text-accent-foreground ring-2 ring-primary' :
            'text-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => handleDateHover(date)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          {i}
        </button>
      );
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length;
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i);
      const inRange = isInRange(date);
      const isStart = isRangeStart(date);
      const isEnd = isRangeEnd(date);
      
      days.push(
        <button
          key={`next-${i}`}
          className={`h-9 w-9 flex items-center justify-center text-xs rounded-full transition-colors ${
            inRange && !isStart && !isEnd ? 'bg-accent text-accent-foreground' :
            isStart || isEnd ? 'bg-primary text-primary-foreground font-medium' :
            'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => handleDateHover(date)}
          onMouseLeave={() => setHoveredDate(null)}
        >
          {i}
        </button>
      );
    }
    
    return days;
  };

  const presets = [
    { key: 'custom', label: 'Custom' },
    { key: 'last7days', label: 'Last 7 days' },
    { key: 'last14days', label: 'Last 14 days' },
    { key: 'last30days', label: 'Last 30 days' },
    { key: 'thisWeek', label: 'This week' },
    { key: 'thisMonth', label: 'This month' },
    { key: 'previousWeek', label: 'Previous week' },
    { key: 'previousMonth', label: 'Previous month' }
  ];

  if (showSidebar) {
    return (
      <div className={cn("flex bg-background border border-border rounded-lg", className)} style={{ zIndex: 10001 }}>
          {/* Sidebar */}
          <div className="w-28 border-r border-border p-2.5">
            <div className="space-y-0.5">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset.key)}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                    selectedPreset === preset.key 
                      ? 'font-semibold text-foreground bg-accent' 
                      : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 p-3">
            <div className="space-y-2">
              {/* Date inputs */}
              <div className="flex gap-2">
                <div className="w-24">
                  <label className="text-xs text-muted-foreground mb-0.5 block">Start</label>
                  <input
                    type="text"
                    value={tempRange.from ? formatDate(tempRange.from) : ''}
                    readOnly
                    placeholder="dd/MM/yy"
                    className="w-full px-2 py-1.5 text-xs border border-input rounded-md bg-background text-foreground"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs text-muted-foreground mb-0.5 block">End</label>
                  <input
                    type="text"
                    value={tempRange.to ? formatDate(tempRange.to) : hoveredDate ? formatDate(hoveredDate) : ''}
                    readOnly
                    placeholder="dd/MM/yy"
                    className="w-full px-2 py-1.5 text-xs border border-input rounded-md bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Calendar header */}
              <div className="flex items-center justify-between py-1.5">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="p-1.5 hover:bg-accent rounded transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="p-1.5 hover:bg-accent rounded transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="h-7 flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {renderCalendar()}
              </div>

              {/* Action buttons */}
              <div className="flex justify-end items-center pt-2 border-t border-border gap-2">
                <button
                  onClick={() => {
                    setTempRange(selectedRange || { from: null, to: null });
                    setHoveredDate(null);
                    setSelectedPreset('custom');
                    if (onCancel) onCancel();
                  }}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (tempRange.from && tempRange.to) {
                      if (onRangeChange) onRangeChange(tempRange);
                      if (onApply) onApply(tempRange);
                    }
                  }}
                  disabled={!tempRange.from || !tempRange.to}
                  className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
    )
  }

  return null
}

Calendar.displayName = "Calendar"

export default Calendar