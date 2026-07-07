import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type Tone = "info" | "success" | "warning" | "danger";

interface AlertOpts {
  title?: string;
  message: string;
  tone?: Tone;
  okLabel?: string;
}

interface ConfirmOpts {
  title?: string;
  message: string;
  tone?: Tone;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PromptOpts {
  title?: string;
  message: string;
  tone?: Tone;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  multiline?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: "text" | "number" | "email" | "tel";
  validate?: (value: string) => string | null;
}

interface DialogContextValue {
  alert: (opts: AlertOpts | string) => Promise<void>;
  confirm: (opts: ConfirmOpts | string) => Promise<boolean>;
  prompt: (opts: PromptOpts | string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const TONE_CONFIG: Record<Tone, { ring: string; iconBg: string; iconColor: string; btn: string; Icon: React.ElementType }> = {
  info: { ring: "ring-blue-100", iconBg: "bg-blue-100", iconColor: "text-blue-600", btn: "bg-movezy-600 hover:bg-movezy-700", Icon: Info },
  success: { ring: "ring-green-100", iconBg: "bg-green-100", iconColor: "text-green-600", btn: "bg-green-600 hover:bg-green-700", Icon: CheckCircle2 },
  warning: { ring: "ring-yellow-100", iconBg: "bg-yellow-100", iconColor: "text-yellow-600", btn: "bg-yellow-600 hover:bg-yellow-700", Icon: AlertTriangle },
  danger: { ring: "ring-red-100", iconBg: "bg-red-100", iconColor: "text-red-600", btn: "bg-red-600 hover:bg-red-700", Icon: XCircle },
};

type ResolverKind = "alert" | "confirm" | "prompt";
interface DialogState {
  kind: ResolverKind;
  title: string;
  message: string;
  tone: Tone;
  confirmLabel: string;
  cancelLabel?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  multiline?: boolean;
  inputType?: "text" | "number" | "email" | "tel";
  validate?: (value: string) => string | null;
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef<((v: unknown) => void) | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const open = useCallback(<T,>(next: DialogState): Promise<T> => {
    setState(next);
    setValue(next.defaultValue ?? "");
    setError(null);
    return new Promise<T>((resolve) => {
      resolverRef.current = resolve as (v: unknown) => void;
    });
  }, []);

  const close = useCallback((result: unknown) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
    setValue("");
    setError(null);
  }, []);

  useEffect(() => {
    if (state && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(state.kind === "confirm" ? false : state.kind === "prompt" ? null : undefined);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, close]);

  const handleConfirm = useCallback(() => {
    if (!state) return;
    if (state.kind === "prompt") {
      if (state.required && !value.trim()) {
        setError("This field is required.");
        return;
      }
      if (state.validate) {
        const v = state.validate(value);
        if (v) {
          setError(v);
          return;
        }
      }
      close(value);
    } else if (state.kind === "confirm") {
      close(true);
    } else {
      close(undefined);
    }
  }, [state, value, close]);

  const handleCancel = useCallback(() => {
    if (!state) return;
    close(state.kind === "confirm" ? false : state.kind === "prompt" ? null : undefined);
  }, [state, close]);

  const api: DialogContextValue = {
    alert: (opts) => {
      const o = typeof opts === "string" ? { message: opts } : opts;
      return open<void>({
        kind: "alert",
        title: o.title || "Notice",
        message: o.message,
        tone: o.tone || "info",
        confirmLabel: o.okLabel || "OK",
      });
    },
    confirm: (opts) => {
      const o = typeof opts === "string" ? { message: opts } : opts;
      return open<boolean>({
        kind: "confirm",
        title: o.title || "Are you sure?",
        message: o.message,
        tone: o.tone || "warning",
        confirmLabel: o.confirmLabel || "Confirm",
        cancelLabel: o.cancelLabel || "Cancel",
      });
    },
    prompt: (opts) => {
      const o = typeof opts === "string" ? { message: opts } : opts;
      return open<string | null>({
        kind: "prompt",
        title: o.title || "Enter value",
        message: o.message,
        tone: o.tone || "info",
        confirmLabel: o.confirmLabel || "Submit",
        cancelLabel: o.cancelLabel || "Cancel",
        placeholder: o.placeholder,
        defaultValue: o.defaultValue,
        required: o.required,
        multiline: o.multiline,
        inputType: o.inputType || "text",
        validate: o.validate,
      });
    },
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          {(() => {
            const cfg = TONE_CONFIG[state.tone];
            const TIcon = cfg.Icon;
            return (
              <div
                role="dialog"
                aria-modal="true"
                className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-4 ${cfg.ring}`}
              >
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
                    <TIcon className={`w-6 h-6 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="text-base font-bold text-gray-900">{state.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{state.message}</p>

                    {state.kind === "prompt" && (
                      <div className="mt-3">
                        {state.multiline ? (
                          <textarea
                            ref={(el) => { inputRef.current = el; }}
                            value={value}
                            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
                            placeholder={state.placeholder}
                            rows={3}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm resize-none ${
                              error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-movezy-200 focus:border-movezy-400"
                            }`}
                          />
                        ) : (
                          <input
                            ref={(el) => { inputRef.current = el; }}
                            type={state.inputType}
                            value={value}
                            onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleConfirm();
                              }
                            }}
                            placeholder={state.placeholder}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                              error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-movezy-200 focus:border-movezy-400"
                            }`}
                          />
                        )}
                        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleCancel}
                    className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 pb-4 pt-1 flex items-center justify-end gap-2 bg-gray-50/50">
                  {(state.kind === "confirm" || state.kind === "prompt") && (
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      {state.cancelLabel}
                    </button>
                  )}
                  <button
                    onClick={handleConfirm}
                    className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${cfg.btn}`}
                    autoFocus={state.kind !== "prompt"}
                  >
                    {state.confirmLabel}
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextValue => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used inside <DialogProvider>");
  return ctx;
};

// Imperative access for non-component code (e.g. services/admin-api.ts error handlers).
// Set by the provider at mount.
let imperativeDialog: DialogContextValue | null = null;
export const setImperativeDialog = (d: DialogContextValue | null) => {
  imperativeDialog = d;
};
export const dialog = {
  alert: (opts: AlertOpts | string) =>
    imperativeDialog ? imperativeDialog.alert(opts) : Promise.resolve(window.alert(typeof opts === "string" ? opts : opts.message)),
  confirm: (opts: ConfirmOpts | string) =>
    imperativeDialog
      ? imperativeDialog.confirm(opts)
      : Promise.resolve(window.confirm(typeof opts === "string" ? opts : opts.message)),
  prompt: (opts: PromptOpts | string) =>
    imperativeDialog
      ? imperativeDialog.prompt(opts)
      : Promise.resolve(window.prompt(typeof opts === "string" ? opts : opts.message)),
};
