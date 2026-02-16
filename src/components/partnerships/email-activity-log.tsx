import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmailItem {
  id: string;
  sender: string;
  recipient: string | null;
  subject: string;
  content: string | null;
  status: "draft" | "sent" | "received" | "opened";
  thread_id: string | null;
  date: string;
}

interface EmailActivityLogProps {
  emails: EmailItem[];
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-50 text-blue-600",
  received: "bg-indigo-50 text-indigo-600",
  opened: "bg-emerald-50 text-emerald-600",
};

export function EmailActivityLog({ emails }: EmailActivityLogProps) {
  return (
    <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Mail size={18} className="text-slate-400" />
        Email Activity
      </h3>
      {emails.length === 0 ? (
        <p className="text-sm text-slate-400">No emails yet.</p>
      ) : (
        <div className="space-y-4 text-xs">
          {emails.map((email) => (
            <div
              key={email.id}
              className="pb-3 border-b border-slate-50 last:border-0 last:pb-0"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-indigo-600">
                  {email.sender}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${statusColors[email.status] || ""}`}
                  >
                    {email.status}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(email.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
              <p className="font-medium text-slate-800 mb-1">
                {email.subject}
              </p>
              {email.content && (
                <p className="text-slate-500 line-clamp-2 leading-relaxed">
                  {email.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
