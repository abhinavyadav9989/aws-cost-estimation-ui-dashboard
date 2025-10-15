import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chart } from 'chart.js/auto';

// ───────────────────────────────────────────────────────────────────────────────
// Global styles (embedded so this stays a single-file JSX component)
// ───────────────────────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    :root{
      --bg:#ffffff; --text:#0b0b0c; --muted:#6b7280; --border:#e5e7eb; --primary:#111827;
      --brand:#3366CC; --chip:#f3f4f6; --card:#ffffff; --shadow:0 1px 2px rgba(0,0,0,.06);
    }
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 Inter,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial,sans-serif}
    .wrap{max-width:1120px;margin:0 auto;padding:24px}
    h1{font-size:28px;margin:0 0 4px}
    h2{font-size:16px;margin:0}
    p{margin:0}
    .row{display:grid;gap:16px;align-items:start}
    @media(min-width:900px){.row{grid-template-columns:repeat(3,1fr)}}
    .header{display:flex;flex-direction:column;gap:12px}
    @media(min-width:900px){.header{flex-direction:row;align-items:center;justify-content:space-between}}
    .card{background:var(--card);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow)}
    .card .content{padding:16px}
    .muted{color:var(--muted)}
    .btn{appearance:none;border:1px solid var(--border);background:#fff;padding:8px 12px;border-radius:12px;cursor:pointer}
    .btn.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
    .btn.group{border-radius:12px 0 0 12px}
    .btn.group + .btn.group{border-left:none;border-radius:0 12px 12px 0}
    .btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}
    .inputs{display:flex;flex-direction:column;gap:12px}
    label{font-size:12px;color:#111827;display:flex;align-items:center;gap:6px}
    input[type="number"], input[type="text"]{width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:10px}
    .stat{background:#f9fafb;border:1px solid var(--border);padding:12px;border-radius:12px}
    .stat .value{font-weight:600;font-size:18px}
    .flex{display:flex;align-items:center;gap:8px}
    .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
    .tooltip{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1px solid var(--border);color:#555;position:relative}
    .tooltip:hover .tip{opacity:1;transform:translateY(0)}
    .tip{position:absolute;bottom:125%;left:50%;transform:translate(-50%,6px);opacity:0;transition:.15s;pointer-events:none; background:#111827;color:#fff;padding:8px 10px;border-radius:8px;max-width:260px;font-size:12px}
    .switch{position:relative;width:44px;height:24px;display:inline-block}
    .switch input{opacity:0;width:0;height:0}
    .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#d1d5db;border-radius:999px;transition:.2s}
    .slider:before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;background:white;transition:.2s;border-radius:50%}
    .switch input:checked + .slider{background:#111827}
    .switch input:checked + .slider:before{transform:translateX(20px)}
    table{width:100%;border-collapse:collapse}
    th,td{padding:10px;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}
    .note{background:var(--chip);padding:4px 8px;border-radius:999px;font-size:12px;color:#374151}
    .info{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:999px;background:#e5e7eb;color:#374151;font-size:12px;margin-left:4px}
    .chips{display:flex;gap:8px;flex-wrap:wrap}
    .pricing-grid{display:grid;grid-template-columns:1fr;gap:16px}
    @media(min-width:900px){.pricing-grid{grid-template-columns:1fr 1fr}}
    .link{color:#2563eb;text-decoration:none}
    .link:hover{text-decoration:underline}
    .slider-inline{display:flex;align-items:center;gap:8px}
    input[type="range"]{width:160px}
  `}</style>
);

// ───────────────────────────────────────────────────────────────────────────────
// Data & helpers
// ───────────────────────────────────────────────────────────────────────────────
const COLORS = [
  "#3366CC","#DC3912","#FF9900","#109618","#990099","#0099C6","#DD4477","#66AA00","#B82E2E","#316395","#994499","#22AA99","#AAAA11","#6633CC","#E67300","#8B0707","#651067","#329262","#5574A6","#3B3EAC"
];

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
  fx: "USD → INR conversion rate used for display only. Edit if you want to use today's rate from finance.",
  rds: "Amazon RDS: managed databases (like PostgreSQL/MySQL). Cost = instance size + storage + backups.",
  ec2: "Amazon EC2: virtual servers that run your application code.",
  ebs: "Amazon EBS: disk storage attached to EC2 servers (and snapshots).",
  vpc: "Amazon VPC: your private network in AWS (IPs, NAT gateways, etc.).",
  dt: "Data Transfer: bandwidth out to the internet or between services; scales with traffic.",
  cloudwatch: "CloudWatch: metrics, dashboards, and log storage for monitoring.",
  alb: "Application Load Balancer: splits traffic across servers; cost grows with connections/bandwidth/rules.",
  sms: "End‑user SMS (e.g., OTP): more sign‑ins = more texts.",
  waf: "AWS WAF: web firewall to block bad traffic.",
  s3: "Amazon S3: object storage (files, images, backups).",
  kms: "AWS KMS: encryption keys used by other services.",
  ecr: "Amazon ECR: Docker image storage for your deployments.",
  ce: "AWS Cost Explorer: small fee to analyze billing data.",
  r53: "Amazon Route 53: DNS and health checks for your domains.",
  secrets: "AWS Secrets Manager: stores API keys/passwords securely.",
  apigw: "Amazon API Gateway: front door for serverless APIs; charged per request.",
};

const PRICING_LINKS = {
  rds: [{ label: "RDS pricing", href: "https://aws.amazon.com/rds/pricing/" }],
  savings: [{ label: "Savings Plans (Compute) pricing", href: "https://aws.amazon.com/savingsplans/compute-pricing/" }],
  ec2: [{ label: "EC2 pricing", href: "https://aws.amazon.com/ec2/pricing/" }],
  ebs: [{ label: "EBS pricing", href: "https://aws.amazon.com/ebs/pricing/" }],
  vpc: [{ label: "VPC/NAT pricing", href: "https://aws.amazon.com/vpc/pricing/" }],
  dt: [{ label: "Data transfer pricing (EC2 section)", href: "https://aws.amazon.com/ec2/pricing/on-demand/" }],
  cloudwatch: [{ label: "CloudWatch pricing", href: "https://aws.amazon.com/cloudwatch/pricing/" }],
  alb: [{ label: "Elastic Load Balancing pricing (ALB)", href: "https://aws.amazon.com/elasticloadbalancing/pricing/" }],
  sms: [
              { label: "SNS SMS pricing", href: "https://aws.amazon.com/sns/sms-pricing/" },
              { label: "Pinpoint pricing", href: "https://aws.amazon.com/pinpoint/pricing/" },
            ],
  waf: [{ label: "AWS WAF pricing", href: "https://aws.amazon.com/waf/pricing/" }],
  s3: [{ label: "S3 pricing", href: "https://aws.amazon.com/s3/pricing/" }],
  kms: [{ label: "KMS pricing", href: "https://aws.amazon.com/kms/pricing/" }],
  ecr: [{ label: "ECR pricing", href: "https://aws.amazon.com/ecr/pricing/" }],
  ce: [{ label: "Cost Explorer pricing", href: "https://aws.amazon.com/aws-cost-management/aws-cost-explorer/pricing/" }],
  r53: [{ label: "Route 53 pricing", href: "https://aws.amazon.com/route53/pricing/" }],
  secrets: [{ label: "Secrets Manager pricing", href: "https://aws.amazon.com/secrets-manager/pricing/" }],
  apigw: [{ label: "API Gateway pricing", href: "https://aws.amazon.com/api-gateway/pricing/" }],
};

const DEFAULT_SERVICES = [
  { key: "rds", name: "Amazon RDS", baseline: 879.10, elasticity: 0.6, notes: TERMS.rds },
  { key: "savings", name: "Savings Plans (EC2)", baseline: 853.97, elasticity: 0.2, notes: "Discount program: mostly fixed monthly commitment." },
  { key: "ec2", name: "Amazon EC2", baseline: 411.22, elasticity: 0.9, notes: TERMS.ec2 },
  { key: "ebs", name: "Amazon EBS", baseline: 171.31, elasticity: 0.5, notes: TERMS.ebs },
  { key: "vpc", name: "Amazon VPC", baseline: 99.80, elasticity: 0.2, notes: TERMS.vpc },
  { key: "dt", name: "Data Transfer / Bandwidth", baseline: 50.87, elasticity: 1.0, notes: TERMS.dt },
  { key: "cloudwatch", name: "Amazon CloudWatch", baseline: 49.71, elasticity: 0.9, notes: TERMS.cloudwatch },
  { key: "alb", name: "Elastic Load Balancer (ALB)", baseline: 36.35, elasticity: 0.8, notes: TERMS.alb },
  { key: "sms", name: "End User Messaging (SMS)", baseline: 29.67, elasticity: 1.0, notes: TERMS.sms },
  { key: "waf", name: "AWS WAF", baseline: 8.00, elasticity: 0.3, notes: TERMS.waf },
  { key: "s3", name: "Amazon S3", baseline: 4.72, elasticity: 0.5, notes: TERMS.s3 },
  { key: "kms", name: "AWS KMS", baseline: 2.00, elasticity: 0.2, notes: TERMS.kms },
  { key: "ecr", name: "Amazon ECR", baseline: 0.78, elasticity: 0.1, notes: TERMS.ecr },
  { key: "ce", name: "AWS Cost Explorer", baseline: 0.51, elasticity: 0.0, notes: TERMS.ce },
  { key: "r53", name: "Amazon Route 53", baseline: 0.50, elasticity: 0.1, notes: TERMS.r53 },
  { key: "secrets", name: "AWS Secrets Manager", baseline: 0.40, elasticity: 0.0, notes: TERMS.secrets },
  { key: "apigw", name: "Amazon API Gateway", baseline: 0.01, elasticity: 0.7, notes: TERMS.apigw },
];

function computeProjected(baseline, elasticity, factor, trafficBoost = 1){
  const fixed = baseline * (1 - elasticity);
  const variable = baseline * elasticity * factor * trafficBoost;
  return fixed + variable;
}
function applyFx(amountUSD, currency, fxRate){
  if(currency === 'INR') return amountUSD * (fxRate>0?fxRate:85);
  return amountUSD;
}
function fmtAmount(amountUSD, currency, fxRate, opts={maximumFractionDigits:2}){
  const local = applyFx(amountUSD, currency, fxRate);
  const prefix = currency==='INR' ? '₹' : '$';
  return prefix + Number(local).toLocaleString(undefined, opts);
}
function buildCSV(rows, baselineTotal, projectedTotal, csvCurrency = 'USD', fxRate = 85){
  const isINR = csvCurrency === 'INR';
  const toLocal = v => isINR ? v * (fxRate > 0 ? fxRate : 85) : v;
  const header = ['Service', isINR ? 'BaselineINR' : 'BaselineUSD', 'Elasticity', isINR ? 'ProjectedINR' : 'ProjectedUSD'].join(',');
  const body = rows.map(r => [
    r.name,
    toLocal(r.baseline).toFixed(2),
    r.elasticity.toFixed(2),
    toLocal(r.projected ?? 0).toFixed(2)
  ].join(','));
  return [
    header,
    ...body,
    '',
    `Baseline Total,, ,${toLocal(baselineTotal).toFixed(2)}`,
    `Projected Total,, ,${toLocal(projectedTotal).toFixed(2)}`
  ].join("\n");
}

export default function AwsCostEstimator(){
  // Load font & Chart.js once
  useEffect(() => {
    if (!document.querySelector('link[href*="fonts.googleapis.com/css2?family=Inter" ]')) {
      const l1 = document.createElement('link'); l1.rel = 'preconnect'; l1.href = 'https://fonts.googleapis.com';
      const l2 = document.createElement('link'); l2.rel = 'preconnect'; l2.href = 'https://fonts.gstatic.com'; l2.crossOrigin = '';
      const l3 = document.createElement('link'); l3.rel = 'stylesheet'; l3.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
      document.head.append(l1, l2, l3);
    }
  }, []);
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    // Using locally installed Chart.js; mark ready immediately
    setChartsReady(true);
  }, []);

  // Core state
  const [currency, setCurrency] = useState('USD');
  const [fxRate, setFxRate] = useState(85);
  const [currentUsers, setCurrentUsers] = useState(50000);
  const [futureUsers, setFutureUsers] = useState(100000);
  const [monthlyGrowthPct, setMonthlyGrowthPct] = useState(10);
  const [months, setMonths] = useState(12);
  const [roundUsers, setRoundUsers] = useState(true);
  const [usageWeight, setUsageWeight] = useState('light'); // 'light' | 'medium' | 'heavy'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [services, setServices] = useState(() => JSON.parse(JSON.stringify(DEFAULT_SERVICES)));

  // Dealership scenario inputs
  const [sc, setSc] = useState({
    dealers: 10,
    seatsPerDealer: 12,
    inventoryPerDealer: 150,
    newListingsPerDealer: 80,
    photosPerListing: 12,
    videoMinPerListing: 0.5,
    visitsPerListing: 50,
    leadRatePct: 2,
    smsPerLead: 2,
  });

  const scenarioDerived = useMemo(() => {
    const staffMAU = sc.dealers * sc.seatsPerDealer;
    const leadsPerListing = sc.visitsPerListing * (sc.leadRatePct/100);
    const buyerMAU = sc.dealers * sc.inventoryPerDealer * leadsPerListing; // approx unique buyers contacting
    const smsPerMonth = buyerMAU * sc.smsPerLead;
    const mediaPhotosPerMonth = sc.dealers * sc.newListingsPerDealer * sc.photosPerListing;
    const mediaVideoMinutesPerMonth = sc.dealers * sc.newListingsPerDealer * sc.videoMinPerListing;
    return {
      staffMAU,
      buyerMAU,
      derivedMAU: Math.round(staffMAU + buyerMAU),
      smsPerMonth: Math.round(smsPerMonth),
      mediaPhotosPerMonth: Math.round(mediaPhotosPerMonth),
      mediaVideoMinutesPerMonth: Math.round(mediaVideoMinutesPerMonth),
    };
  }, [sc]);

  function scenarioWeight(i = sc){
    if(i.photosPerListing>=15 || i.videoMinPerListing>=1 || i.visitsPerListing>=100) return 'heavy';
    if(i.photosPerListing<=6 && i.videoMinPerListing===0 && i.visitsPerListing<30) return 'light';
    return 'medium';
  }

  const scaleFactor = useMemo(() => (currentUsers>0 && futureUsers>0) ? futureUsers/currentUsers : 1, [currentUsers, futureUsers]);

  // Filter by service selection (empty = no filter)
  const [selectedServiceKeys, setSelectedServiceKeys] = useState([]);
  const isFiltered = selectedServiceKeys.length > 0;
  const toggleService = (key) => setSelectedServiceKeys(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key]);
  const clearFilter = () => setSelectedServiceKeys([]);

  const rows = useMemo(() => {
    const trafficKeys = new Set(["dt","cloudwatch","alb","apigw"]);
    const weightBoost = usageWeight==='light' ? 0.8 : usageWeight==='heavy' ? 1.4 : 1.0;
    const base = services.map(s => ({
      ...s,
      projected: computeProjected(s.baseline, s.elasticity, scaleFactor, trafficKeys.has(s.key) ? weightBoost : 1)
    }));
    if (!isFiltered) return base;
    const sel = new Set(selectedServiceKeys);
    return base.filter(r => sel.has(r.key));
  }, [services, scaleFactor, usageWeight, isFiltered, selectedServiceKeys]);

  const baselineTotal = useMemo(() => services.reduce((a,s)=>a+s.baseline,0), [services]);
  const projectedTotal = useMemo(() => rows.reduce((a,r)=>a+(r.projected||0),0), [rows]);
  const perUserNow = baselineTotal / Math.max(1,currentUsers);
  const perUserFuture = projectedTotal / Math.max(1,futureUsers);

  // Forecast data
  const forecast = useMemo(() => {
    const out = [];
    let users = currentUsers;
    for(let m=0;m<=months;m++){
      const factor = (users>0 && currentUsers>0) ? (users/currentUsers) : 1;
      const trafficKeys = new Set(["dt","cloudwatch","alb","apigw"]);
      const weightBoost = usageWeight==='light' ? 0.8 : usageWeight==='heavy' ? 1.4 : 1.0;
      const total = services
        .map(s => computeProjected(s.baseline, s.elasticity, factor, trafficKeys.has(s.key) ? weightBoost : 1))
        .reduce((a,b)=>a+b,0);
      out.push({ month:`M${m}`, users: roundUsers?Math.round(users):users, total });
      users = users * (1 + monthlyGrowthPct/100);
    }
    return out;
  }, [currentUsers, months, monthlyGrowthPct, roundUsers, services, usageWeight]);

  // Charts (Chart.js via refs)
  const pieRef = useRef(null);
  const areaRef = useRef(null);
  const pieChartRef = useRef(null);
  const areaChartRef = useRef(null);
  

  // init pie chart once ready (independent of area chart)
  useEffect(() => {
    if (!chartsReady || !pieRef.current) return;
    if (pieChartRef.current) pieChartRef.current.destroy();

    const pieCanvas = pieRef.current;
    const pieParent = pieCanvas.parentElement;
    if (pieParent) { pieCanvas.width = pieParent.clientWidth; pieCanvas.height = 260; }

    const dataValues = rows.map(r=>r.projected||0);
    const dataColors = rows.map((_,i)=> COLORS[i%COLORS.length]);
    pieChartRef.current = new Chart(pieCanvas.getContext('2d'), {
      type: 'doughnut',
      data: { labels: rows.map(r=>r.name), datasets: [{ data: dataValues, backgroundColor: dataColors }] },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtAmount(ctx.parsed, currency, fxRate)}` } } },
        cutout: '55%'
      }
    });
    pieCanvas.onclick = (evt) => {
      const points = pieChartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
      if (points.length) {
        const idx = points[0].index;
        const key = rows[idx].key;
        toggleService(key);
      }
    };
    return () => { try{ pieChartRef.current?.destroy(); }catch{} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartsReady, rows, currency, fxRate]);

  // init area chart when ready and when its canvas exists (advanced section)
  useEffect(() => {
    if (!chartsReady || !areaRef.current) return;
    if (areaChartRef.current) areaChartRef.current.destroy();

    const areaCanvas = areaRef.current;
    const areaParent = areaCanvas.parentElement;
    if (areaParent) { areaCanvas.width = areaParent.clientWidth; areaCanvas.height = 360; }

    areaChartRef.current = new Chart(areaCanvas.getContext('2d'), {
      type: 'line',
      data: { labels: forecast.map(d=>d.month), datasets: [{ label: 'Total cost', data: forecast.map(d=>d.total), fill: true, borderColor: '#3366CC', backgroundColor: 'rgba(51,102,204,0.25)', tension: 0.3 }] },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: { y: { ticks: { callback: (v) => fmtAmount(Number(v), currency, fxRate, { maximumFractionDigits: 0 }) } } },
        plugins: { legend: { display: true }, tooltip: { callbacks: { label: (ctx) => fmtAmount(Number(ctx.parsed.y), currency, fxRate) } } }
      }
    });
    return () => { try{ areaChartRef.current?.destroy(); }catch{} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartsReady, showAdvanced]);

  // update pie/area charts on data / currency change
  useEffect(() => {
    if (!pieChartRef.current || !areaChartRef.current) return;
    // Pie
    pieChartRef.current.data.labels = rows.map(r=>r.name);
    pieChartRef.current.data.datasets[0].data = rows.map(r=>r.projected||0);
    pieChartRef.current.update();
    // Area
    areaChartRef.current.data.labels = forecast.map(d=>d.month);
    areaChartRef.current.data.datasets[0].data = forecast.map(d=>d.total);
    areaChartRef.current.options.scales.y.ticks.callback = (v) => fmtAmount(Number(v), currency, fxRate, { maximumFractionDigits: 0 });
    areaChartRef.current.update();
  }, [rows, forecast, currency, fxRate]);

  // Actions
  function exportCSV(){
    const csv = buildCSV(rows, baselineTotal, projectedTotal, currency, fxRate);
    const filename = currency === 'INR' ? 'aws-cost-projection-inr.csv' : 'aws-cost-projection-usd.csv';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  function resetAll(){
    setCurrency('USD'); setFxRate(85); setCurrentUsers(50000); setFutureUsers(100000); setMonthlyGrowthPct(10);
    setMonths(12); setRoundUsers(true); setUsageWeight('light'); setServices(JSON.parse(JSON.stringify(DEFAULT_SERVICES)));
    setShowAdvanced(false);
  }

  // Lightweight runtime checks (dev only)
  useEffect(() => {
    try{
      console.assert(computeProjected(100,0,10)===100, 'fixed cost remains 100');
      console.assert(Math.abs(computeProjected(100,1,2)-200)<1e-9, 'fully elastic = 200');
      console.assert(Math.abs(computeProjected(100,0.5,2)-150)<1e-9, 'half elastic = 150');

      const csvSample = buildCSV([
        { name:'X', baseline:10, elasticity:0.5, projected:15 },
        { name:'Y', baseline:5, elasticity:1.0, projected:10 }
      ], 15, 25);
      console.assert(csvSample.includes('\n'), 'CSV has newlines');
      const lines = csvSample.split('\n');
      console.assert(lines.length === 1+2+1+2, 'CSV line count for 2 rows');

      const csvUSD = buildCSV([{ name:'X', baseline:10, elasticity:0.5, projected:15 }], 10, 15, 'USD', 85);
      console.assert(csvUSD.startsWith('Service,BaselineUSD,Elasticity,ProjectedUSD'), 'CSV USD header');
      const csvINR = buildCSV([{ name:'X', baseline:10, elasticity:0.5, projected:15 }], 10, 15, 'INR', 80);
      console.assert(csvINR.startsWith('Service,BaselineINR,Elasticity,ProjectedINR'), 'CSV INR header');
    }catch(e){}
  }, []);

  return (
    <div className="wrap">
      <GlobalStyle/>

        {/* Header */}
      <div className="header">
          <div>
          <h1>AWS Cost Estimator</h1>
          <p className="muted">Answer 4 quick inputs. Get a clean monthly estimate and a simple breakdown.</p>
        </div>
        <div className="flex" style={{ flexWrap: 'wrap', gap: '8px 12px' }}>
          <div className="flex">
            <label>
              Currency
              <span className="tooltip">?
                <span className="tip">{TERMS.currency}</span>
              </span>
            </label>
            <div className="flex">
              <button className={`btn group ${currency==='USD' ? 'active' : ''}`} onClick={() => setCurrency('USD')}>$ USD</button>
              <button className={`btn group ${currency==='INR' ? 'active' : ''}`} onClick={() => setCurrency('INR')}>₹ INR</button>
          </div>
            {currency==='INR' && (
              <div className="flex" style={{ marginLeft: 8 }}>
                <label>
                  USD→INR
                  <span className="tooltip">?
                    <span className="tip">{TERMS.fx}</span>
                  </span>
                </label>
                <input type="number" step={0.01} value={fxRate} onChange={(e)=> setFxRate(Math.max(0, parseFloat(e.target.value) || 0))} style={{ width: 90 }} />
              </div>
            )}
          </div>
          <button className="btn" onClick={resetAll}>Reset</button>
          <button className="btn primary" onClick={exportCSV}>Export CSV</button>
        </div>
      </div>

      {/* Advanced toggle */}
      <div className="card" style={{ margin: '16px 0' }}>
        <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div className="flex"><span className="note">Optional</span> <span className="muted">Show advanced controls (elasticity & detailed services)</span></div>
          <label className="switch">
            <input type="checkbox" checked={showAdvanced} onChange={(e)=> setShowAdvanced(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Top row */}
      <div className="row">
        {/* Quick Start */}
        <div className="card">
          <div className="content inputs">
            <div className="flex" style={{ gap: 6 }}><h2>Quick Start</h2></div>
            <div>
              <label>
                Current users (MAU)
                <span className="tooltip">?
                  <span className="tip">{TERMS.mau}</span>
                </span>
              </label>
              <input type="number" value={currentUsers} onChange={(e)=> setCurrentUsers(parseInt(e.target.value || '0', 10))} />
            </div>
            <div>
              <label>
                Target users for this estimate
                <span className="tooltip">?
                  <span className="tip">{TERMS.futureUsers}</span>
                </span>
              </label>
              <input type="number" value={futureUsers} onChange={(e)=> setFutureUsers(parseInt(e.target.value || '0', 10))} />
              <div className="flex" style={{ alignItems: 'center', gap: 12, marginTop: 8 }}>
                <label>
                  Scale vs. today
                  <span className="tooltip">?
                    <span className="tip">{TERMS.scaleFactor}</span>
                  </span>
                </label>
                <div className="slider-inline">
                  <input type="range" min={0.1} max={5} step={0.01} value={scaleFactor} onChange={(e)=> setFutureUsers(Math.round((currentUsers || 1) * (parseFloat(e.target.value) || 1)))} />
                  <div className="muted" style={{ width: 50, textAlign: 'right' }}>{scaleFactor.toFixed(2)}×</div>
                </div>
              </div>
            </div>
            <div>
              <label>
                Expected monthly growth (%)
                <span className="tooltip">?
                  <span className="tip">{TERMS.monthlyGrowth}</span>
                </span>
              </label>
              <input type="number" value={monthlyGrowthPct} onChange={(e)=> setMonthlyGrowthPct(parseFloat(e.target.value || '0'))} />
            </div>
            <div>
              <label>
                How heavy is typical usage?
                <span className="tooltip">?
                  <span className="tip">{TERMS.trafficMultiplier}</span>
                </span>
              </label>
              <div className="flex">
                {(['light','medium','heavy']).map(w => (
                  <button key={w} className={`btn ${usageWeight===w? 'active' : ''}`} onClick={()=> setUsageWeight(w)}>
                    {w[0].toUpperCase()+w.slice(1)}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12 }}>Light = quick browsing • Medium = standard • Heavy = lots of uploads/streaming</p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <div className="content">
            <div className="flex" style={{ gap: 8, alignItems: 'center' }}><h2>Your Estimate</h2></div>
            <div className="grid2" style={{ marginTop: 8 }}>
              <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Baseline total</div><div className="value">{fmtAmount(baselineTotal, currency, fxRate)}</div></div>
              <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Projected total</div><div className="value">{fmtAmount(projectedTotal, currency, fxRate)}</div></div>
              <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Cost per user (now)</div><div className="value">{fmtAmount(perUserNow, currency, fxRate)}</div></div>
              <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Cost per user (future)</div><div className="value">{fmtAmount(perUserFuture, currency, fxRate)}</div></div>
            </div>
          </div>
        </div>

        {/* Pie + Bar */}
        <div className="card">
          <div className="content">
            <div style={{ height: 260, marginBottom: 0 }}>
              <canvas ref={pieRef} />
            </div>
            <div className="muted" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 4 }}>
              <span>Projected cost by service</span>
              {isFiltered && <button className="btn" onClick={clearFilter}>Clear filter</button>}
            </div>
                    </div>
                  </div>
                </div>

      {/* Advanced section */}
      {showAdvanced && (
        <div style={{ marginTop: 16 }}>
          <div className="card">
            <div className="content">
              <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h2>Services & Elasticity <span className="note">Edit baseline $ and elasticity (0=fixed, 1=scales)</span></h2>
              </div>
              <div style={{ overflow: 'auto' }}>
                <table>
                  <thead className="muted">
                    <tr>
                      <th>Service</th>
                      <th>Baseline (USD)</th>
                      <th>Elasticity</th>
                      <th>Projected (USD)</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.key}>
                        <td><strong>{r.name}</strong> <span className="info" title={r.notes || ''}>i</span></td>
                        <td style={{ minWidth: 180 }}>
                          <div className="flex">
                            <input type="number" step={0.01} value={r.baseline} onChange={(e)=> setServices(prev => prev.map(s => s.key===r.key ? { ...s, baseline: parseFloat(e.target.value) || 0 } : s))} style={{ width: 120 }} />
                            <span className="muted" style={{ fontSize: 12 }}>&nbsp;&nbsp;{fmtAmount(r.baseline, currency, fxRate)}</span>
                          </div>
                        </td>
                        <td style={{ minWidth: 220 }}>
                          <div className="slider-inline">
                            <input type="range" min={0} max={1} step={0.05} value={r.elasticity} onChange={(e)=> setServices(prev => prev.map(s => s.key===r.key ? { ...s, elasticity: parseFloat(e.target.value) || 0 } : s))} />
                            <span style={{ width: 36, textAlign: 'right' }}>{r.elasticity.toFixed(2)}</span>
                </div>
                        </td>
                        <td><strong>{fmtAmount(r.projected || 0, currency, fxRate)}</strong></td>
                        <td className="muted" style={{ fontSize: 12 }}>{r.notes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
                  </div>
                </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="content">
              <div className="flex" style={{ gap: 8, alignItems: 'center' }}>
                <h2><span>{months}</span>-Month Forecast</h2>
                  </div>
              <div className="grid2" style={{ margin: '8px 0 10px' }}>
                <div>
                  <label>Months to project</label>
                  <input type="number" value={months} onChange={(e)=> setMonths(Math.max(1, parseInt(e.target.value || '1', 10)))} />
                </div>
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label>Round users in chart</label>
                    <p className="muted" style={{ fontSize: 12 }}>Visual only</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={roundUsers} onChange={(e)=> setRoundUsers(!!e.target.checked)} />
                    <span className="slider" />
                  </label>
                </div>
              </div>
              <div style={{ height: 360 }}>
                <canvas ref={areaRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dealership Scenario */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="content">
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Dealership Scenario (Aura)</h2>
            <button className="btn primary" onClick={() => { setFutureUsers(scenarioDerived.derivedMAU || futureUsers); setUsageWeight(scenarioWeight()); }}>Apply to estimator</button>
                        </div>
          <p className="muted" style={{ margin: '6px 0 10px' }}>Estimate future usage from dealership counts and marketplace activity. All fields have friendly defaults.</p>
          <div className="grid2">
            {([
              ["dealers","Number of dealerships"],
              ["seatsPerDealer","CRM seats per dealership"],
              ["inventoryPerDealer","Vehicles in stock per dealership"],
              ["newListingsPerDealer","New listings / month / dealership"],
              ["photosPerListing","Avg photos per listing"],
              ["videoMinPerListing","Avg video minutes per listing"],
              ["visitsPerListing","Marketplace visits / listing / month"],
              ["leadRatePct","Lead rate (%) per 100 visits"],
              ["smsPerLead","SMS per lead (OTP/alerts)"],
            ]).map(([key,label]) => (
              <div key={key}>
                <label>{label}</label>
                <input type="number" step={key==='videoMinPerListing' || key==='leadRatePct' ? 0.1 : 1} value={sc[key]} onChange={(e)=> setSc(prev => ({ ...prev, [key]: parseFloat(e.target.value || '0') }))} />
                                  </div>
                            ))}
                      </div>
          <div className="grid2" style={{ marginTop: 12 }}>
            <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Derived target users (MAU)</div><div className="value">{scenarioDerived.derivedMAU.toLocaleString()}</div></div>
            <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Estimated SMS / month</div><div className="value">{scenarioDerived.smsPerMonth.toLocaleString()}</div></div>
            <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Photo uploads / month</div><div className="value">{scenarioDerived.mediaPhotosPerMonth.toLocaleString()}</div></div>
            <div className="stat"><div className="muted" style={{ fontSize: 12 }}>Video minutes / month</div><div className="value">{scenarioDerived.mediaVideoMinutesPerMonth.toLocaleString()}</div></div>
                      </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Heuristic usage weight will be chosen based on media and traffic (light/medium/heavy).</p>
                        </div>
                      </div>

      {/* Pricing Guide */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="content">
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Pricing Guide (Management) – What drives each line item?</summary>
            <p className="muted" style={{ margin: '10px 0 14px' }}>Simple summary of how each AWS service is billed, plus direct links to the official AWS pricing pages. Prices vary by Region, usage tier, and options. Always confirm on the linked AWS pages or the AWS Pricing Calculator.</p>
            <div className="pricing-grid">
              {DEFAULT_SERVICES.map(s => (
                <div key={s.key} className="card">
                  <div className="content">
                    <div className="flex" style={{ justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>Baseline: ${s.baseline.toFixed(2)}</div>
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>{TERMS[s.key] || s.notes || ''}</div>
                    <div className="chips" style={{ marginTop: 8 }}>
                      {(PRICING_LINKS[s.key]||[]).map(l => (
                        <a key={l.href} className="link" href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                      ))}
                    </div>
                        </div>
                      </div>
                    ))}
                  </div>
          </details>
        </div>
      </div>
    </div>
  );
}
