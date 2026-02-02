"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, RefreshCw, HelpCircle, Save } from "lucide-react";
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
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { ThreeTwoOne } from "@/types/database";

const threeTwoOneSchema = z.object({
  training_title: z.string().min(1, "Training title is required"),
  learning1: z.string().min(1, "Please enter your first learning"),
  learning2: z.string().min(1, "Please enter your second learning"),
  learning3: z.string().min(1, "Please enter your third learning"),
  change1: z.string().min(1, "Please enter your first change"),
  change2: z.string().min(1, "Please enter your second change"),
  question: z.string().optional(),
});

type ThreeTwoOneForm = z.infer<typeof threeTwoOneSchema>;

interface ThreeTwoOneFormProps {
  threeTwoOne?: ThreeTwoOne;
  userId: string;
}

export function ThreeTwoOneForm({ threeTwoOne, userId }: ThreeTwoOneFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!threeTwoOne;

  const form = useForm<ThreeTwoOneForm>({
    resolver: zodResolver(threeTwoOneSchema),
    defaultValues: {
      training_title: threeTwoOne?.training_title ?? "",
      learning1: threeTwoOne?.learnings?.[0] ?? "",
      learning2: threeTwoOne?.learnings?.[1] ?? "",
      learning3: threeTwoOne?.learnings?.[2] ?? "",
      change1: threeTwoOne?.changes?.[0] ?? "",
      change2: threeTwoOne?.changes?.[1] ?? "",
      question: threeTwoOne?.question ?? "",
    },
  });

  async function onSubmit(data: ThreeTwoOneForm) {
    setIsSubmitting(true);
    const supabase = createClient();

    const payload = {
      training_title: data.training_title,
      learnings: [data.learning1, data.learning2, data.learning3],
      changes: [data.change1, data.change2],
      question: data.question || null,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("three_two_one")
          .update(payload)
          .eq("id", threeTwoOne.id);

        if (error) throw error;
        toast.success("3-2-1 updated successfully");
      } else {
        const { error } = await supabase.from("three_two_one").insert({
          ...payload,
          author_id: userId,
        });

        if (error) throw error;
        toast.success("3-2-1 created successfully");
      }

      router.push("/three-two-one");
      router.refresh();
    } catch (error) {
      toast.error(isEditing ? "Failed to update 3-2-1" : "Failed to create 3-2-1");
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
          name="training_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Training / Conference Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Leadership Development Workshop"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3 Learnings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-light-blue/10">
                <BookOpen className="h-4 w-4 text-mcr-light-blue" />
              </div>
              <div>
                <div>3 Things I Learned</div>
                <div className="text-xs font-normal text-muted-foreground">
                  Key takeaways from the training
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((num) => (
              <FormField
                key={num}
                control={form.control}
                name={`learning${num}` as "learning1" | "learning2" | "learning3"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">
                      Learning {num}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`What was your ${num === 1 ? "first" : num === 2 ? "second" : "third"} key learning?`}
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* 2 Changes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-orange/10">
                <RefreshCw className="h-4 w-4 text-mcr-orange" />
              </div>
              <div>
                <div>2 Things I&apos;ll Change</div>
                <div className="text-xs font-normal text-muted-foreground">
                  Actions or behaviors I&apos;ll do differently
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2].map((num) => (
              <FormField
                key={num}
                control={form.control}
                name={`change${num}` as "change1" | "change2"}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-muted-foreground">
                      Change {num}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`What will you do differently?`}
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* 1 Question */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mcr-teal/10">
                <HelpCircle className="h-4 w-4 text-mcr-teal" />
              </div>
              <div>
                <div>1 Question I Still Have</div>
                <div className="text-xs font-normal text-muted-foreground">
                  Something you&apos;d like to explore further
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="What question would you like to explore further?"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              ? "Update 3-2-1"
              : "Save 3-2-1"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
