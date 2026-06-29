import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  Maximize2,
  Minimize2,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  X,
} from 'lucide-react';
import clsx from 'clsx';

interface PreviewProps {
  html: string;
  css?: string;
  javascript?: string;
  autoRefresh?: boolean;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const deviceSizes: Record<DeviceType, { width: string | number; height: string | number }> = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

export function Preview({
  html,
  css = '',
  javascript = '',
  autoRefresh = true,
}: PreviewProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generatePreviewHtml = useCallback(() => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    try {
      ${javascript}
    } catch(e) {
      console.error('Script error:', e);
    }
  </script>
</body>
</html>`;
  }, [html, css, javascript]);

  useEffect(() => {
    if (autoRefresh && iframeRef.current) {
      iframeRef.current.srcdoc = generatePreviewHtml();
    }
  }, [html, css, javascript, autoRefresh, generatePreviewHtml]);

  const handleRefresh = () => {
    setKey((k) => k + 1);
  };

  const handleOpenExternal = () => {
    const blob = new Blob([generatePreviewHtml()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const { width, height } = deviceSizes[device];
  const containerStyle = isFullscreen
    ? { width: '100vw', height: '100vh' }
    : { width: typeof width === 'number' ? `${width}px` : width, minWidth: '200px' };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">Preview</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
              title="Exit Fullscreen"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <iframe
          key={key}
          ref={iframeRef}
          srcDoc={generatePreviewHtml()}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-modals"
          title="Preview"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-800/50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
        <span className="text-sm font-medium text-white">Preview</span>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 mr-2 bg-slate-700/50 rounded p-0.5">
            <button
              onClick={() => setDevice('desktop')}
              className={clsx(
                'p-1 rounded transition-colors',
                device === 'desktop'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              )}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('tablet')}
              className={clsx(
                'p-1 rounded transition-colors',
                device === 'tablet'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              )}
              title="Tablet"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={clsx(
                'p-1 rounded transition-colors',
                device === 'mobile'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-400 hover:text-white'
              )}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <div
          style={containerStyle}
          className={clsx(
            'border border-slate-600 rounded-lg overflow-hidden shadow-2xl bg-white',
            device !== 'desktop' && 'h-auto'
          )}
        >
          <iframe
            key={key}
            ref={iframeRef}
            srcDoc={generatePreviewHtml()}
            className="w-full h-full border-none"
            style={{
              height: device !== 'desktop' ? `${height}px` : '100%',
              minHeight: '300px',
            }}
            sandbox="allow-scripts allow-modals"
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
}
