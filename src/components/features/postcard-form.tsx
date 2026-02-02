"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lightbulb, Sparkles, Target, Gem, Save } from "lucide-react";
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
import type { Postcard } from "@/types/database";

const postcardSchema = z.object({
  training_title: z.string().min(1, "Training title is required"),
  elevator_pitch: z.string().optional(),
  lightbulb_moment: z.string().optional(),
  programme_impact: z.string().optional(),
  golden_nugget: z.string().optional(),
});

type PostcardForm = z.infer<typeof postcardSchema>;

interface PostcardFormProps {
  postcard?: Postcard;
  userId: string;
}

const sections = [
  {
    name: "elevator_pitch" as const,
    label: "Elevator Pitch",
    description: "Summarize the training in 30 seconds or less",
    icon: Sparkles,
    color: "text-mcr-light-blue",
    bgColor: "bg-mcr-light-blue/10",
    placeholder: "If I had to explain this training to a colleague in the lift...",
  },
  {
    name: "lightbulb_moment" as const,
    label: "Lightbulb Moment",
    description: "What was your biggest 'aha!' moment?",
    icon: Lightbulb,
    color: "text-mcr-yellow",
    bgColor: "bg-mcr-yellow/10",
    placeholder: "The thing that really made me think differently was...",
  },
  {
    name: "programme_impact" as const,
    label: "Programme Impact",
    description: "How will this change your work with young people?",
    icon: Target,
    color: "text-mcr-orange",
    bgColor: "bg-mcr-orange/10",
    placeholder: "I'll apply this by...",
  },
  {
    name: "golden_nugget" as const,
    label: "Golden Nugget",
    description: "One key takeaway to share with colleagues",
    icon: Gem,
    color: "text-mcr-green",
    bgColor: "bg-mcr-green/10",
    placeholder: "The one thing everyone should know is...",
  },
];

export function PostcardForm({ postcard, userId }: PostcardFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!postcard;

  const form = useForm<PostcardForm>({
    resolver: zodResolver(postcardSchema),
    defaultValues: {
      training_title: postcard?.training_title ?? "",
      elevator_pitch: postcard?.elevator_pitch ?? "",
      lightbulb_moment: postcard?.lightbulb_moment ?? "",
      programme_impact: postcard?.programme_impact ?? "",
      golden_nugget: postcard?.golden_nugget ?? "",
    },
  });

  async function onSubmit(data: PostcardForm) {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("postcards")
          .update(data)
          .eq("id", postcard.id);

        if (error) throw error;
        toast.success("Postcard updated successfully");
      } else {
        const { error } = await supabase.from("postcards").insert({
          ...data,
          author_id: userId,
        });

        if (error) throw error;
        toast.success("Postcard created successfully");
      }

      router.push("/postcards");
      router.refresh();
    } catch (error) {
      toast.error(isEditing ? "Failed to update postcard" : "Failed to create postcard");
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
                  placeholder="e.g., Trauma-Informed Practice Workshop"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.name}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${section.bgColor}`}>
                      <Icon className={`h-4 w-4 ${section.color}`} />
                    </div>
                    {section.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name={section.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormDescription className="mb-2">
                          {section.description}
                        </FormDescription>
                        <FormControl>
                          <Textarea
                            placeholder={section.placeholder}
                            className="min-h-[120px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

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
              ? "Update Postcard"
              : "Save Postcard"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
