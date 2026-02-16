"use client";

import { useState, useTransition } from "react";
import { updateTask } from "@/lib/partnerships/actions";
import {
  LayoutGrid,
  List,
  Plus,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Circle,
} from "lucide-react";

type TaskStatus = "To Do" | "In Progress" | "Completed";

interface TaskItem {
  id: string;
  title: string;
  due_date: string | null;
  status: "To Do" | "In Progress" | "Completed";
  priority: "Low" | "Medium" | "High";
  assigned_to: string | null;
}

interface TaskBoardProps {
  tasks: TaskItem[];
}

export function TaskBoard({ tasks: initialTasks }: TaskBoardProps) {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isPending, startTransition] = useTransition();
  const statuses: TaskStatus[] = ["To Do", "In Progress", "Completed"];

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "Completed":
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case "In Progress":
        return <Clock size={16} className="text-indigo-500" />;
      default:
        return <Circle size={16} className="text-slate-300" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-rose-600 bg-rose-50";
      case "Medium":
        return "text-amber-600 bg-amber-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  const cycleStatus = (task: TaskItem) => {
    if (task.status === "Completed") return;
    const next: Record<TaskStatus, TaskStatus> = {
      "To Do": "In Progress",
      "In Progress": "Completed",
      "Completed": "Completed",
    };
    startTransition(async () => {
      await updateTask(task.id, { status: next[task.status] });
    });
  };

  if (viewMode === "kanban") {
    return (
      <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800">Partnership Task Board</h3>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <List size={18} />
            </button>
            <button className="p-1.5 rounded-md bg-white shadow-sm text-indigo-600">
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statuses.map((status) => (
            <div key={status} className="flex flex-col">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {status}
                  </span>
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {initialTasks.filter((t) => t.status === status).length}
                  </span>
                </div>
                <Plus
                  size={14}
                  className="text-slate-400 cursor-pointer hover:text-indigo-600"
                />
              </div>

              <div className="space-y-3 min-h-[200px] bg-slate-50/50 p-2 rounded-xl border border-dashed border-slate-200">
                {initialTasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}
                        >
                          {task.priority}
                        </span>
                        <MoreHorizontal
                          size={14}
                          className="text-slate-300 group-hover:text-slate-500"
                        />
                      </div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug mb-3">
                        {task.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Clock size={12} />
                          <span className="text-[10px] font-medium">
                            {task.due_date}
                          </span>
                        </div>
                        <button
                          onClick={() => cycleStatus(task)}
                          disabled={isPending}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                          Move →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800">Partnership Task Board</h3>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button className="p-1.5 rounded-md bg-white shadow-sm text-indigo-600">
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {initialTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
          >
            <button
              onClick={() => cycleStatus(task)}
              disabled={isPending}
              className="cursor-pointer disabled:opacity-50"
            >
              {getStatusIcon(task.status)}
            </button>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${task.status === "Completed" ? "text-slate-400 line-through" : "text-slate-700"}`}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  Due {task.due_date}
                </p>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                  {task.status}
                </p>
              </div>
            </div>
            <div
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(task.priority)}`}
            >
              {task.priority}
            </div>
            <button className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 transition-all">
              <MoreHorizontal size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
