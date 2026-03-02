"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Upload,
  FileText,
  X,
  Lock,
  Eye,
  EyeOff,
  Download,
  Shield,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MIN_PASSWORD_LENGTH = 12;
const ZIP_AES_256_STRENGTH = 3;

const ENCRYPTION_METHODS = {
  AES256: "aes256",
  ZIP_CRYPTO: "zipcrypto",
} as const;

type EncryptionMethod = (typeof ENCRYPTION_METHODS)[keyof typeof ENCRYPTION_METHODS];

function getRandomChar(charset: string): string {
  const randomValues = new Uint32Array(1);
  const limit = 0xffffffff - (0xffffffff % charset.length);
  let randomValue: number;
  do {
    crypto.getRandomValues(randomValues);
    randomValue = randomValues[0];
  } while (randomValue >= limit);
  return charset[randomValue % charset.length];
}

function generatePassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = upper + lower + digits + symbols;

  const picks = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(symbols),
  ];
  for (let i = 4; i < length; i++) {
    picks.push(getRandomChar(all));
  }
  // Shuffle to randomize placement of guaranteed characters
  const shuffleBytes = new Uint8Array(length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = picks.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.join("");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getPasswordStrength(pw: string) {
  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 2)
    return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
  if (score <= 3)
    return { label: "Fair", color: "bg-yellow-500", width: "w-1/2" };
  if (score <= 4)
    return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
  return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
}

function isPasswordPolicySatisfied(pw: string): boolean {
  return (
    pw.length >= MIN_PASSWORD_LENGTH &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^a-zA-Z0-9]/.test(pw)
  );
}

function sanitizeZipEntryName(filename: string): string {
  const basename = filename.replace(/\\/g, "/").split("/").pop() ?? "";
  const sanitized = basename
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim();
  if (!sanitized || /^\.+$/.test(sanitized)) return "file";
  return sanitized.slice(0, 255);
}

function makeUniqueZipEntryName(filename: string, usedNames: Set<string>): string {
  if (!usedNames.has(filename)) {
    usedNames.add(filename);
    return filename;
  }

  const extIndex = filename.lastIndexOf(".");
  const hasExt = extIndex > 0;
  const base = hasExt ? filename.slice(0, extIndex) : filename;
  const ext = hasExt ? filename.slice(extIndex) : "";

  let counter = 2;
  let candidate = `${base} (${counter})${ext}`;
  while (usedNames.has(candidate)) {
    counter++;
    candidate = `${base} (${counter})${ext}`;
  }
  usedNames.add(candidate);
  return candidate;
}

type AppState = "idle" | "processing" | "done" | "error";

type EncryptionMethodOptionProps = {
  method: EncryptionMethod;
  label: string;
  badge: { text: string; className: string };
  description: string;
  currentMethod: EncryptionMethod;
  onClick: (method: EncryptionMethod) => void;
  disabled: boolean;
};

function EncryptionMethodOption({
  method,
  label,
  badge,
  description,
  currentMethod,
  onClick,
  disabled,
}: EncryptionMethodOptionProps) {
  const isSelected = currentMethod === method;
  return (
    <button
      role="radio"
      aria-checked={isSelected}
      type="button"
      onClick={() => onClick(method)}
      disabled={disabled}
      className={`rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? "border-emerald-500 bg-emerald-500/5"
          : "border-border hover:border-muted-foreground/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
          {badge.text}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

export function SecureZipCreator() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<AppState>("idle");
  const [encryptionMethod, setEncryptionMethod] = useState<EncryptionMethod>(ENCRYPTION_METHODS.AES256);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files]
  );
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordPolicySatisfied = useMemo(
    () => isPasswordPolicySatisfied(password),
    [password]
  );
  const canCreate = files.length > 0 && passwordPolicySatisfied;

  // Revoke object URL on change or unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    setFiles((prev) => {
      const existing = new Set(
        prev.map((f) => f.name + f.size + f.lastModified)
      );
      const unique = arr.filter(
        (f) => !existing.has(f.name + f.size + f.lastModified)
      );
      return [...prev, ...unique];
    });
    setState("idle");
    setDownloadUrl(null);
    setError("");
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setState("idle");
    setDownloadUrl(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const createZip = async () => {
    if (!canCreate) return;
    setState("processing");
    setProgress("Initializing...");
    setError("");
    setDownloadUrl(null);

    try {
      const zip = await import("@zip.js/zip.js");
      zip.configure({ useWebWorkers: true });
      const { BlobWriter, BlobReader, ZipWriter } = zip;

      const blobWriter = new BlobWriter("application/zip");
      const zipWriter = new ZipWriter(blobWriter, {
        password,
        ...(encryptionMethod === ENCRYPTION_METHODS.AES256
          ? { encryptionStrength: ZIP_AES_256_STRENGTH }
          : { zipCrypto: true }),
      });
      const usedEntryNames = new Set<string>();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Encrypting ${file.name} (${i + 1}/${files.length})...`);
        const reader = new BlobReader(file);
        const entryName = makeUniqueZipEntryName(
          sanitizeZipEntryName(file.name),
          usedEntryNames
        );
        await zipWriter.add(entryName, reader);
      }

      setProgress("Finalizing archive...");
      const blob = await zipWriter.close();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setState("done");
      setProgress("");
    } catch (err) {
      console.error("ZIP creation failed:", err);
      setState("error");
      setError(
        err instanceof Error ? err.message : "Failed to create ZIP file."
      );
      setProgress("");
    }
  };

  const triggerDownload = () => {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "encrypted.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => {
    setFiles([]);
    setPassword(generatePassword());
    setEncryptionMethod(ENCRYPTION_METHODS.AES256);
    setState("idle");
    setProgress("");
    setError("");
    setDownloadUrl(null);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge
          variant="secondary"
          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
        >
          <Shield className="mr-1 h-3 w-3" />
          100% Client-Side Encryption
        </Badge>
        <p className="text-sm text-muted-foreground">
          Encrypt files with {encryptionMethod === ENCRYPTION_METHODS.AES256 ? "AES-256" : "ZipCrypto"} directly in your browser. Nothing leaves
          your device.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-border hover:border-muted-foreground/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload
          className={`mx-auto h-8 w-8 ${
            dragOver ? "text-emerald-500" : "text-muted-foreground"
          }`}
        />
        <p className="mt-3 text-sm font-medium">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Any file type, any number of files
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {files.length} file{files.length !== 1 && "s"}
            </span>
            <span className="text-muted-foreground">
              {formatBytes(totalSize)} total
            </span>
          </div>
          <Card>
            <CardContent className="max-h-48 overflow-y-auto space-y-1 p-2">
              {files.map((file, i) => (
                <div
                  key={file.name + file.size + file.lastModified}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    disabled={state === "processing"}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Password */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Encryption Password
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 12 chars, upper/lower/number/symbol"
              className="pr-10 font-mono text-sm"
              disabled={state === "processing"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPassword(generatePassword())}
            title="Generate new password"
            disabled={state === "processing"}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {password.length > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Strength: {strength.label}
              {!passwordPolicySatisfied &&
                " - use 12+ chars with upper, lower, number, and symbol"}
            </p>
          </div>
        )}
      </div>

      {/* Encryption Method */}
      <div className="space-y-2">
        <Label id="encryption-method-label" className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          Encryption Method
        </Label>
        <div role="radiogroup" aria-labelledby="encryption-method-label" className="grid grid-cols-2 gap-2">
          <EncryptionMethodOption
            method={ENCRYPTION_METHODS.AES256}
            label="AES-256"
            badge={{ text: "Recommended", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }}
            description="Strong encryption. Works with 7-Zip, WinZip, and macOS."
            currentMethod={encryptionMethod}
            onClick={setEncryptionMethod}
            disabled={state === "processing" || state === "done"}
          />
          <EncryptionMethodOption
            method={ENCRYPTION_METHODS.ZIP_CRYPTO}
            label="ZipCrypto"
            badge={{ text: "Legacy", className: "" }}
            description="Maximum compatibility. Works with all ZIP tools including older ones."
            currentMethod={encryptionMethod}
            onClick={setEncryptionMethod}
            disabled={state === "processing" || state === "done"}
          />
        </div>
        {encryptionMethod === ENCRYPTION_METHODS.ZIP_CRYPTO && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            ZipCrypto has known vulnerabilities. Use AES-256 for sensitive files.
          </div>
        )}
      </div>

      {/* Action */}
      {state === "done" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Archive created and encrypted successfully.
          </div>
          <div className="flex gap-2">
            <Button
              onClick={triggerDownload}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Download encrypted.zip
            </Button>
            <Button variant="outline" onClick={reset}>
              New
            </Button>
          </div>
        </div>
      ) : (
        <>
          {state === "error" && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Button
            onClick={createZip}
            disabled={!canCreate || state === "processing"}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {state === "processing" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {progress}
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Create Secure ZIP
              </>
            )}
          </Button>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Files are processed entirely in your browser using {encryptionMethod === ENCRYPTION_METHODS.AES256 ? "AES-256" : "ZipCrypto"} encryption.
        No data is transmitted to any server.
      </p>
    </div>
  );
}
