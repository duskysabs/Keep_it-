const SummaryCard = ({ title, value, detail, icon: Icon, accent = "teal" }) => {
  const accents = {
    teal: "bg-slate-100 text-slate-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-slate-100 text-slate-600",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${accents[accent]}`}><Icon size={19} /></div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{detail}</p>
    </article>
  );
};

export default SummaryCard;
