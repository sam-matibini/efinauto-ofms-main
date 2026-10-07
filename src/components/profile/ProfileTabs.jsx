export default function ProfileTabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" aria-label="Profile sections" className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`profile-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`profile-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A1F44] ${
              selected ? "bg-[#0A1F44] text-white" : "bg-white text-[#0A1F44] hover:bg-[#A8FF60]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
