import { useRef, useEffect, useState } from 'react';
import { Terminal as TerminalIcon } from 'lucide-react';

export default function Terminal({ logs, sendCommand }) {
  const containerRef = useRef(null);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSend = (e) => {
    e.preventDefault();
    if (cmd.trim()) {
      const finalCmd = cmd.trim().toUpperCase();
      sendCommand(finalCmd);
      setHistory(prev => [finalCmd, ...prev]);
      setHistoryIndex(-1);
      setCmd('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCmd(history[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setCmd(history[prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCmd('');
      }
    }
  };

  return (
    <div className="panel terminal-panel">
      <h2><TerminalIcon size={20} /> Terminal</h2>
      <div className="terminal-window" ref={containerRef}>
        {logs.map((log, i) => (
          <div key={i} className={`log-line ${log.startsWith('>') ? 'log-out' : log.startsWith('<') ? 'log-in' : 'log-info'}`}>
            {log}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="terminal-input-form">
        <input 
          type="text" 
          value={cmd} 
          onChange={e => setCmd(e.target.value)} 
          onKeyDown={handleKeyDown}
          placeholder="Send G-code... (Up/Down for history)" 
        />
        <button type="submit" className="btn-secondary">Send</button>
      </form>
    </div>
  );
}
