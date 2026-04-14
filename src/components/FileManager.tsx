import { LoadedFile } from "../types";

interface FileManagerProps {
  loadedFiles: LoadedFile[];
  currentFileId: string | null;
  onSwitchFile: (fileId: string) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
  onHide: () => void;
}

export function FileManager({
  loadedFiles,
  currentFileId,
  onSwitchFile,
  onRemoveFile,
  onClearAll,
  onRefresh,
  onHide,
}: FileManagerProps) {
  return (
    <div className="file-manager-panel">
      <div className="file-manager-header">
        <h3>📁 Loaded Files</h3>
        <button className="file-manager-toggle" onClick={onHide} title="Hide file manager">
          ‹
        </button>
      </div>
      <div className="file-manager-content">
        {loadedFiles.length === 0 ? (
          <div className="file-manager-empty">
            <p>No files loaded</p>
            <p className="file-manager-hint">Add .txt or .md files to the 'scripts/' directory</p>
            <button className="file-manager-refresh-btn-empty" onClick={onRefresh}>
              🔄 Load Scripts
            </button>
          </div>
        ) : (
          <>
            <div className="file-manager-actions">
              <button
                className="file-manager-refresh-btn"
                onClick={onRefresh}
                title="Refresh scripts from directory"
              >
                🔄 Refresh
              </button>
              <button className="file-manager-clear-btn" onClick={onClearAll} title="Clear all files">
                Clear All
              </button>
              <span className="file-count">
                {loadedFiles.length} file{loadedFiles.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="file-list">
              {loadedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`file-item ${currentFileId === file.id ? "active" : ""}`}
                  onClick={() => onSwitchFile(file.id)}
                >
                  <div className="file-info">
                    <div className="file-name" title={file.name}>
                      {currentFileId === file.id && (
                        <span className="file-active-indicator">●</span>
                      )}
                      {file.name}
                      <span className="file-watching-indicator" title="Watching for changes">
                        👁️
                      </span>
                    </div>
                    <div className="file-date">
                      {new Date(file.loadedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <button
                    className="file-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface FileManagerToggleProps {
  onShow: () => void;
}

export function FileManagerToggle({ onShow }: FileManagerToggleProps) {
  return (
    <button className="file-manager-show-btn" onClick={onShow} title="Show file manager">
      📁 ›
    </button>
  );
}
