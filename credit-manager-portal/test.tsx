import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, Shield, Users, ChevronRight, ChevronLeft, Search, X, ArrowRight, MessageSquare, Settings, TrendingUp, Building2 } from "lucide-react";

// --- Mock data
const STEPS = [
  { key: "legal_qc", label: "Legal QC" },
  { key: "cp_tracker", label: "CP Tracker" },
  { key: "approvals", label: "Approvals" },
  { key: "funding", label: "Funding" },
  { key: "onboarding", label: "Onboarding" },
  { key: "monitoring", label: "Handoff to Monitoring" },
];

const MOCK_DEALS = [
  {
    id: "DL-001",
    name: "Pawsitive Brands, Inc.",
    sponsor: "RiverPeak Capital",
    facility: "$300MM TL + RCF",
    pricing: "SOFR + 475 bps, 0.5% floor",
    tenor: "7Y TL / 5Y RCF",
    covSummary: "Springing net leverage, min liquidity, MFN 50bps",
    status: "In Closing",
    currentStep: 1,
    dueDate: "2025-10-03",
  },
  {
    id: "DL-002",
    name: "Meridian Behavioral Health",
    sponsor: "Apollo Growth Partners",
    facility: "$500MM Unitranche",
    pricing: "SOFR + 600 bps, 1.0% floor",
    tenor: "6Y",
    covSummary: "Total leverage step-downs, interest coverage",
    status: "Docs Finalized",
    currentStep: 2,
    dueDate: "2025-10-10",
  },
  {
    id: "DL-003",
    name: "Atlas Logistics Holdings",
    sponsor: "Northshore Equity",
    facility: "$250MM 1L + $75MM DDTL",
    pricing: "SOFR + 450 bps",
    tenor: "5Y",
    covSummary: "Fixed charge coverage, capex basket",
    status: "IC Approved",
    currentStep: 0,
    dueDate: "2025-10-01",
  },
];

const DEFAULT_CHECKLIST = [
  { id: "lc-1", label: "Final doc set uploaded (credit, security, schedules)", step: "legal_qc" },
  { id: "lc-2", label: "Definitions/Covenants cross-checked vs. term sheet", step: "legal_qc" },
  { id: "lc-3", label: "Security package confirmed (UCC, mortgages, IP)", step: "legal_qc" },
  { id: "cp-1", label: "Board resolutions & incumbency", step: "cp_tracker" },
  { id: "cp-2", label: "Bring-down reps & solvency certificate", step: "cp_tracker" },
  { id: "cp-3", label: "Insurance endorsements received", step: "cp_tracker" },
  { id: "ap-1", label: "Final IC memo posted", step: "approvals" },
  { id: "ap-2", label: "Signoffs: PM, Legal, Ops", step: "approvals" },
  { id: "fd-1", label: "Wire instructions verified", step: "funding" },
  { id: "fd-2", label: "Funding memo & draw schedule", step: "funding" },
  { id: "ob-1", label: "Servicing setup (agent, notices)", step: "onboarding" },
  { id: "ob-2", label: "Compliance calendar seeded", step: "onboarding" },
  { id: "mn-1", label: "KPI dashboard connected", step: "monitoring" },
  { id: "mn-2", label: "Covenant monitor thresholds loaded", step: "monitoring" },
];

export default function CreditManagerPortalMock() {
  const [query, setQuery] = useState("");
  const [deals, setDeals] = useState(MOCK_DEALS);
  const [selectedId, setSelectedId] = useState<string | null>(deals[0]?.id ?? null);
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});
  const selectedDeal = useMemo(() => deals.find(d => d.id === selectedId) ?? null, [deals, selectedId]);

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter(d => `${d.name} ${d.sponsor} ${d.id}`.toLowerCase().includes(q));
  }, [deals, query]);

  const currentStepObj = useMemo(() => {
    if (!selectedDeal) return null;
    return STEPS[selectedDeal.currentStep] ?? STEPS[0];
  }, [selectedDeal]);

  function markStepComplete() {
    if (!selectedDeal) return;
    setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, currentStep: Math.min(d.currentStep + 1, STEPS.length - 1) } : d));
  }

  function markStepBack() {
    if (!selectedDeal) return;
    setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, currentStep: Math.max(d.currentStep - 1, 0) } : d));
  }

  function setAllCheckedForStep(stepKey: string, value: boolean) {
    const updates: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.filter(c => c.step === stepKey).forEach(c => updates[c.id] = value);
    setCheckState(prev => ({ ...prev, ...updates }));
  }

  const progressPct = useMemo(() => {
    if (!selectedDeal) return 0;
    return ((selectedDeal.currentStep + 1) / STEPS.length) * 100;
  }, [selectedDeal]);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-black flex items-center justify-center text-white"><Shield size={18} /></div>
            <div className="font-semibold">Credit Manager Portal</div>
            <span className="text-xs text-gray-500 border rounded-md px-2 py-0.5 ml-2">Post-Docs Workflow</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5" size={16} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search deals, sponsors, IDs..."
                className="pl-9 pr-3 py-2 rounded-xl bg-gray-100 focus:bg-white border focus:border-black outline-none text-sm w-72"
              />
            </div>
            <button className="rounded-xl px-3 py-2 border text-sm hover:bg-gray-50 flex items-center gap-2">
              <Settings size={16} /> Settings
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300" />
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 grid grid-cols-12 gap-4 py-4">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3">
          <nav className="space-y-2">
            <SidebarItem icon={<FileText size={16} />} label="Closing Queue" badge={deals.length} active />
            <SidebarItem icon={<Users size={16} />} label="My Tasks" />
            <SidebarItem icon={<CheckCircle2 size={16} />} label="Approvals" />
            <SidebarItem icon={<TrendingUp size={16} />} label="KPIs" />
          </nav>

          <div className="mt-4 p-4 rounded-2xl border bg-white">
            <div className="text-sm font-medium mb-2">Filters</div>
            <div className="flex flex-wrap gap-2">
              {STEPS.map((s) => (
                <span key={s.key} className="text-xs px-2 py-1 rounded-full border bg-gray-50">{s.label}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl border bg-white">
            <div className="text-sm font-medium mb-3">Upcoming Key Dates</div>
            <ul className="space-y-2">
              {deals.map(d => (
                <li key={d.id} className="flex items-center justify-between text-sm">
                  <span className="truncate mr-2">{d.name}</span>
                  <span className="text-xs text-gray-500">{d.dueDate}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <main className="col-span-12 md:col-span-9 lg:col-span-9 space-y-4">
          {/* Pipeline Table */}
          <section className="rounded-2xl border bg-white">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="font-medium">Closing Queue</div>
              <div className="text-xs text-gray-500">{filteredDeals.length} of {deals.length} deals</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <Th>ID</Th>
                    <Th>Borrower</Th>
                    <Th>Facility</Th>
                    <Th>Pricing</Th>
                    <Th>Step</Th>
                    <Th>Due</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map((d) => (
                    <tr key={d.id} className="border-b last:border-b-0 hover:bg-gray-50/70 cursor-pointer" onClick={() => setSelectedId(d.id)}>
                      <Td>{d.id}</Td>
                      <Td>
                        <div className="font-medium flex items-center gap-2"><Building2 size={14} /> {d.name}</div>
                        <div className="text-xs text-gray-500">Sponsor: {d.sponsor}</div>
                      </Td>
                      <Td>
                        <div>{d.facility}</div>
                        <div className="text-xs text-gray-500">{d.tenor}</div>
                      </Td>
                      <Td>{d.pricing}</Td>
                      <Td>
                        <StepBadge stepIndex={d.currentStep} />
                      </Td>
                      <Td className="whitespace-nowrap"><Clock className="inline mr-1" size={14} />{d.dueDate}</Td>
                      <Td className="text-right">
                        <button className="text-xs inline-flex items-center gap-1 border rounded-lg px-2 py-1 hover:bg-gray-50" onClick={(e) => { e.stopPropagation(); setSelectedId(d.id); }}>
                          Open <ChevronRight size={14} />
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Detail Panel / Drawer */}
          {selectedDeal && (
            <section className="rounded-2xl border bg-white">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-black text-white flex items-center justify-center"><FileText size={16} /></div>
                  <div>
                    <div className="font-medium">{selectedDeal.name}</div>
                    <div className="text-xs text-gray-500">{selectedDeal.id} • {selectedDeal.facility}</div>
                  </div>
                </div>
                <button className="p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setSelectedId(null)} aria-label="Close"><X size={16} /></button>
              </div>

              {/* Progress */}
              <div className="px-4 pt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>Workflow Progress</span><span>{Math.round(progressPct)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-black" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              {/* Stepper */}
              <div className="px-4 py-4 overflow-x-auto">
                <ol className="flex gap-4 min-w-max">
                  {STEPS.map((s, idx) => (
                    <li key={s.key} className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${idx <= selectedDeal.currentStep ? "bg-black text-white" : "bg-gray-200 text-gray-600"}`}>{idx + 1}</div>
                      <div className={`text-sm ${idx === selectedDeal.currentStep ? "font-medium" : "text-gray-500"}`}>{s.label}</div>
                      {idx < STEPS.length - 1 && <ChevronRight className="text-gray-300" size={16} />}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Step Content & Checklist */}
              <div className="px-4 pb-4 grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-8">
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{currentStepObj?.label} Checklist</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setAllCheckedForStep(currentStepObj!.key, true)} className="text-xs border rounded-lg px-2 py-1 hover:bg-gray-50">Check all</button>
                        <button onClick={() => setAllCheckedForStep(currentStepObj!.key, false)} className="text-xs border rounded-lg px-2 py-1 hover:bg-gray-50">Uncheck all</button>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {DEFAULT_CHECKLIST.filter(c => c.step === currentStepObj?.key).map(c => (
                        <li key={c.id} className="flex items-start gap-2">
                          <input id={c.id} type="checkbox" className="mt-0.5 h-4 w-4 rounded border-gray-300" checked={!!checkState[c.id]} onChange={(e) => setCheckState(prev => ({ ...prev, [c.id]: e.target.checked }))} />
                          <label htmlFor={c.id} className="text-sm">{c.label}</label>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={markStepBack} className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"><ChevronLeft size={16} /> Back</button>
                      <button onClick={markStepComplete} className="inline-flex items-center gap-1 rounded-xl bg-black text-white px-3 py-1.5 text-sm hover:opacity-90">Mark step complete <ArrowRight size={16} /></button>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-4">
                  <div className="rounded-xl border p-4">
                    <div className="font-medium mb-2">Deal Facts</div>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li><span className="text-gray-500">Sponsor:</span> {selectedDeal.sponsor}</li>
                      <li><span className="text-gray-500">Facility:</span> {selectedDeal.facility}</li>
                      <li><span className="text-gray-500">Tenor:</span> {selectedDeal.tenor}</li>
                      <li><span className="text-gray-500">Pricing:</span> {selectedDeal.pricing}</li>
                      <li><span className="text-gray-500">Covenants:</span> {selectedDeal.covSummary}</li>
                    </ul>
                    <div className="mt-3 flex gap-2">
                      <button className="text-xs border rounded-lg px-2 py-1 hover:bg-gray-50">Open IC Memo</button>
                      <button className="text-xs border rounded-lg px-2 py-1 hover:bg-gray-50">View Final Docs</button>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="font-medium mb-2 flex items-center gap-2"><MessageSquare size={16} /> Notes</div>
                    <ul className="space-y-2 text-sm">
                      <li className="p-2 rounded-lg bg-gray-50">Legal flagged MFN clause—threshold confirmed at 50bps.</li>
                      <li className="p-2 rounded-lg bg-gray-50">Ops to verify borrower wire instructions by EOD.</li>
                    </ul>
                    <div className="mt-2">
                      <input className="w-full text-sm border rounded-lg px-2 py-1" placeholder="Add a note…" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-gray-500">Mock v0 • For internal demo only</footer>
    </div>
  );
}

function SidebarItem({ icon, label, badge, active=false }: { icon: React.ReactNode; label: string; badge?: number; active?: boolean }) {
  return (
    <button className={`w-full flex items-center justify-between rounded-2xl border px-3 py-2 ${active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"}`}>
      <span className="flex items-center gap-2 text-sm">{icon} {label}</span>
      {badge != null && <span className={`text-xs px-2 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-gray-100"}`}>{badge}</span>}
    </button>
  );
}

function Th({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2 text-xs font-medium ${className}`}>{children}</th>;
}
function Td({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function StepBadge({ stepIndex }: { stepIndex: number }) {
  const label = STEPS[stepIndex]?.label ?? "Unknown";
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-gray-50">
      <CheckCircle2 size={14} /> {label}
    </span>
  );
}
