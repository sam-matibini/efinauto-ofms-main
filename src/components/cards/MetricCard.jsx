export default function MetricCard({ icon: Icon, label, value }) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white/55 p-6 shadow-[0_10px_30px_rgba(10,31,68,0.08)] backdrop-blur-[10px]">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0A1F44] text-[#A8FF60]">
          {Icon ? <Icon className="h-6 w-6" strokeWidth={1.75} /> : null}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[#0A1F44]/70">{label}</p>
          <p className="truncate text-2xl font-bold text-[#0A1F44]">{value}</p>
        </div>
      </div>
    </article>
  );
}
