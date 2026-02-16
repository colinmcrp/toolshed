"use client";

import { useState, useTransition } from "react";
import { createEmail } from "@/lib/partnerships/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

interface EmailComposeModalProps {
  partnerId: string;
  senderEmail?: string;
}

export function EmailComposeModal({
  partnerId,
  senderEmail = "staff@mcrpathways.org",
}: EmailComposeModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const handleSend = (asDraft: boolean) => {
    startTransition(async () => {
      await createEmail({
        partner_id: partnerId,
        sender: senderEmail,
        recipient: to,
        subject,
        content: body,
        status: asDraft ? "draft" : "sent",
      });
      setOpen(false);
      setTo("");
      setSubject("");
      setBody("");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail size={14} />
          Compose Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              placeholder="recipient@partner.org"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Write your message..."
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => handleSend(true)}
              disabled={isPending || !subject}
            >
              Save Draft
            </Button>
            <Button
              onClick={() => handleSend(false)}
              disabled={isPending || !to || !subject}
            >
              {isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
