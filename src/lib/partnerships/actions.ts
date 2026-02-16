"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TaskInsert, EmailInsert } from "@/types/database";

export async function createTask(data: Omit<TaskInsert, "id" | "created_at" | "updated_at">) {
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  revalidatePath(`/partnerships/${data.partner_id}`);
  return task;
}

export async function updateTask(
  id: string,
  data: {
    status?: "To Do" | "In Progress" | "Completed";
    title?: string;
    priority?: "Low" | "Medium" | "High";
    due_date?: string;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/partnerships");
}

export async function createEmail(data: Omit<EmailInsert, "id" | "created_at">) {
  const supabase = await createClient();
  const { data: email, error } = await supabase
    .from("emails")
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  revalidatePath(`/partnerships/${data.partner_id}`);
  return email;
}

export async function updateEmailStatus(id: string, status: "draft" | "sent" | "received" | "opened") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("emails")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/partnerships");
}

export async function updatePartnerHeat(partnerId: string, heat: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("partners")
    .update({ heat, updated_at: new Date().toISOString() })
    .eq("id", partnerId);

  if (error) throw error;
  revalidatePath(`/partnerships/${partnerId}`);
}

export async function updateGoalProgress(id: string, current: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ current, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/partnerships");
}
