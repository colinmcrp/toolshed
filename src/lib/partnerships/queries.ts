import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { PartnerWithRelations } from "@/types/partnerships";

export const getPartners = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("name");

  if (error) throw error;
  return data;
});

export const getPartnerById = cache(async (id: string): Promise<PartnerWithRelations | null> => {
  const supabase = await createClient();

  const { data: partner, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !partner) return null;

  const [goals, documents, commitments, tasks, emails] = await Promise.all([
    supabase.from("goals").select("*").eq("partner_id", id).order("deadline"),
    supabase.from("documents").select("*").eq("partner_id", id).order("date", { ascending: false }),
    supabase.from("commitments").select("*").eq("partner_id", id),
    supabase.from("tasks").select("*").eq("partner_id", id).order("due_date"),
    supabase.from("emails").select("*").eq("partner_id", id).order("date", { ascending: false }),
  ]);

  return {
    ...partner,
    goals: goals.data ?? [],
    documents: documents.data ?? [],
    commitments: commitments.data ?? [],
    tasks: tasks.data ?? [],
    emails: emails.data ?? [],
  } as PartnerWithRelations;
});

export const getPartnerForCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("partner_id")
    .eq("id", user.id)
    .single();

  if (!profile?.partner_id) return null;

  return getPartnerById(profile.partner_id);
});

export const getPartnerEmails = cache(async (partnerId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("partner_id", partnerId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
});

export const getPartnerTasks = cache(async (partnerId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("partner_id", partnerId)
    .order("due_date");

  if (error) throw error;
  return data;
});

export const getPartnerDocuments = cache(async (partnerId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("partner_id", partnerId)
    .order("date", { ascending: false });

  if (error) throw error;
  return data;
});

export const getPartnerGoals = cache(async (partnerId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("partner_id", partnerId)
    .order("deadline");

  if (error) throw error;
  return data;
});

export const getUserProfile = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
});
