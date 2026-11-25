(function () {
  "use strict";

  const THEME_KEY = "retiresmart_us_theme_v1";
  const STATE_KEY = "retiresmart_us_state_v1";
  const CONFIG = window.RETIRESMART_CONFIG;

  const STD_DED_2026 = { single: 15000, married: 30000 };
  const BRACKETS_2026 = {
    single: [
      { upTo: 11925, rate: 0.10 },
      { upTo: 48475, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: Infinity, rate: 0.32 }
    ],
    married: [
      { upTo: 23850, rate: 0.10 },
      { upTo: 96950, rate: 0.12 },
      { upTo: 206700, rate: 0.22 },
      { upTo: 394600, rate: 0.24 },
      { upTo: Infinity, rate: 0.32 }
    ]
  };

  const TOOL_META = {
    fire: {
      title: "2026 FIRE & Coast FIRE Number Calculator",
      desc: "Calculate your Lean, Regular, Fat, and Coast FIRE targets in today's dollars — then reverse-calculate the exact monthly investment needed to retire at your target age."
    },
    roth401k: {
      title: "Roth vs. Traditional 401(k) Tax Arbitrage Calculator",
      desc: "Compare after-tax spendable wealth on an equal pre-tax budget and find your exact Break-Even Retirement Tax Rate."
    },
    ladder: {
      title: "2026 5-Year Roth Conversion Ladder Planner",
      desc: "Map penalty-free early retirement withdrawals before age 59.5 using the IRS 5-Year Aging Rule, 2026 low-bracket taxes, and CSV export — 100% free."
    }
  };

  const PRESETS = {
    fire: [
      { label: "Tech Saver (Age 32 · $60k Spend)", set: { frAge: 32, frCoastAge: 65, frSpend: 60000, frPortfolio: 140000, frMonthly: 2000, frRealReturn: 7.0, frSwr: 4.0, frTargetAge: 48 } },
      { label: "Coast FIRE Push (Age 36 · $350k)", set: { frAge: 36, frCoastAge: 65, frSpend: 70000, frPortfolio: 350000, frMonthly: 1800, frRealReturn: 7.0, frSwr: 4.0, frTargetAge: 50 } },
      { label: "Lean FIRE (Age 28 · $42k Spend)", set: { frAge: 28, frCoastAge: 65, frSpend: 42000, frPortfolio: 85000, frMonthly: 2200, frRealReturn: 7.0, frSwr: 4.0, frTargetAge: 42 } },
      { label: "Fat FIRE (Age 40 · $120k Spend)", set: { frAge: 40, frCoastAge: 65, frSpend: 120000, frPortfolio: 650000, frMonthly: 5000, frRealReturn: 7.0, frSwr: 3.75, frTargetAge: 55 } }
    ],
    roth401k: [
      { label: "High Earner (29% Now -> 16% Ret)", set: { rt4Contrib: 18000, rt4Years: 25, rt4CurTax: 29, rt4RetTax: 16, rt4Return: 8.0 } },
      { label: "Early Career (15% Now -> 24% Ret)", set: { rt4Contrib: 10000, rt4Years: 32, rt4CurTax: 15, rt4RetTax: 24, rt4Return: 8.5 } },
      { label: "Max 2026 ($23.5k · 24% -> 18%)", set: { rt4Contrib: 23500, rt4Years: 20, rt4CurTax: 24, rt4RetTax: 18, rt4Return: 8.0 } }
    ],
    ladder: [
      { label: "Married FIRE (Age 45 · $60k/yr)", set: { ldRetireAge: 45, ldFiling: "married", ldTradBal: 750000, ldConvertAmt: 60000, ldAnnualSpend: 55000, ldGrowth: 6.0 } },
      { label: "Single FIRE (Age 42 · $45k/yr)", set: { ldRetireAge: 42, ldFiling: "single", ldTradBal: 600000, ldConvertAmt: 45000, ldAnnualSpend: 42000, ldGrowth: 6.0 } },
      { label: "Zero-Tax Married ($30k Std Ded)", set: { ldRetireAge: 48, ldFiling: "married", ldTradBal: 500000, ldConvertAmt: 30000, ldAnnualSpend: 48000, ldGrowth: 6.0 } }
    ]
  };

  const RESULT_CTA_COPY = {
    fire: {
      title: "Track Your Live FIRE Progress Bar & Coast FIRE Date in Google Sheets",
      desc: "Pair RetireSmart US with the 2026 US Personal Finance & Wealth OS to log net worth and savings rate monthly."
    },
    roth401k: {
      title: "Balance Traditional, Roth & Brokerage Buckets in One Net Worth OS",
      desc: "See your tax-free vs. pre-tax retirement mix automatically inside the 2026 Wealth OS."
    },
    ladder: {
      title: "Log Every Annual Roth Conversion & 5-Year Unlock Date Automatically",
      desc: "Keep IRS Form 8606 conversion tranches organized alongside your 5-year bridge fund in Google Sheets."
    }
  };

  const SAVED_FIELDS = [
    "frAge", "frCoastAge", "frSpend", "frPortfolio", "frMonthly", "frRealReturn", "frSwr", "frTargetAge",
    "rt4Contrib", "rt4Years", "rt4CurTax", "rt4RetTax", "rt4Return",
    "ldRetireAge", "ldFiling", "ldTradBal", "ldConvertAmt", "ldAnnualSpend", "ldGrowth"
  ];

  const URL_MAP = {
    fire: { age: "frAge", coast: "frCoastAge", spend: "frSpend", port: "frPortfolio", mo: "frMonthly", ret: "frRealReturn", swr: "frSwr", target: "frTargetAge" },
    roth401k: { contrib: "rt4Contrib", yrs: "rt4Years", ctax: "rt4CurTax", rtax: "rt4RetTax", ret: "rt4Return" },
    ladder: { age: "ldRetireAge", filing: "ldFiling", bal: "ldTradBal", conv: "ldConvertAmt", spend: "ldAnnualSpend", grow: "ldGrowth" }
  };

  let activeTool = "fire";
  let lastSummaryText = "";
  let lastLadderRows = [];
  let lastRequiredMonthly = 0;
  let toastTimer = null;

  const $ = (id) => document.getElementById(id);

  function fmtUSD(n) {
    const val = Math.round(Number(n) || 0);
    return (val < 0 ? "-$" : "$") + Math.abs(val).toLocaleString("en-US");
  }

  function showToast(msg) {
    const box = $("toastBox");
    box.textContent = msg;
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 2600);
  }

  function downloadCsv(filename, headers, rows) {
    const lines = [headers.join(",")].concat(
      rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }

  function calcFedTax2026(grossIncome, filing) {
    const ded = STD_DED_2026[filing] || 15000;
    const taxable = Math.max(0, grossIncome - ded);
    const brackets = BRACKETS_2026[filing] || BRACKETS_2026.single;
    let tax = 0;
    let prev = 0;
    for (const b of brackets) {
      if (taxable <= prev) break;
      const slice = Math.min(taxable, b.upTo) - prev;
      tax += slice * b.rate;
      prev = b.upTo;
    }
    return tax;
  }

  function saveState() {
    const data = {};
    SAVED_FIELDS.forEach((id) => {
      const el = $(id);
      if (el) data[id] = el.value;
    });
    try { localStorage.setItem(STATE_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function restoreState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      SAVED_FIELDS.forEach((id) => {
        const el = $(id);
        if (el && data[id] !== undefined) el.value = data[id];
      });
    } catch (_) {}
  }

  function buildShareUrl() {
    const params = new URLSearchParams();
    params.set("tab", activeTool);
    const map = URL_MAP[activeTool] || {};
    Object.entries(map).forEach(([k, id]) => {
      const el = $(id);
      if (el) params.set(k, el.value);
    });
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  function applyUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    const targetTab = TOOL_META[tabParam] ? tabParam : null;
    if (!targetTab) return null;
    const map = URL_MAP[targetTab] || {};
    Object.entries(map).forEach(([k, id]) => {
      if (params.has(k) && $(id)) $(id).value = params.get(k);
    });
    return targetTab;
  }

  function syncSliders() {
    $("frSpendSlider").value = Math.min(180000, Math.max(25000, Number($("frSpend").value) || 25000));
    $("rt4ReturnSlider").value = Math.min(12, Math.max(3, Number($("rt4Return").value) || 8));
  }

  /* TAB 1: FIRE & COAST FIRE */
  function updateFire() {
    const age = Math.min(80, Math.max(18, Number($("frAge").value) || 32));
    const tradRetAge = Math.max(age + 1, Number($("frCoastAge").value) || 65);
    const spend = Math.max(10000, Number($("frSpend").value) || 60000);
    const port = Math.max(0, Number($("frPortfolio").value) || 0);
    const monthly = Math.max(0, Number($("frMonthly").value) || 0);
    const realRet = Math.max(0.5, Number($("frRealReturn").value) || 7.0) / 100;
    const swr = Math.max(2.0, Number($("frSwr").value) || 4.0) / 100;
    const targetAge = Math.max(age + 1, Number($("frTargetAge").value) || 48);

    $("frSpendHint").textContent = `${fmtUSD(spend)} / yr (${fmtUSD(spend / 12)}/mo)`;

    const fireNum = spend / swr;
    const leanFire = (spend * 0.75) / swr;
    const fatFire = (spend * 1.50) / swr;
    const coastToday = fireNum / Math.pow(1 + realRet, Math.max(0, tradRetAge - age));
    const progressPct = fireNum > 0 ? Math.min(100, (port / fireNum) * 100) : 0;

    // Simulate year-by-year to find exact FIRE Age & Coast FIRE Age
    let bal = port;
    let fireAge = null;
    let coastAge = port >= coastToday ? age : null;
    const rMo = realRet / 12;

    for (let y = 0; y <= 60; y++) {
      const curA = age + y;
      const coastNeedAtA = fireNum / Math.pow(1 + realRet, Math.max(0, tradRetAge - curA));
      if (coastAge === null && bal >= coastNeedAtA) coastAge = curA;
      if (fireAge === null && bal >= fireNum) fireAge = curA;
      if (fireAge !== null && coastAge !== null) break;
      for (let m = 0; m < 12; m++) {
        bal = bal * (1 + rMo) + monthly;
      }
    }

    // Reverse Monthly Savings to hit fireNum by targetAge
    const nMoTarget = Math.max(1, (targetAge - age) * 12);
    const fvCurrent = port * Math.pow(1 + rMo, nMoTarget);
    const gap = Math.max(0, fireNum - fvCurrent);
    const reqMo = gap > 0 && rMo > 0 ? gap / ((Math.pow(1 + rMo, nMoTarget) - 1) / rMo) : 0;
    lastRequiredMonthly = Math.ceil(reqMo / 25) * 25;

    $("frFireNumber").textContent = fmtUSD(fireNum);
    $("frAgeSub").textContent = fireAge !== null
      ? `Projected FIRE Age: ${fireAge} (${fireAge - age} years from now at ${(swr * 100).toFixed(2)}% SWR)`
      : `Increase monthly investing to reach FIRE within 60 years`;

    const badge = $("frCoastBadge");
    if (coastAge !== null && coastAge <= age) {
      badge.className = "status-pill pass tabular";
      badge.textContent = "Already Coast FIRE!";
    } else if (coastAge !== null) {
      badge.className = "status-pill pass tabular";
      badge.textContent = `Coast FIRE: Age ${coastAge}`;
    } else {
      badge.className = "status-pill warn tabular";
      badge.textContent = "Coast FIRE: Age 65+";
    }

    $("frCoastToday").textContent = fmtUSD(coastToday);
    $("frLeanFire").textContent = fmtUSD(leanFire);
    $("frFatFire").textContent = fmtUSD(fatFire);
    $("frProgressPct").textContent = `${progressPct.toFixed(1)}%`;
    $("frRequiredMonthly").textContent = lastRequiredMonthly > 0 ? `${fmtUSD(lastRequiredMonthly)} / mo` : "$0 / mo (Already on track!)";

    $("frInsightBox").innerHTML = coastAge !== null && coastAge <= age
      ? `<strong>You Hit Coast FIRE:</strong> Your ${fmtUSD(port)} portfolio already exceeds your ${fmtUSD(coastToday)} Coast FIRE number today. Even if you contribute $0 more, compounding at ${(realRet * 100).toFixed(1)}% real return reaches ${fmtUSD(fireNum)} by age ${tradRetAge}.`
      : `<strong>Coast FIRE Milestone:</strong> Once your invested portfolio crosses <strong>${fmtUSD(coastToday)}</strong> (projected at age <strong>${coastAge || tradRetAge}</strong>), you never have to save another dollar for traditional retirement at age ${tradRetAge} — you only need to cover current living costs.`;

    const smartCmpUrl = `${CONFIG.ecosystem.smartMoneyUrl}?tab=compound&initial=${Math.round(port)}&monthly=${Math.round(monthly)}&rate=10&years=${Math.max(5, Math.min(45, (fireAge || 55) - age))}`;
    $("frBridgeBox").innerHTML = `
      <div>
        <strong>Want the Full Nominal Year-by-Year S&amp;P 500 Table?</strong><br>
        Run your <strong>${fmtUSD(port)}</strong> + <strong>${fmtUSD(monthly)}/mo</strong> on SmartMoney US to export the full compounding schedule.
      </div>
      <a class="btn btn-primary btn-sm" href="${smartCmpUrl}" target="_blank" rel="noopener noreferrer" style="flex-shrink:0;">Open Compound Table &rarr;</a>
    `;

    if (activeTool === "fire") {
      lastSummaryText = `RetireSmart US FIRE: Target ${fmtUSD(fireNum)} (${fmtUSD(spend)}/yr spend) -> FIRE Age ${fireAge || "N/A"}, Coast FIRE Today ${fmtUSD(coastToday)}.`;
    }
  }

  /* TAB 2: ROTH VS TRADITIONAL 401(K) */
  function updateRoth401k() {
    const preTaxBudget = Math.max(500, Number($("rt4Contrib").value) || 18000);
    const years = Math.min(50, Math.max(1, Number($("rt4Years").value) || 25));
    const curTax = Math.min(55, Math.max(0, Number($("rt4CurTax").value) || 29)) / 100;
    const retTax = Math.min(55, Math.max(0, Number($("rt4RetTax").value) || 16)) / 100;
    const growth = Math.max(0, Number($("rt4Return").value) || 8.0) / 100;

    $("rt4ReturnHint").textContent = `${(growth * 100).toFixed(1)}% / yr`;

    // Annual contributions over 'years' on equal pre-tax budget
    const fvFactor = growth > 0 ? (Math.pow(1 + growth, years) - 1) / growth : years;
    const tradGross = preTaxBudget * fvFactor;
    const tradAfterTax = tradGross * (1 - retTax);

    // Same pre-tax budget invested into Roth = preTaxBudget * (1 - curTax) after paying taxes today
    const rothAnnualNet = preTaxBudget * (1 - curTax);
    const rothAfterTax = rothAnnualNet * fvFactor;

    const edge = Math.abs(tradAfterTax - rothAfterTax);
    const tradWins = tradAfterTax >= rothAfterTax;

    $("rt4WinnerVal").textContent = tradWins ? "Traditional 401(k) Wins" : "Roth 401(k) Wins";
    $("rt4WinnerSub").textContent = tradWins
      ? `Traditional leaves ${fmtUSD(edge)} more spendable after-tax wealth because your retirement tax (${Math.round(retTax * 100)}%) is lower than today's marginal rate (${Math.round(curTax * 100)}%).`
      : `Roth leaves ${fmtUSD(edge)} more tax-free wealth because your retirement tax (${Math.round(retTax * 100)}%) exceeds today's rate (${Math.round(curTax * 100)}%).`;

    $("rt4BreakEvenBadge").textContent = `Break-Even Tax: ${Math.round(curTax * 100)}%`;
    $("rt4TradNet").textContent = fmtUSD(tradAfterTax);
    $("rt4RothNet").textContent = fmtUSD(rothAfterTax);
    $("rt4Edge").textContent = `+${fmtUSD(edge)}`;

    const maxBar = Math.max(1, tradAfterTax, rothAfterTax);
    $("rt4CompareBars").innerHTML = `
      <div>
        <div class="cbar-row-head"><span>Traditional 401(k) (After ${Math.round(retTax * 100)}% Ret. Tax)</span><span class="tabular">${fmtUSD(tradAfterTax)}</span></div>
        <div class="cbar-track"><div class="cbar-fill" style="width:${((tradAfterTax / maxBar) * 100).toFixed(1)}%; background:var(--accent-emerald);"></div></div>
      </div>
      <div>
        <div class="cbar-row-head"><span>Roth 401(k) (Tax-Free, ${fmtUSD(rothAnnualNet)}/yr net in)</span><span class="tabular">${fmtUSD(rothAfterTax)}</span></div>
        <div class="cbar-track"><div class="cbar-fill" style="width:${((rothAfterTax / maxBar) * 100).toFixed(1)}%; background:var(--accent-navy);"></div></div>
      </div>
    `;

    $("rt4InsightBox").innerHTML = tradWins
      ? `<strong>Tax-Bracket Arbitrage:</strong> Traditional 401(k) saves tax at your <strong>top marginal bracket (${Math.round(curTax * 100)}%)</strong> today, while withdrawals in retirement fill the 0% standard deduction, 10%, and 12% brackets first. Pairing Traditional 401(k) with a 5-Year Roth Ladder (Tab 3) maximizes this edge.`
      : `<strong>Lock In Low Tax Rates Today:</strong> Because you expect a higher tax rate in retirement (${Math.round(retTax * 100)}% vs. ${Math.round(curTax * 100)}% today), paying taxes now via Roth 401(k) protects every dollar of future compounding from tax hikes.`;

    if (activeTool === "roth401k") {
      lastSummaryText = `RetireSmart US Roth vs Trad: ${tradWins ? "Traditional" : "Roth"} wins by ${fmtUSD(edge)} after tax (Break-even tax rate: ${Math.round(curTax * 100)}%).`;
    }
  }

  /* TAB 3: 5-YEAR ROTH CONVERSION LADDER */
  function updateLadder() {
    const retireAge = Math.min(55, Math.max(30, Number($("ldRetireAge").value) || 45));
    const filing = $("ldFiling").value;
    const tradStart = Math.max(10000, Number($("ldTradBal").value) || 750000);
    const convAmt = Math.max(5000, Number($("ldConvertAmt").value) || 60000);
    const annualSpend = Math.max(10000, Number($("ldAnnualSpend").value) || 55000);
    const growth = Math.max(0, Number($("ldGrowth").value) || 6.0) / 100;

    const currentYear = 2026;
    const bridgeNeed = annualSpend * 5;
    const annualTax = calcFedTax2026(convAmt, filing);
    const effRate = convAmt > 0 ? (annualTax / convAmt) * 100 : 0;

    let bal = tradStart;
    let totalConverted = 0;
    const rows = [];
    const totalYears = Math.max(6, 60 - retireAge);

    for (let i = 0; i < totalYears; i++) {
      const yr = currentYear + i;
      const age = retireAge + i;
      const converted = Math.min(bal, convAmt);
      const tax = calcFedTax2026(converted, filing);
      bal = Math.max(0, (bal - converted) * (1 + growth));
      totalConverted += converted;

      const unlockAge = age + 5;
      const unlockYr = yr + 5;
      const cashSource = i < 5
        ? `Bridge Fund (Year ${i + 1}/5)`
        : (age < 60 ? `Unlocked ${yr - 5} Roth Tranche` : `Age 59.5+ Unrestricted`);

      rows.push({
        yr, age, cashSource, converted, tax,
        unlockLabel: age < 55 ? `${unlockYr} (Age ${unlockAge})` : `Age 59.5+ (No wait)`,
        remTrad: bal,
        isBridge: i < 5
      });
    }

    lastLadderRows = rows;
    const penaltyYears = Math.max(0, 59 - (retireAge + 5));
    const penaltySaved = Math.min(totalConverted, annualSpend * penaltyYears) * 0.10;

    $("ldBridgeNeed").textContent = fmtUSD(bridgeNeed);
    $("ldFirstUnlockSub").textContent = `First Roth conversion unlocks penalty-free in ${currentYear + 5} (Age ${retireAge + 5})`;
    $("ldEffRateBadge").textContent = `Eff. Tax: ${effRate.toFixed(1)}%`;
    $("ldAnnualTax").textContent = `${fmtUSD(annualTax)}/yr`;
    $("ldPenaltySaved").textContent = fmtUSD(penaltySaved);
    $("ldTotalConverted").textContent = fmtUSD(totalConverted);

    $("ldInsightBox").innerHTML = `<strong>How the 5-Year Ladder Saves Thousands:</strong> Converting <strong>${fmtUSD(convAmt)}/yr</strong> (${filing === "married" ? "Married" : "Single"}) costs just <strong>${fmtUSD(annualTax)}/yr</strong> in federal tax (<strong>${effRate.toFixed(1)}% effective rate</strong> after the ${fmtUSD(STD_DED_2026[filing])} standard deduction), while avoiding the 10% early withdrawal penalty on pre-59.5 living expenses.`;

    $("ldTableBody").innerHTML = rows.map((r) => `
      <tr class="${r.age === retireAge + 5 ? "is-active-row" : ""}">
        <td>${r.yr} · Age ${r.age}</td>
        <td>${r.isBridge ? `<span class="status-pill warn">${r.cashSource}</span>` : `<span class="status-pill pass">${r.cashSource}</span>`}</td>
        <td>${fmtUSD(r.converted)}</td>
        <td>${fmtUSD(r.tax)}</td>
        <td>${r.unlockLabel}</td>
        <td>${fmtUSD(r.remTrad)}</td>
      </tr>
    `).join("");

    if (activeTool === "ladder") {
      lastSummaryText = `RetireSmart US Roth Ladder (Age ${retireAge}): Bridge needed ${fmtUSD(bridgeNeed)}, convert ${fmtUSD(convAmt)}/yr at ${effRate.toFixed(1)}% eff. tax (${fmtUSD(annualTax)}/yr), avoiding ${fmtUSD(penaltySaved)} in 10% early penalties.`;
    }
  }

  /* Presets Bar */
  function renderPresets() {
    const list = PRESETS[activeTool] || [];
    $("quickPresetsRow").innerHTML = list.map((p, idx) =>
      `<button type="button" class="preset-chip" data-preset-idx="${idx}">${p.label}</button>`
    ).join("");

    $("quickPresetsRow").querySelectorAll(".preset-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = list[Number(btn.dataset.presetIdx)];
        if (!preset || !preset.set) return;
        Object.entries(preset.set).forEach(([id, val]) => {
          const el = $(id);
          if (el) el.value = val;
        });
        syncSliders();
        recalcAll();
        saveState();
        showToast(`Loaded scenario: ${preset.label}`);
      });
    });
  }

  /* Offers, Checklists & Pentagon Links (Zero Coming Soon / (Soon)) */
  function openModal() {
    const m = $("wealthOsModal");
    if (m && typeof m.showModal === "function") m.showModal();
  }

  function renderOffers() {
    const matched = CONFIG.affiliates.filter((a) => a.context.includes(activeTool));
    const displayList = matched.length >= 3 ? matched.slice(0, 3) : CONFIG.affiliates.slice(0, 3);

    $("offersGrid").innerHTML = displayList.map((offer) => {
      const hasUrl = Boolean(offer.url && offer.url.trim());
      let actionHtml = "";
      if (hasUrl) {
        actionHtml = `<a class="btn btn-primary btn-sm" href="${offer.url}" target="_blank" rel="noopener noreferrer sponsored">${offer.ctaLabel}</a>`;
      } else {
        const itemsHtml = (offer.checklist || []).map((line) => `<li>${line}</li>`).join("");
        actionHtml = `
          <details class="offer-guide">
            <summary class="btn btn-sm">${offer.checklistTitle || "View 2026 Playbook"}</summary>
            <ul class="offer-guide-list">${itemsHtml}</ul>
          </details>
        `;
      }
      return `
        <article class="offer-card">
          <div>
            <span class="offer-badge">${offer.badge}</span>
            <h3>${offer.title}</h3>
            <p>${offer.summary}</p>
          </div>
          <div>${actionHtml}</div>
        </article>
      `;
    }).join("");

    const sheetOffer = CONFIG.ecosystem.gumroadWealthOs;
    const ytOffer = CONFIG.ecosystem.youtubeFinance;
    const hasSheetUrl = Boolean(sheetOffer.url && sheetOffer.url.trim());
    const hasYtUrl = Boolean(ytOffer.url && ytOffer.url.trim());

    const ecoBtns = [
      `<a class="btn btn-sm" href="${CONFIG.ecosystem.smartMoneyUrl}" target="_blank" rel="noopener noreferrer">SmartMoney US</a>`,
      `<a class="btn btn-sm" href="${CONFIG.ecosystem.debtFreeUrl}" target="_blank" rel="noopener noreferrer">DebtFree US</a>`,
      `<a class="btn btn-sm" href="${CONFIG.ecosystem.soloTaxUrl}" target="_blank" rel="noopener noreferrer">SoloTax US</a>`,
      `<a class="btn btn-sm" href="${CONFIG.ecosystem.propYieldUrl}" target="_blank" rel="noopener noreferrer">PropYield US</a>`
    ];
    if (hasYtUrl) ecoBtns.push(`<a class="btn btn-sm" href="${ytOffer.url}" target="_blank" rel="noopener noreferrer">${ytOffer.label}</a>`);
    if (hasSheetUrl) {
      ecoBtns.push(`<a class="btn btn-sm btn-primary" href="${sheetOffer.url}" target="_blank" rel="noopener noreferrer">${sheetOffer.label}</a>`);
    } else {
      ecoBtns.push(`<button type="button" class="btn btn-sm btn-primary" data-open-os-modal="1">Preview 2026 Wealth OS (Free Lite)</button>`);
    }
    $("ecoLinksContainer").innerHTML = ecoBtns.join("");

    document.querySelectorAll("[data-result-cta]").forEach((box) => {
      const key = box.dataset.resultCta;
      const copy = RESULT_CTA_COPY[key] || RESULT_CTA_COPY.fire;
      const btn = hasSheetUrl
        ? `<a class="btn btn-primary btn-sm" href="${sheetOffer.url}" target="_blank" rel="noopener noreferrer">${sheetOffer.label}</a>`
        : `<button type="button" class="btn btn-primary btn-sm" data-open-os-modal="1">Preview 2026 Wealth OS</button>`;
      box.innerHTML = `
        <div class="result-cta-copy">
          <strong>${copy.title}</strong>
          <p>${copy.desc}</p>
        </div>
        <div style="flex-shrink:0;">${btn}</div>
      `;
    });

    document.querySelectorAll("[data-open-os-modal]").forEach((b) => {
      b.addEventListener("click", openModal);
    });
  }

  function switchTool(toolId, updateHash) {
    if (!TOOL_META[toolId]) toolId = "fire";
    activeTool = toolId;

    document.querySelectorAll(".tool-tab").forEach((btn) => {
      btn.setAttribute("aria-selected", String(btn.dataset.tool === toolId));
    });
    document.querySelectorAll(".calc-panel").forEach((panel) => {
      panel.hidden = panel.id !== "panel-" + toolId;
    });

    $("activeToolHeading").textContent = TOOL_META[toolId].title;
    $("activeToolDesc").textContent = TOOL_META[toolId].desc;

    if (updateHash) history.replaceState(null, "", "#" + toolId);

    renderPresets();
    recalcAll();
    renderOffers();
  }

  function recalcAll() {
    updateFire();
    updateRoth401k();
    updateLadder();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
    $("themeToggleBtn").textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }

  function init() {
    $("brandNameText").textContent = CONFIG.brand.name;
    $("brandSubText").textContent = CONFIG.brand.subtitle;

    restoreState();
    const urlTab = applyUrlParams();
    syncSliders();
    applyTheme(localStorage.getItem(THEME_KEY) || "light");

    document.querySelectorAll(".tool-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTool(btn.dataset.tool, true));
    });

    $("themeToggleBtn").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(cur === "dark" ? "light" : "dark");
    });

    $("shareLinkBtn").addEventListener("click", () => {
      const url = buildShareUrl();
      history.replaceState(null, "", url);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => showToast("Shareable plan link copied to clipboard!")).catch(() => showToast("Share link updated in address bar."));
      } else {
        showToast("Share link updated in address bar.");
      }
    });

    $("copyScenarioBtn").addEventListener("click", () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lastSummaryText).then(() => showToast("Summary copied to clipboard.")).catch(() => showToast(lastSummaryText));
      } else {
        showToast(lastSummaryText);
      }
    });

    $("printReportBtn").addEventListener("click", () => window.print());

    $("resetDefaultsBtn").addEventListener("click", () => {
      try { localStorage.removeItem(STATE_KEY); } catch (_) {}
      window.location.href = window.location.pathname;
    });

    $("frApplyTargetBtn").addEventListener("click", () => {
      $("frMonthly").value = lastRequiredMonthly;
      updateFire();
      saveState();
      showToast(`Applied ${fmtUSD(lastRequiredMonthly)}/mo monthly savings.`);
    });

    $("ldExportCsvBtn").addEventListener("click", () => {
      downloadCsv(
        "retiresmart-us-roth-conversion-ladder-2026.csv",
        ["Year", "Age", "Living Cash Source", "Converted to Roth ($)", "Est. Federal Tax ($)", "Unlock Year", "Remaining Trad IRA ($)"],
        lastLadderRows.map((r) => [r.yr, r.age, r.cashSource, Math.round(r.converted), Math.round(r.tax), r.unlockLabel, Math.round(r.remTrad)])
      );
    });

    const closeModal = () => {
      const m = $("wealthOsModal");
      if (m && m.open) m.close();
    };
    $("closeModalBtn").addEventListener("click", closeModal);
    $("modalCloseFooterBtn").addEventListener("click", closeModal);
    $("modalPrintBtn").addEventListener("click", () => { closeModal(); window.print(); });

    const bind = (id, fn) => {
      const el = $(id);
      if (!el) return;
      const h = () => { fn(); saveState(); };
      el.addEventListener("input", h);
      el.addEventListener("change", h);
    };

    $("frSpend").addEventListener("input", (e) => {
      $("frSpendSlider").value = Math.min(180000, Math.max(25000, Number(e.target.value) || 25000));
      updateFire(); saveState();
    });
    $("frSpendSlider").addEventListener("input", (e) => {
      $("frSpend").value = e.target.value;
      updateFire(); saveState();
    });
    ["frAge", "frCoastAge", "frPortfolio", "frMonthly", "frRealReturn", "frSwr", "frTargetAge"].forEach((id) => bind(id, updateFire));

    $("rt4Return").addEventListener("input", (e) => {
      $("rt4ReturnSlider").value = Math.min(12, Math.max(3, Number(e.target.value) || 8));
      updateRoth401k(); saveState();
    });
    $("rt4ReturnSlider").addEventListener("input", (e) => {
      $("rt4Return").value = e.target.value;
      updateRoth401k(); saveState();
    });
    ["rt4Contrib", "rt4Years", "rt4CurTax", "rt4RetTax"].forEach((id) => bind(id, updateRoth401k));

    ["ldRetireAge", "ldFiling", "ldTradBal", "ldConvertAmt", "ldAnnualSpend", "ldGrowth"].forEach((id) => bind(id, updateLadder));

    const initialHash = (window.location.hash || "").replace("#", "");
    const startTab = urlTab || (TOOL_META[initialHash] ? initialHash : "fire");
    switchTool(startTab, false);
  }

  init();
})();
