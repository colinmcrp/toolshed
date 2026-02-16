interface GoalItem {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string | null;
}

interface GoalsProgressProps {
  goals: GoalItem[];
}

export function GoalsProgress({ goals }: GoalsProgressProps) {
  return (
    <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
      <h3 className="font-bold text-slate-800 mb-6">
        Performance Targets (Absolute Values)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {goals.map((g) => (
          <div key={g.id} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-600">{g.title}</span>
              <span className="font-bold text-slate-900">
                {g.current} / {g.target} {g.unit}
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (g.current / g.target) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
