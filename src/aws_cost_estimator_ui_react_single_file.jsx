import React, { useMemo, useState } from "react";
import { TrendingUp, Settings2, RefreshCw, Download, HelpCircle, Info, ListChecks, IndianRupee, DollarSign, Link as LinkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, AreaChart, XAxis, YAxis, Area, CartesianGrid, Legend } from "recharts";

// ————————————————————————————————————————————————————————————————
// AWS Cost Estimator (Simple Mode first)
// Goal: A non‑technical teammate can answer 4 prompts and get a clean estimate.
// Tech terms are plain‑English and every one has a tooltip.
// ————————————————————————————————————————————————————————————————

// ——— Types (JSDoc comments for documentation)
/**
 * @typedef {Object} ServiceRow
 * @property {string} key - Service identifier
 * @property {string} name - Display name
 * @property {number} baseline - USD / month (current)
 * @property {number} elasticity - 0..1 (portion that scales with users)
 * @property {string} [notes] - Optional description
 */

/**
 * @typedef {Object} RowCalc
 * @property {string} key - Service identifier
 * @property {string} name - Display name
 * @property {number} baseline - USD / month (current)
 * @property {number} elasticity - 0..1 (portion that scales with users)
 * @property {string} [notes] - Optional description
 * @property {number} [projected] - Calculated projected cost
 */

// ——— Friendly glossary for tooltips
const TERMS = {
  mau: "Monthly Active Users. How many unique people use your app in a typical month.",
  futureUsers: "Your target user count for this estimate. We'll compare against current users to scale costs.",
  scaleFactor: "How many times bigger the future user base is compared to today. Example: 2× means double the users.",
  monthlyGrowth: "How fast your users grow each month, compounded. Example: 10% means 1000 → 1100 → 1210…",
  trafficMultiplier: "How heavy each user's activity is. Light = quick visits; Heavy = lots of uploads/streams/logs.",
  baselineTotal: "What you spend now in a typical month across AWS services.",
  projectedTotal: "What you'd likely spend at the chosen user level, based on the sliders and assumptions.",
  costPerUser: "Monthly AWS spend divided by users. Useful for pricing and margin planning.",
  elasticity: "How much a service cost grows with users. 0 = mostly fixed; 1 = grows directly with users.",
  forecast: "A month‑by‑month view using your growth % to project total cost over time.",
  currency: "Toggle numbers between USD ($) and INR (₹). AWS bills in USD by default; INR view multiplies by your rate below.",
  fx: "USD → INR conversion rate used for display only. Edit if you want to use today's rate from finance."
};

// Baseline costs (editable). Pre‑filled from your latest sample month (USD)
const DEFAULT_SERVICES = [
  { key: "rds",      name: "Amazon RDS",                  baseline: 879.10, elasticity: 0.6, notes: "Managed databases (Postgres/MySQL)." },
  { key: "savings",  name: "Savings Plans (EC2)",        baseline: 853.97, elasticity: 0.2, notes: "Discount program: mostly fixed monthly commitment." },
  { key: "ec2",      name: "Amazon EC2",                  baseline: 411.22, elasticity: 0.9, notes: "Compute servers that run your app." },
  { key: "ebs",      name: "Amazon EBS",                  baseline: 171.31, elasticity: 0.5, notes: "Block storage volumes attached to EC2." },
  { key: "vpc",      name: "Amazon VPC",                  baseline: 99.80,  elasticity: 0.2, notes: "Private networking (e.g., NAT)." },
  { key: "dt",       name: "Data Transfer / Bandwidth",   baseline: 50.87,  elasticity: 1.0, notes: "Traffic out to internet / between services." },
  { key: "cloudwatch",name:"Amazon CloudWatch",            baseline: 49.71,  elasticity: 0.9, notes: "Metrics + logs for monitoring." },
  { key: "alb",      name: "Elastic Load Balancer (ALB)", baseline: 36.35,  elasticity: 0.8, notes: "Distributes traffic across servers." },
  { key: "sms",      name: "End User Messaging (SMS)",    baseline: 29.67,  elasticity: 1.0, notes: "OTP and notifications by SMS." },
  { key: "waf",      name: "AWS WAF",                      baseline: 8.00,   elasticity: 0.3, notes: "Web firewall rules & inspection." },
  { key: "s3",       name: "Amazon S3",                    baseline: 4.72,   elasticity: 0.5, notes: "Object storage for files/backups." },
  { key: "kms",      name: "AWS KMS",                      baseline: 2.00,   elasticity: 0.2, notes: "Encryption keys for services." },
  { key: "ecr",      name: "Amazon ECR",                   baseline: 0.78,   elasticity: 0.1, notes: "Docker image registry." },
  { key: "ce",       name: "AWS Cost Explorer",           baseline: 0.51,   elasticity: 0.0, notes: "Cost analytics UI fee." },
  { key: "r53",      name: "Amazon Route 53",             baseline: 0.50,   elasticity: 0.1, notes: "DNS + health checks." },
  { key: "secrets",  name: "AWS Secrets Manager",         baseline: 0.40,   elasticity: 0.0, notes: "Stores credentials/API keys." },
  { key: "apigw",    name: "Amazon API Gateway",          baseline: 0.01,   elasticity: 0.7, notes: "Serverless API front door." },
];

// Official pricing links (curated, AWS sources)
const PRICING_LINKS = {
  rds:      [{ label: "RDS pricing", href: "https://aws.amazon.com/rds/pricing/" }],
  savings:  [{ label: "Savings Plans (Compute) pricing", href: "https://aws.amazon.com/savingsplans/compute-pricing/" }],
  ec2:      [{ label: "EC2 pricing", href: "https://aws.amazon.com/ec2/pricing/" }],
  ebs:      [{ label: "EBS pricing", href: "https://aws.amazon.com/ebs/pricing/" }],
  vpc:      [{ label: "VPC/NAT pricing", href: "https://aws.amazon.com/vpc/pricing/" }],
  dt:       [{ label: "Data transfer pricing (EC2 section)", href: "https://aws.amazon.com/ec2/pricing/on-demand/" }],
  cloudwatch:[{ label: "CloudWatch pricing", href: "https://aws.amazon.com/cloudwatch/pricing/" }],
  alb:      [{ label: "Elastic Load Balancing pricing (ALB)", href: "https://aws.amazon.com/elasticloadbalancing/pricing/" }],
  sms:      [
              { label: "SNS SMS pricing", href: "https://aws.amazon.com/sns/sms-pricing/" },
              { label: "Pinpoint pricing", href: "https://aws.amazon.com/pinpoint/pricing/" },
            ],
  waf:      [{ label: "AWS WAF pricing", href: "https://aws.amazon.com/waf/pricing/" }],
  s3:       [{ label: "S3 pricing", href: "https://aws.amazon.com/s3/pricing/" }],
  kms:      [{ label: "KMS pricing", href: "https://aws.amazon.com/kms/pricing/" }],
  ecr:      [{ label: "ECR pricing", href: "https://aws.amazon.com/ecr/pricing/" }],
  ce:       [{ label: "Cost Explorer pricing", href: "https://aws.amazon.com/aws-cost-management/aws-cost-explorer/pricing/" }],
  r53:      [{ label: "Route 53 pricing", href: "https://aws.amazon.com/route53/pricing/" }],
  secrets:  [{ label: "Secrets Manager pricing", href: "https://aws.amazon.com/secrets-manager/pricing/" }],
  apigw:    [{ label: "API Gateway pricing", href: "https://aws.amazon.com/api-gateway/pricing/" }],
};

const COLORS = [
  "#3366CC","#DC3912","#FF9900","#109618","#990099","#0099C6","#DD4477","#66AA00","#B82E2E","#316395",
  "#994499","#22AA99","#AAAA11","#6633CC","#E67300","#8B0707","#651067","#329262","#5574A6","#3B3EAC"
];

// Small helpers: currency/number formatting
const fmtUsd = (n) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
/** @typedef {"USD" | "INR"} Currency */
export function applyFx(amountUSD, currency, fxRateINR) {
  if (currency === "INR") {
    const r = fxRateINR > 0 ? fxRateINR : 85;
    return amountUSD * r;
  }
  return amountUSD;
}
export function fmtAmount(amountUSD, currency, fxRateINR, opts = { maximumFractionDigits: 2 }) {
  const local = applyFx(amountUSD, currency, fxRateINR);
  const prefix = currency === "INR" ? "₹" : "$";
  return `${prefix}${local.toLocaleString(undefined, opts)}`;
}

// === Pure helpers (easier to test) ===
export function computeProjected(baseline, elasticity, factor, trafficBoost = 1) {
  const fixed = baseline * (1 - elasticity);
  const variable = baseline * elasticity * factor * trafficBoost;
  return fixed + variable;
}

export function buildCSV(rows, baselineTotal, projectedTotal) {
  const header = ["Service","BaselineUSD","Elasticity","ProjectedUSD"].join(",");
  const body = rows.map((r) => [r.name, r.baseline.toFixed(2), r.elasticity.toFixed(2), (r.projected || 0).toFixed(2)].join(","));
  // Use a standard one-character newline string for joining rows
  return [header, ...body, "", `Baseline Total,, ,${baselineTotal.toFixed(2)}`, `Projected Total,, ,${projectedTotal.toFixed(2)}`].join("\n");
}

// Reusable tooltip label with icon
function TL({ label, term }) {
  return (
    <div className="flex items-center gap-2">
      <Label>{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 hover:bg-neutral-100" aria-label={`Help: ${label}`}>
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-[260px] text-sm leading-snug">{TERMS[term] ?? label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// Tiny inline info icon (for service rows)
function InfoDot({ text }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-neutral-700" aria-label="More info">
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px] text-sm leading-snug">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Link out (styled)
function AwsLink({ href, children }) {
  return (
    <a className="inline-flex items-center gap-1 text-blue-600 hover:underline" href={href} target="_blank" rel="noreferrer">
      <LinkIcon className="h-3.5 w-3.5" /> {children}
    </a>
  );
}

export default function AWSBudgetEstimator() {
  // ——— Simple inputs for non‑technical users
  const [currentUsers, setCurrentUsers] = useState(50000);
  const [futureUsers, setFutureUsers]   = useState(100000);
  const [monthlyGrowthPct, setMonthlyGrowthPct] = useState(10);
  const [months, setMonths] = useState(12);
  const [advanced, setAdvanced] = useState(false);
  const [round, setRound] = useState(true);

  // Currency toggle
  const [currency, setCurrency] = useState("USD");
  const [fxRateINR, setFxRateINR] = useState(85); // editable, display-only conversion

  // Usage heaviness (maps to traffic multiplier under the hood)
  const [usageWeight, setUsageWeight] = useState("medium");
  const trafficMultiplier = usageWeight === "light" ? 0.8 : usageWeight === "heavy" ? 1.4 : 1.0;

  const [services, setServices] = useState(DEFAULT_SERVICES);

  const scaleFactor = useMemo(() => {
    const f = (futureUsers > 0 && currentUsers > 0) ? (futureUsers / currentUsers) : 1;
    return Number.isFinite(f) ? f : 1;
  }, [futureUsers, currentUsers]);

  const projectCost = (factor) => {
    return services.map((s) => {
      const trafficKeys = ["dt","cloudwatch","alb","apigw"];
      const trafficBoost = trafficKeys.includes(s.key) ? trafficMultiplier : 1;
      const total = computeProjected(s.baseline, s.elasticity, factor, trafficBoost);
      return { ...s, projected: total };
    });
  };

  const baselineTotalUSD = useMemo(() => services.reduce((acc, s) => acc + s.baseline, 0), [services]);
  const nowRows = useMemo(() => projectCost(scaleFactor), [services, scaleFactor, trafficMultiplier]);
  const projectedTotalUSD = useMemo(() => nowRows.reduce((acc, r) => acc + (r.projected || 0), 0), [nowRows]);

  const perUserNowUSD = useMemo(() => (baselineTotalUSD / Math.max(1, currentUsers)), [baselineTotalUSD, currentUsers]);
  const perUserFutureUSD = useMemo(() => (projectedTotalUSD / Math.max(1, futureUsers)), [projectedTotalUSD, futureUsers]);

  const forecastUSD = useMemo(() => {
    const data = [];
    let users = currentUsers;
    for (let m = 0; m <= months; m++) {
      const factor = (users > 0 && currentUsers > 0) ? (users / currentUsers) : 1;
      const rows = projectCost(factor);
      const total = rows.reduce((acc, r) => acc + (r.projected || 0), 0);
      data.push({ month: `M${m}`, users: round ? Math.round(users) : users, total, ...Object.fromEntries(rows.map(r => [r.key, r.projected || 0])) });
      users = users * (1 + monthlyGrowthPct / 100);
    }
    return data;
  }, [currentUsers, months, monthlyGrowthPct, services, trafficMultiplier, round]);

  const pieDataUSD = useMemo(() => nowRows.map((r) => ({ name: r.name, value: r.projected || 0 })), [nowRows]);

  const resetDefaults = () => setServices(DEFAULT_SERVICES.map(s => ({...s})));

  const downloadCSV = () => {
    const csv = buildCSV(nowRows, baselineTotalUSD, projectedTotalUSD);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aws-cost-projection-usd.csv"; // Export in USD to match official pricing pages
    a.click();
    URL.revokeObjectURL(url);
  };

  // Local formatters
  const fmtLocal = (usd, opts = { maximumFractionDigits: 2 }) => fmtAmount(usd, currency, fxRateINR, opts);
  const toLocal = (usd) => applyFx(usd, currency, fxRateINR);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-neutral-50 to-neutral-100 text-neutral-900 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">AWS Cost Estimator</h1>
            <p className="text-sm text-neutral-600">Answer 4 quick inputs. Get a clean monthly estimate and a simple breakdown.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Currency toggle */}
            <div className="flex items-center gap-2">
              <TL label="Currency" term="currency" />
              <div className="inline-flex rounded-xl border overflow-hidden">
                <button onClick={()=>setCurrency("USD")} className={`px-3 py-2 text-sm inline-flex items-center gap-1 ${currency==='USD'?"bg-neutral-900 text-white":"bg-white text-neutral-700"}`} aria-label="Show USD">
                  <DollarSign className="h-4 w-4"/> USD
                </button>
                <button onClick={()=>setCurrency("INR")} className={`px-3 py-2 text-sm inline-flex items-center gap-1 ${currency==='INR'?"bg-neutral-900 text-white":"bg-white text-neutral-700"}`} aria-label="Show INR">
                  <IndianRupee className="h-4 w-4"/> INR
                </button>
              </div>
              {currency === 'INR' && (
                <div className="flex items-center gap-2">
                  <TL label="USD→INR" term="fx" />
                  <Input className="w-24" type="number" step="0.01" value={fxRateINR}
                         onChange={(e)=> setFxRateINR(Math.max(0, Number(e.target.value)||0))} />
                </div>
              )}
            </div>
            <Button variant="outline" onClick={resetDefaults} className="gap-2"><RefreshCw className="h-4 w-4"/>Reset</Button>
            <Button onClick={downloadCSV} className="gap-2"><Download className="h-4 w-4"/>Export CSV</Button>
          </div>
        </header>

        {/* Mode toggle */}
        <Card className="rounded-2xl bg-white/70 backdrop-blur-md border border-neutral-200/60 shadow-md">
          <CardContent className="p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              <p className="text-sm">Show advanced controls (elasticity & detailed services)</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={advanced} onCheckedChange={setAdvanced} />
            </div>
          </CardContent>
        </Card>

        {/* Quick Start — simple inputs */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="rounded-2xl bg-white/70 backdrop-blur-md border border-neutral-200/60 shadow-md">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4"/><h2 className="font-medium">Quick Start</h2></div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <TL label="Current users (MAU)" term="mau" />
                  <Input type="number" value={currentUsers} onChange={e=>setCurrentUsers(Number(e.target.value)||0)} />
                </div>
                <div className="space-y-1">
                  <TL label="Target users for this estimate" term="futureUsers" />
                  <Input type="number" value={futureUsers} onChange={e=>setFutureUsers(Number(e.target.value)||0)} />
                  <div className="flex items-center gap-3 pt-2">
                    <TL label="Scale vs. today" term="scaleFactor" />
                    <div className="flex-1 flex items-center gap-3">
                      <Slider value={[Math.min(5, Math.max(0.1, scaleFactor))]} min={0.1} max={5} step={0.01} onValueChange={(v)=>setFutureUsers(Math.round((v[0]) * currentUsers))} />
                      <div className="w-16 text-right text-sm font-medium">{scaleFactor.toFixed(2)}×</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <TL label="Expected monthly growth (%)" term="monthlyGrowth" />
                  <Input type="number" value={monthlyGrowthPct} onChange={e=>setMonthlyGrowthPct(Number(e.target.value)||0)} />
                </div>

                <div className="space-y-1">
                  <TL label="How heavy is typical usage?" term="trafficMultiplier" />
                  <div className="flex gap-2">
                    {["light","medium","heavy"].map(opt => (
                      <Button key={opt} variant={usageWeight===opt?"default":"outline"} onClick={()=>setUsageWeight(opt)}>
                        {opt.charAt(0).toUpperCase()+opt.slice(1)}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-500">Light = quick browsing • Medium = standard • Heavy = lots of uploads/streaming</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="rounded-2xl bg-white/70 backdrop-blur-md border border-neutral-200/60 shadow-md">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2"><Settings2 className="h-4 w-4"/><h2 className="font-medium">Your Estimate</h2></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-50 rounded-xl border">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <TL label="Baseline total" term="baselineTotal" />
                  </div>
                  <div className="text-xl font-semibold">{fmtLocal(baselineTotalUSD)}</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <TL label="Projected total" term="projectedTotal" />
                  </div>
                  <div className="text-xl font-semibold">{fmtLocal(projectedTotalUSD)}</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <TL label="Cost per user (now)" term="costPerUser" />
                  </div>
                  <div className="text-xl font-semibold">{fmtLocal(perUserNowUSD)}</div>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <TL label="Cost per user (future)" term="costPerUser" />
                  </div>
                  <div className="text-xl font-semibold">{fmtLocal(perUserFutureUSD)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pie breakdown */}
          <Card className="rounded-2xl bg-white/70 backdrop-blur-md border border-neutral-200/60 shadow-md">
            <CardContent className="p-4 h-full">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataUSD} dataKey="value" nameKey="name" outerRadius={90}>
                      {pieDataUSD.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                          <ReTooltip formatter={(val) => fmtLocal(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-sm text-neutral-500">Projected cost by service</div>
            </CardContent>
          </Card>
        </div>

        {/* Details for advanced users */}
        <Accordion type="single" collapsible>
          <AccordionItem value="details">
            <AccordionTrigger className="text-base">Optional: Detailed assumptions & forecast</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-1">
                {/* Services table (shown only in advanced mode) */}
                {advanced && (
                  <Card className="rounded-2xl bg-white/70 backdrop-blur-md border border-neutral-200/60 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                          <h2 className="font-medium">Services & <span className="inline-flex items-center gap-1">Elasticity<TL label="" term="elasticity" /></span></h2>
                        </div>
                        <div className="text-sm text-neutral-500">Edit baseline $ and elasticity (0 = fixed, 1 = scales)</div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-neutral-500">
                            <tr className="border-b">
                              <th className="py-2 pr-4">Service</th>
                              <th className="py-2 pr-4">Baseline ({currency})</th>
                              <th className="py-2 pr-4">Elasticity</th>
                              <th className="py-2 pr-4">Projected ({currency})</th>
                              <th className="py-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nowRows.map((r, idx) => (
                              <tr key={r.key} className="border-b last:border-0">
                                <td className="py-2 pr-4 font-medium">
                                  <div className="flex items-center gap-1">
                                    {r.name}
                                    <InfoDot text={DEFAULT_SERVICES.find(s=>s.key===r.key)?.notes || ""} />
                                  </div>
                                </td>
                                <td className="py-2 pr-4 w-[180px]">
                                  <div className="flex items-center gap-2">
                                    <Input aria-label={`${r.name} baseline`} type="number" step="0.01" value={r.baseline}
                                      onChange={(e)=>{
                                        const v = Number(e.target.value) || 0;
                                        setServices(prev => prev.map(s => s.key===r.key ? { ...s, baseline: v } : s));
                                      }} />
                                    <div className="text-xs text-neutral-500 whitespace-nowrap">{fmtLocal(r.baseline)}</div>
                                  </div>
                                </td>
                                <td className="py-2 pr-4 w-[200px]">
                                  <div className="flex items-center gap-2">
                                    <Slider value={[r.elasticity]} min={0} max={1} step={0.05}
                                      onValueChange={(v)=>{
                                        setServices(prev => prev.map(s => s.key===r.key ? { ...s, elasticity: v[0] } : s));
                                      }} />
                                    <div className="w-10 text-right">{r.elasticity.toFixed(2)}</div>
                                  </div>
                                </td>
                                <td className="py-2 pr-4 font-semibold">{fmtLocal(r.projected || 0)}</td>
                                <td className="py-2 text-neutral-500">{services[idx]?.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Forecast chart */}
                <Card className="rounded-2xl bg-white/70 backdrop-blur-md border border-neutral-200/60 shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2"><Settings2 className="h-4 w-4"/><h2 className="font-medium"><span className="mr-2">{months}-Month Forecast</span><TL label="" term="forecast" /></h2></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <TL label="Months to project" term="forecast" />
                        <Input type="number" value={months} onChange={e=>setMonths(Math.max(1, Number(e.target.value)||1))} />
                      </div>
                      <div className="flex items-center justify-between pt-6">
                        <div className="space-y-1">
                          <Label>Round users in chart</Label>
                          <p className="text-xs text-neutral-500">Visual only</p>
                        </div>
                        <Switch checked={round} onCheckedChange={setRound} />
                      </div>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={forecastUSD} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3366CC" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#3366CC" stopOpacity={0.05}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(v)=>fmtLocal(v, { maximumFractionDigits: 0 })}/>
                          <CartesianGrid strokeDasharray="3 3" />
                          <ReTooltip formatter={(val, name) => name === "total" ? fmtLocal(Number(val)) : Number(val).toFixed(0)} />
                          <Legend />
                          <Area type="monotone" dataKey="total" stroke="#3366CC" fill="url(#colorTotal)" name={`Total cost (${currency})`} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Pricing Guide (for Management) */}
        <Accordion type="single" collapsible>
          <AccordionItem value="guide">
            <AccordionTrigger className="text-base">Pricing Guide (Management) – What drives each line item?</AccordionTrigger>
            <AccordionContent>
              <Card className="rounded-2xl bg-white/70 backdrop-blur-md border border-neutral-200/60 shadow-md">
                <CardContent className="p-4 space-y-4">
                  <p className="text-sm text-neutral-600">Simple summary of how each AWS service is billed, plus direct links to the official AWS pricing pages. Prices vary by Region, usage tier, and options. Always confirm on the linked AWS pages or the AWS Pricing Calculator.</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {DEFAULT_SERVICES.map((s) => (
                      <div key={s.key} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-neutral-500">Baseline: {fmtUsd(s.baseline)}</div>
                        </div>
                        <div className="text-sm text-neutral-700">{TERMS[s.key] || s.notes || ""}</div>
                        <div className="mt-2 flex flex-wrap gap-3">
                          {(PRICING_LINKS[s.key] || []).map((l, idx) => (
                            <AwsLink key={idx} href={l.href}>{l.label}</AwsLink>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <footer className="text-xs text-neutral-500 pb-6">
          <p>Tip: Keep it simple—start with Quick Start only. If numbers feel off, switch on Advanced and tweak elasticities. CSV exports in USD to match AWS pricing pages. Use the INR toggle for presentation in ₹.</p>
        </footer>
      </div>
    </div>
  );
}

// ——— Lightweight self‑tests (run once in the browser; no build impact) ———
try {
  // Ensure tests only run once per page load in browser
  if (typeof window !== "undefined" && !window.__AWS_COST_ESTIMATOR_TESTED__) {
    window.__AWS_COST_ESTIMATOR_TESTED__ = true;

    // Test 1: computeProjected math for fixed vs variable
    console.assert(computeProjected(100, 0, 10) === 100, "computeProjected: fixed cost should remain 100");
    console.assert(Math.abs(computeProjected(100, 1, 2) - 200) < 1e-9, "computeProjected: fully elastic should scale to 200");
    console.assert(Math.abs(computeProjected(100, 0.5, 2) - 150) < 1e-9, "computeProjected: half elastic should be 150");

    // Test 2: buildCSV newline and totals presence
    const csvSample = buildCSV([
      { key: "x", name: "X", baseline: 10, elasticity: 0.5, projected: 15 },
      { key: "y", name: "Y", baseline: 5, elasticity: 1.0, projected: 10 },
    ], 15, 25);
    console.assert(csvSample.includes("\n"), "buildCSV should contain newline characters");
    console.assert(csvSample.includes("Baseline Total"), "buildCSV should include Baseline Total line");
    console.assert(csvSample.includes("Projected Total"), "buildCSV should include Projected Total line");

    // Test 3: fmtUsd formatting (basic)
    console.assert(fmtUsd(1234.56).startsWith("$"), "fmtUsd should start with $");

    // Test 4: currency functions
    console.assert(Math.abs(applyFx(100, "INR", 85) - 8500) < 1e-9, "applyFx should multiply by fxRate for INR");
    console.assert(fmtAmount(100, "USD", 85).startsWith("$"), "fmtAmount USD should start with $");
    console.assert(fmtAmount(100, "INR", 85).startsWith("₹"), "fmtAmount INR should start with ₹");

    // Added Tests — keep behavior locked down
    // Test 5: buildCSV line count = header + rows + blank + 2 totals
    const lines = csvSample.split("\n");
    console.assert(lines.length === 1 + 2 + 1 + 2, "buildCSV should output 6 lines for 2 rows");

    // Test 6: computeProjected honors trafficBoost (>1 increases cost)
    console.assert(Math.abs(computeProjected(100, 1, 1, 1.25) - 125) < 1e-9, "computeProjected should scale with trafficBoost");

    // Test 7: buildCSV numeric formatting to 2 decimals
    const hasDecimals = /\b10\.00\b/.test(csvSample) && /\b15\.00\b/.test(csvSample.split("\n")[1]);
    console.assert(hasDecimals, "buildCSV should use two decimal places for amounts");
  }
} catch { /* no-op in case console is blocked */ }
