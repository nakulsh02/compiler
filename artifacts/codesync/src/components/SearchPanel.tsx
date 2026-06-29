import { useState } from 'react';
import { Search, File, Folder, X, MoreVertical, Replace, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { ProjectFile } from '../types';

interface SearchPanelProps {
  files: ProjectFile[];
  currentFile?: string;
  onSelectFile: (file: ProjectFile) => void;
}

interface SearchResult {
  file: ProjectFile;
  matches: Array<{
    line: number;
    column: number;
    length: number;
    text: string;
    highlight: string;
  }>;
}

export function SearchPanel({ files, currentFile, onSelectFile }: SearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [regexEnabled, setRegexEnabled] = useState(false);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      let searchRegex: RegExp;
      if (regexEnabled) {
        searchRegex = new RegExp(
          searchTerm,
          caseSensitive ? 'g' : 'gi'
        );
      } else {
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wordBoundary = wholeWord ? '\\b' : '';
        searchRegex = new RegExp(
          `${wordBoundary}${escapedTerm}${wordBoundary}`,
          caseSensitive ? 'g' : 'gi'
        );
      }

      const results: SearchResult[] = [];
      const contentFiles = files.filter((f) => !f.is_folder && f.content);

      contentFiles.forEach((file) => {
        const content = file.content || '';
        const lines = content.split('\n');
        const matches: SearchResult['matches'] = [];

        lines.forEach((line, lineIndex) => {
          let match: RegExpExecArray | null;
          searchRegex.lastIndex = 0;

          while ((match = searchRegex.exec(line)) !== null) {
            const start = Math.max(0, match.index - 30);
            const end = Math.min(line.length, match.index + match[0].length + 30);
            const highlight = line.slice(start, end);

            matches.push({
              line: lineIndex + 1,
              column: match.index + 1,
              length: match[0].length,
              text: line,
              highlight,
            });
          }
        });

        if (matches.length > 0) {
          results.push({ file, matches });
        }
      });

      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
  };

  const totalMatches = searchResults.reduce((acc, r) => acc + r.matches.length, 0);

  return (
    <div className="h-full flex flex-col bg-slate-800/50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Search
        </span>
        <button
          onClick={() => setShowReplace(!showReplace)}
          className={clsx(
            'p-1 rounded transition-colors',
            showReplace
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-slate-400 hover:text-white'
          )}
          title="Toggle Replace"
        >
          <Replace className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search files..."
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        {showReplace && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with..."
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={clsx(
              'px-2 py-1 rounded border border-slate-600 transition-colors',
              caseSensitive
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            )}
          >
            Aa
          </button>
          <button
            onClick={() => setWholeWord(!wholeWord)}
            className={clsx(
              'px-2 py-1 rounded border border-slate-600 transition-colors',
              wholeWord
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            )}
          >
            ab
          </button>
          <button
            onClick={() => setRegexEnabled(!regexEnabled)}
            className={clsx(
              'px-2 py-1 rounded border border-slate-600 transition-colors',
              regexEnabled
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            )}
          >
            .*
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {searchResults.length > 0 ? (
          <div className="p-2">
            <div className="text-xs text-slate-400 mb-2 px-2">
              {totalMatches} result{totalMatches !== 1 ? 's' : ''} in{' '}
              {searchResults.length} file{searchResults.length !== 1 ? 's' : ''}
            </div>

            {searchResults.map((result) => (
              <div key={result.file.id} className="mb-2">
                <button
                  onClick={() => onSelectFile(result.file)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-700/50',
                    currentFile === result.file.id && 'bg-slate-700/30'
                  )}
                >
                  <File className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300 truncate">
                    {result.file.path}
                  </span>
                  <span className="text-xs text-slate-500 ml-auto">
                    {result.matches.length}
                  </span>
                </button>

                <div className="ml-6 mt-1 space-y-0.5">
                  {result.matches.slice(0, 5).map((match, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectFile(result.file)}
                      className="w-full text-left px-2 py-1 text-xs text-slate-400 hover:bg-slate-700/30 rounded font-mono truncate"
                    >
                      <span className="text-slate-500">{match.line}:</span>{' '}
                      {match.highlight.substring(0, match.highlight.indexOf(searchTerm))}
                      <span className="bg-yellow-500/20 text-yellow-400">
                        {match.highlight.substring(
                          match.highlight.indexOf(searchTerm),
                          match.highlight.indexOf(searchTerm) + searchTerm.length
                        )}
                      </span>
                      {match.highlight.substring(
                        match.highlight.indexOf(searchTerm) + searchTerm.length
                      )}
                    </button>
                  ))}
                  {result.matches.length > 5 && (
                    <div className="px-2 py-1 text-xs text-slate-500">
                      +{result.matches.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="p-4 text-center text-sm text-slate-500">
            No results found
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-slate-500">
            Enter a search term to find in files
          </div>
        )}
      </div>
    </div>
  );
}
