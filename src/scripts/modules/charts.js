import ApexCharts from 'apexcharts'

// START: ChartsManager - Parent OOP coordinator for all ApexCharts instances on the dashboard
export class ChartsManager {
  constructor() {
    this.salesChartInstance = null
    this.expensesChartInstance = null
    this.salesChart = new this.SalesChart(this)
    this.expensesChart = new this.ExpensesChart(this)
  }

  // START: ChartsManager.init - Bootstraps all dashboard chart instances
  init(animations = null) {
    if (animations) {
      this.animations = animations
    }
    this.salesChart.render()
    this.expensesChart.render()
  }
  // END: ChartsManager.init - All charts rendered

  // START: ChartsManager.showSkeleton - Displays loading skeleton placeholders for charts
  showSkeleton() {
    const salesSkel = document.getElementById('sales-chart-skeleton')
    const salesContent = document.getElementById('sales-chart-content')
    if (salesSkel) salesSkel.classList.remove('hidden')
    if (salesContent) salesContent.classList.add('hidden')

    const statusSkel = document.getElementById('status-chart-skeleton')
    const statusContent = document.getElementById('status-chart-content')
    if (statusSkel) statusSkel.classList.remove('hidden')
    if (statusContent) statusContent.classList.add('hidden')
  }
  // END: ChartsManager.showSkeleton - Skeleton visible

  // START: ChartsManager.hideSkeleton - Smoothly reveals chart canvas and hides skeletons
  hideSkeleton() {
    const salesSkel = document.getElementById('sales-chart-skeleton')
    const salesContent = document.getElementById('sales-chart-content')
    if (salesSkel) salesSkel.classList.add('hidden')
    if (salesContent) salesContent.classList.remove('hidden')

    const statusSkel = document.getElementById('status-chart-skeleton')
    const statusContent = document.getElementById('status-chart-content')
    if (statusSkel) statusSkel.classList.add('hidden')
    if (statusContent) statusContent.classList.remove('hidden')
  }
  // END: ChartsManager.hideSkeleton - Chart canvas revealed

  // START: ChartsManager.setDateFilter - Re-renders or updates series data with skeleton loading feedback
  setDateFilter(monthIndex, year) {
    this.showSkeleton()

    setTimeout(() => {
      this.hideSkeleton()
    }, 350)
  }
  // END: ChartsManager.setDateFilter - Chart data refreshed for date

  // START: ChartsManager.updateSalesBreakdown - Aggregates 12-month annual gross habwa & expenses from Supabase
  updateSalesBreakdown(habwaRecords = [], billsRecords = [], year = 2026) {
    if (!this.salesChartInstance) return

    const isClient = (sessionStorage.getItem('jn_session_role') && sessionStorage.getItem('jn_session_role') !== '0') || window.location.pathname.includes('/users/')
    const clientName = sessionStorage.getItem('jn_session_user') || 'Owner'
    const currentUid = sessionStorage.getItem('jn_session_uid')

    const monthlyGross = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const monthlyExpenses = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

    // 1. Ingest gross habwa by month (0-11)
    habwaRecords.forEach((h) => {
      if (!h.harvested_at) return
      const d = new Date(h.harvested_at)
      if (d.getFullYear() === year) {
        const month = d.getMonth()
        monthlyGross[month] += Number(h.amount || 0)
      }
    })

    // 2. Ingest operational expenses & deductions by month (0-11)
    billsRecords.forEach((b) => {
      if (!b.bill_date) return
      const d = new Date(b.bill_date)
      if (d.getFullYear() === year) {
        const month = d.getMonth()
        if (isClient && currentUid) {
          const breakdown = Array.isArray(b.detailed_breakdown) ? b.detailed_breakdown : []
          const userShare = breakdown.find((item) => item.owner_id === currentUid)
          if (userShare && userShare.shareAmount) {
            monthlyExpenses[month] += Number(userShare.shareAmount || 0)
          } else if (b.owner_ids && b.owner_ids.includes(currentUid)) {
            monthlyExpenses[month] += Number(b.total_amount || 0) / b.owner_ids.length
          }
        } else {
          monthlyExpenses[month] += Number(b.total_amount || 0)
        }
      }
    })

    // Calculate maximum amount to dynamically adjust Y-axis scale if revenue exceeds 16k
    const maxVal = Math.max(...monthlyGross, ...monthlyExpenses, 0)
    const yMax = maxVal > 14000 ? Math.ceil((maxVal * 1.2) / 1000) * 1000 : 16000

    this.salesChartInstance.updateOptions({
      yaxis: {
        min: 0,
        max: yMax,
        tickAmount: 4,
        labels: {
          formatter: (val) => `₱${(val / 1000).toFixed(0)}k`,
          style: { colors: '#64748b', fontSize: '11px', fontWeight: 500 },
        },
      },
    })

    this.salesChartInstance.updateSeries([
      {
        name: isClient ? `${clientName} Habwa (Income)` : 'Gross Habwa (Income)',
        data: monthlyGross,
      },
      {
        name: isClient ? 'Personal Deductions' : 'Total Expenses (Deductions)',
        data: monthlyExpenses,
      },
    ])
  }

  updateExpensesBreakdown(billsList = [], grossRevenue = 0, totalDeductions = 0) {
    if (!this.expensesChartInstance) return

    let electricity = 0
    let internet = 0
    let maintenance = 0
    let other = 0

    billsList.forEach((b) => {
      const cat = (b.category || '').toUpperCase()
      const amt = Number(b.total_amount || 0)
      if (cat.includes('ELEC') || cat.includes('VECO') || cat.includes('POWER')) {
        electricity += amt
      } else if (cat.includes('PLDT') || cat.includes('CONVERGE') || cat.includes('INTERNET') || cat.includes('FIBER')) {
        internet += amt
      } else if (cat.includes('CHUTE') || cat.includes('REPAIR') || cat.includes('HARDWARE') || cat.includes('SWITCH')) {
        maintenance += amt
      } else {
        other += amt
      }
    })

    const totalBills = electricity + internet + maintenance + other
    const series = totalBills > 0
      ? [
          Number(((electricity / totalBills) * 100).toFixed(1)),
          Number(((other / totalBills) * 100).toFixed(1)),
          Number(((internet / totalBills) * 100).toFixed(1)),
          Number(((maintenance / totalBills) * 100).toFixed(1))
        ]
      : [0, 0, 0, 0]

    const labels = [
      `Electricity (${series[0]}%)`,
      `Other / Misc (${series[1]}%)`,
      `PLDT Internet (${series[2]}%)`,
      `PC Hardware / Maint (${series[3]}%)`
    ]

    this.expensesChartInstance.customTotalDeductions = totalDeductions
    this.expensesChartInstance.customGrossRevenue = grossRevenue
    this.expensesChartInstance.customCategoryAmounts = [electricity, other, internet, maintenance]

    this.expensesChartInstance.updateOptions({ labels })
    this.expensesChartInstance.updateSeries(series)
  }

  // START: ChartsManager.refreshWithSkeleton - Triggers dynamic skeleton reload for charts
  refreshWithSkeleton(monthIndex = 9, year = 2026) {
    this.setDateFilter(monthIndex, year)
  }
  // END: ChartsManager.refreshWithSkeleton - Dynamic reload triggered

  // START: SalesChart - Subchild class rendering 12-month annual revenue & coin drop trends in ₱ (PHP)
  SalesChart = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: SalesChart.render - Configures and mounts the professional monthly ApexCharts area graph with Tailwind custom tooltip
    render() {
      const container = document.getElementById('sales-chart-slot')
      if (!container) return

      // Determine role from session: role !== '0' means Client/Unit Owner
      const isClient = (sessionStorage.getItem('jn_session_role') && sessionStorage.getItem('jn_session_role') !== '0') || window.location.pathname.includes('/users/')
      const clientName = sessionStorage.getItem('jn_session_user') || 'Owner'

      // Zero initialized series ready for live Supabase sync
      const grossData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      const expenseData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

      const options = {
        series: [
          {
            name: isClient ? `${clientName} Habwa (Income)` : 'Gross Habwa (Income)',
            data: grossData,
          },
          {
            name: isClient ? 'Personal Deductions' : 'Total Expenses (Deductions)',
            data: expenseData,
          },
        ],
        chart: {
          height: 310,
          type: 'area', // Continuous wave area graph with glowing gradient
          fontFamily: 'Poppins, Averta, sans-serif',
          toolbar: {
            show: false,
          },
          dropShadow: {
            enabled: true,
            top: 6,
            left: 0,
            blur: 8,
            color: '#6366f1',
            opacity: 0.28,
          },
        },
        colors: ['#6366f1', '#f43f5e'], // Series 0: Indigo/violet (Habwa Income), Series 1: Rose/coral (Deductions)
        fill: {
          type: 'gradient',
          gradient: {
            type: 'vertical',
            shadeIntensity: 1,
            opacityFrom: 0.45,
            opacityTo: 0.05,
            stops: [0, 85, 100],
            colorStops: [
              [
                { offset: 0, color: '#6366f1', opacity: 0.38 },
                { offset: 60, color: '#8b5cf6', opacity: 0.18 },
                { offset: 100, color: '#3b82f6', opacity: 0.0 },
              ],
              [
                { offset: 0, color: '#f43f5e', opacity: 0.32 },
                { offset: 60, color: '#fb7185', opacity: 0.14 },
                { offset: 100, color: '#f43f5e', opacity: 0.0 },
              ]
            ]
          },
        },
        dataLabels: { enabled: false },
        stroke: {
          curve: 'smooth',
          width: [3.5, 2.5],
          dashArray: [0, 4], // Habwa solid, Deductions dashed for crystal clear distinction
        },
        xaxis: {
          categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          labels: { 
            style: { 
              colors: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8', '#6366f1', '#94a3b8', '#94a3b8'], 
              fontSize: '11px', 
              fontWeight: 600 
            } 
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
          crosshairs: {
            show: true,
            width: 18,
            fill: {
              type: 'solid',
              color: '#6366f1',
              opacity: 0.08,
            },
            stroke: { show: false },
          },
        },
        yaxis: {
          min: 0,
          max: 16000,
          tickAmount: 4,
          labels: {
            formatter: (val) => `₱${(val / 1000).toFixed(0)}k`,
            style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 },
          },
          crosshairs: {
            show: false,
          },
        },
        grid: {
          borderColor: '#e2e8f0',
          strokeDashArray: 3,
          yaxis: { lines: { show: true } },
          xaxis: { lines: { show: false } },
          padding: { top: 0, right: 10, bottom: 0, left: 10 },
        },
        markers: {
          size: [3, 3],
          colors: ['#6366f1', '#f43f5e'],
          strokeColors: '#ffffff',
          strokeWidth: 2,
          hover: { size: 6.5 },
        },
        legend: {
          show: true,
          position: 'top',
          horizontalAlign: 'right',
          fontSize: '11px',
          fontWeight: 600,
          labels: { colors: '#64748b' },
          markers: { radius: 12 },
        },
        tooltip: {
          custom: function ({ series, seriesIndex, dataPointIndex, w }) {
            const month = w.globals.categoryLabels[dataPointIndex] || w.globals.labels[dataPointIndex]
            const grossVal = series[0][dataPointIndex]
            const expenseVal = series[1][dataPointIndex]

            if (grossVal === null || grossVal === undefined) {
              return `
                <div class="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs font-poppins min-w-[170px]">
                  <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-700/60">
                    <span class="font-extrabold text-white text-xs font-averta">${month} 2026</span>
                    <span class="text-[10px] font-semibold text-slate-400">No Data</span>
                  </div>
                  <p class="text-[11px] text-slate-400">No habwa collection recorded for this month.</p>
                </div>
              `
            }

            const netProfit = grossVal - expenseVal
            const formattedGross = `₱${grossVal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            const formattedExpense = `-₱${expenseVal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            const formattedNet = `${netProfit >= 0 ? '₱' : '-₱'}${Math.abs(netProfit).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

            setTimeout(() => {
              const tooltipEl = document.querySelector('.apexcharts-tooltip')
              const counter = this.parent.animations?.counter || window.animationsManager?.counter
              if (tooltipEl && counter) {
                counter.init(tooltipEl)
              }
            }, 60)

            const isClientUser = (sessionStorage.getItem('jn_session_role') && sessionStorage.getItem('jn_session_role') !== '0') || window.location.pathname.includes('/users/')
            const currentClientName = sessionStorage.getItem('jn_session_user') || 'My Unit'

            return `
              <div class="bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl min-w-[220px] text-xs font-poppins">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
                  <span class="font-extrabold text-white text-xs font-averta tracking-wide">${month} 2026</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${netProfit >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400 border border-rose-500/40'}">
                    ${netProfit >= 0 ? (isClientUser ? '+ NET PAYOUT' : '+ PROFIT') : '- LOSS'}
                  </span>
                </div>
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span class="text-slate-300 text-[11px]">${isClientUser ? `${currentClientName} Habwa:` : 'Gross Habwa:'}</span>
                    </div>
                    <span class="font-extrabold text-white text-[11px] font-money" data-count-money="${grossVal}" data-prefix="₱" data-decimals="2" data-duration="600" data-delay="50">${formattedGross}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span class="text-slate-300 text-[11px]">${isClientUser ? 'Unit Deductions:' : 'Total Deductions:'}</span>
                    </div>
                    <span class="font-extrabold text-rose-400 text-[11px] font-money" data-count-money="${expenseVal}" data-prefix="-₱" data-decimals="2" data-duration="600" data-delay="100">${formattedExpense}</span>
                  </div>
                  <div class="pt-1.5 border-t border-slate-800 flex items-center justify-between">
                    <span class="text-slate-400 text-[10px] font-bold uppercase">${isClientUser ? 'Net Takeaway:' : 'Net Remaining:'}</span>
                    <span class="font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'} text-xs font-money" data-count-money="${Math.abs(netProfit)}" data-prefix="${netProfit >= 0 ? '₱' : '-₱'}" data-decimals="2" data-duration="700" data-delay="150">
                      ${formattedNet}
                    </span>
                  </div>
                </div>
              </div>
            `
          }.bind(this),
        },
      }

      this.parent.salesChartInstance = new ApexCharts(container, options)
      this.parent.salesChartInstance.render()
    }
    // END: SalesChart.render - Double line chart mounted
  }
  // END: SalesChart - Subchild ready

  // START: ExpensesChart - Subchild class rendering donut chart for October deductions (Total: ₱11,067)
  ExpensesChart = class {
    constructor(parent) {
      this.parent = parent
    }

    // START: ExpensesChart.render - Configures and mounts the ApexCharts expense distribution donut
    render() {
      const container = document.getElementById('status-chart-slot')
      if (!container) return

      // Zero-initialized series ready for live Supabase deduction breakdown
      const options = {
        series: [0, 0, 0, 0],
        labels: [
          'Electricity (0%)',
          'Other / Misc (0%)',
          'PLDT Internet (0%)',
          'PC-4 Return to Owner (0%)',
        ],
        chart: {
          height: 300,
          type: 'donut',
          fontFamily: 'Poppins, Averta, sans-serif',
        },
        colors: ['#2563eb', '#f59e0b', '#0d9488', '#8b5cf6'],
        plotOptions: {
          pie: {
            donut: {
              size: '56%', // Thick, substantial donut ring instead of thin border
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'Averta, Poppins, sans-serif',
                  color: '#64748b',
                  offsetY: -10,
                },
                value: {
                  show: true,
                  fontSize: '22px',
                  fontWeight: 800,
                  fontFamily: 'Space Grotesk, JetBrains Mono, monospace',
                  color: '#0f172a',
                  offsetY: 6,
                  formatter: (val) => `${val}%`,
                },
                total: {
                  show: true,
                  showAlways: true,
                  label: 'TOTAL DEDUCTIONS',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'Averta, sans-serif',
                  color: '#64748b',
                  formatter: function (w) {
                    const totalDeductions = w.globals.chartObject?.customTotalDeductions ?? 0
                    const grossRevenue = w.globals.chartObject?.customGrossRevenue ?? 0
                    if (grossRevenue > 0 && totalDeductions > 0) {
                      const shareOfRevenue = ((totalDeductions / grossRevenue) * 100).toFixed(1)
                      return `${shareOfRevenue}%`
                    }
                    const seriesSum = (w.globals.seriesTotals || []).reduce((a, b) => a + b, 0)
                    if (seriesSum > 0) {
                      return '100%'
                    }
                    return '0.0%'
                  },
                },
              },
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(1)}%`,
          style: {
            fontSize: '11px',
            fontFamily: 'Space Grotesk, monospace',
            fontWeight: 700,
            colors: ['#ffffff'],
          },
          dropShadow: { enabled: true, top: 1, left: 1, blur: 2, opacity: 0.6 },
        },
        legend: {
          position: 'bottom',
          fontSize: '11px',
          fontWeight: 500,
          markers: { radius: 12 },
        },
        tooltip: {
          custom: function ({ series, seriesIndex, w }) {
            const label = w.globals.labels[seriesIndex]
            const percent = series[seriesIndex] || 0
            const color = w.globals.colors[seriesIndex]
            const amounts = w.globals.chartObject?.customCategoryAmounts || [0, 0, 0, 0]
            const amount = amounts[seriesIndex] || 0

            return `
              <div class="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs font-poppins min-w-[210px]">
                <div class="flex items-center space-x-2 pb-1.5 mb-1.5 border-b border-slate-700/60">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
                  <span class="font-bold text-white text-[11px] truncate max-w-[160px]">${label}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-[11px]">Deducted Cost:</span>
                  <span class="font-extrabold text-white text-[11px] font-money">₱${amount.toLocaleString('en-PH')}</span>
                </div>
                <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>Share of Total:</span>
                  <span class="font-bold text-blue-400 font-money">${percent.toFixed(1)}%</span>
                </div>
              </div>
            `
          },
        },
      }

      this.parent.expensesChartInstance = new ApexCharts(container, options)
      this.parent.expensesChartInstance.render()
    }
    // END: ExpensesChart.render - Expense donut chart mounted
  }
  // END: ExpensesChart - Subchild ready
}
// END: ChartsManager - Charts manager ready
