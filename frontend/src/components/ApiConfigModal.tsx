import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Server, Key, RefreshCw, CheckCircle2, AlertTriangle, Database } from 'lucide-react';

export const ApiConfigModal: React.FC = () => {
  const { isApiModalOpen, setIsApiModalOpen, apiConfig, updateApiConfig, apiHealthStatus, checkApiHealth } = useApp();

  const [baseUrl, setBaseUrl] = useState<string>(apiConfig.baseUrl);
  const [token, setToken] = useState<string>(apiConfig.token);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(apiConfig.isLiveMode);

  if (!isApiModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    updateApiConfig({
      baseUrl: baseUrl.trim(),
      token: token.trim(),
      isLiveMode,
    });
    setIsApiModalOpen(false);
  };

  return (
    <div id="modal-api-config-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div id="modal-api-config-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Cấu Hình Backend FastAPI API
            </h3>
          </div>
          <button
            id="btn-close-api-config"
            onClick={() => setIsApiModalOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Mode Switcher */}
          <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  Chế độ kết nối API Live
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Bật để gọi trực tiếp các Endpoint RESTful v1 tới FastAPI server
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="toggle-live-mode"
                  type="checkbox"
                  checked={isLiveMode}
                  onChange={(e) => setIsLiveMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">
              FastAPI Base URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Server className="w-4 h-4 text-slate-400" />
              </div>
              <input
                id="input-api-base-url"
                type="url"
                placeholder="http://localhost:8000"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={!isLiveMode}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 transition-all"
              />
            </div>
          </div>

          {/* JWT Bearer Token */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">
              JWT Bearer Token (HTTPBearer)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Key className="w-4 h-4 text-slate-400" />
              </div>
              <input
                id="input-api-jwt-token"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={!isLiveMode}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Header sẽ gửi kèm: <code className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Authorization: Bearer &lt;token&gt;</code>
            </p>
          </div>


          {/* Health Check Bar */}
          {isLiveMode && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {apiHealthStatus === 'online' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Kết nối FastAPI /health thành công!</span>
                  </>
                )}
                {apiHealthStatus === 'offline' && (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Không thể kết nối tới Server</span>
                  </>
                )}
                {(apiHealthStatus === 'idle' || apiHealthStatus === 'checking') && (
                  <>
                    <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                    <span className="text-amber-600 dark:text-amber-400">Đang kiểm tra kết nối...</span>
                  </>
                )}
              </div>
              <button
                id="btn-test-health"
                type="button"
                onClick={checkApiHealth}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                Kiểm tra lại
              </button>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              id="btn-cancel-api-config"
              type="button"
              onClick={() => setIsApiModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              id="btn-save-api-config"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all"
            >
              Lưu Cấu Hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
