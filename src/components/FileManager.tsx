import { LoadedFile } from "../types";

interface FileManagerProps {
  loadedFiles: LoadedFile[];
  currentFileId: string | null;
  text: string;
  onTextChange: (text: string) => void;
  onSwitchFile: (fileId: string) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
  onNewFile: () => void;
  onImportFile: () => void;
  onSaveScript: () => void;
  onMaximizeEditor: () => void;
  recentFiles: Array<{ name: string; path: string }>;
  onOpenRecentFile: (path: string) => void;
}

export function FileManager({
  loadedFiles,
  currentFileId,
  text,
  onTextChange,
  onSwitchFile,
  onRemoveFile,
  onClearAll,
  onRefresh,
  onNewFile,
  onImportFile,
  onSaveScript,
  onMaximizeEditor,
  recentFiles,
  onOpenRecentFile,
}: FileManagerProps) {
  return (
    <>
      <div className="rail-header">
        <span className="title">Scripts</span>
        <span className="file-count">{loadedFiles.length}</span>
      </div>

      <div className="rail-content">
        <div className="file-actions">
          <button className="btn btn-ghost" onClick={onNewFile} title="Create new script">
            + New
          </button>
          <button className="btn btn-ghost" onClick={onImportFile} title="Import file from disk">
            Import
          </button>
          <button className="btn btn-ghost" onClick={onRefresh} title="Refresh scripts folder">
            ↻
          </button>
        </div>

        {recentFiles.length > 0 && (
          <div style={{ padding: "0 12px 8px" }}>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onOpenRecentFile(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="" disabled>Recent files…</option>
              {recentFiles.map((f) => (
                <option key={f.path} value={f.path}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        {loadedFiles.length === 0 ? (
          <div className="file-empty">
            <p>No scripts loaded</p>
            <p className="hint">Add .txt or .md files to <code>scripts/</code></p>
            <button className="btn btn-ghost" onClick={onRefresh}>
              Reload
            </button>
          </div>
        ) : (
          <div className="file-list">
            {loadedFiles.map((file) => (
              <div
                key={file.id}
                className="file-item"
                data-active={currentFileId === file.id}
                onClick={() => onSwitchFile(file.id)}
                title={file.path}
              >
                <div className="file-item-info">
                  <div className="file-item-name">{file.name}</div>
                  <div className="file-item-meta">
                    {new Date(file.loadedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {currentFileId === file.id && <div className="file-item-active-dot" />}
                <button
                  className="file-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
                  title="Remove from list"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {loadedFiles.length > 0 && (
          <div style={{ padding: "8px 12px" }}>
            <button className="btn btn-ghost btn-full" onClick={onClearAll}>
              Clear all
            </button>
          </div>
        )}

        <div className="rail-header" style={{ marginTop: 8 }}>
          <span className="title">Editor</span>
          <button
            className="icon-btn"
            onClick={onMaximizeEditor}
            title="Maximize editor"
            style={{ width: 22, height: 22 }}
          >
            ⛶
          </button>
        </div>
        <div style={{ padding: 12 }}>
          <div className="editor-host">
            <textarea
              className="editor-textarea"
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Paste your script, or pick one from the list above…"
              rows={6}
            />
          </div>
          <div className="editor-meta">
            <span>{text.length.toLocaleString()} chars</span>
            <span>{text.split(/\n/).length.toLocaleString()} lines</span>
          </div>
          <button
            className="btn btn-ghost btn-full"
            onClick={onSaveScript}
            style={{ marginTop: 8 }}
          >
            Save script
          </button>
        </div>
      </div>
    </>
  );
}
