"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Presentation, Plus, Trash2, Save, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Takeover } from "@/types/database";

const takeoverSchema = z.object({
  meeting_date: z.string().min(1, "Meeting date is required"),
  top_learnings: z.array(
    z.object({
      value: z.string().min(1, "Learning cannot be empty"),
    })
  ).min(1, "Add at least one learning"),
});

type TakeoverForm = z.infer<typeof takeoverSchema>;

interface TakeoverFormProps {
  takeover?: Takeover;
  userId: string;
}

export function TakeoverForm({ takeover, userId }: TakeoverFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!takeover;

  const form = useForm<TakeoverForm>({
    resolver: zodResolver(takeoverSchema),
    defaultValues: {
      meeting_date: takeover?.meeting_date ?? new Date().toISOString().split("T")[0],
      top_learnings: takeover?.top_learnings?.map((l) => ({ value: l })) ?? [
        { value: "" },
        { value: "" },
        { value: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "top_learnings",
  });

  async function onSubmit(data: TakeoverForm) {
    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      meeting_date: data.meeting_date,
      top_learnings: data.top_learnings.map((l) => l.value).filter((v) => v.trim()),
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("takeovers")
          .update(payload)
          .eq("id", takeover.id);

        if (error) throw error;
        toast.success("Takeover updated successfully");
      } else {
        const { error } = await supabase.from("takeovers").insert({
          ...payload,
          presenter_id: userId,
        });

        if (error) throw error;
        toast.success("Takeover created successfully");
      }

      router.push("/takeovers");
      router.refresh();
    } catch (error) {
      toast.error(isEditing ? "Failed to update takeover" : "Failed to create takeover");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="meeting_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Date</FormLabel>
              <FormControl>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription>
                When will you present this at a team meeting?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-teal/10">
                <Presentation className="h-4 w-4 text-mcr-teal" />
              </div>
              <div>
                <div>Top Learnings to Share</div>
                <div className="text-xs font-normal text-muted-foreground">
                  What will you share in your 10-minute takeover?
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`top_learnings.${index}.value`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Textarea
                          placeholder={`Learning point ${index + 1}`}
                          className="min-h-[80px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ value: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Learning Point
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting
              ? "Saving..."
              : isEditing
              ? "Update Takeover"
              : "Save Takeover"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
