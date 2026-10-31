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
      // If month is October (monthIndex === 9) and year is 2026, show authentic telemetry data
      const isOct2026 = monthIndex === 9 && year === 2026

      if (this.salesChartInstance) {
        if (isOct2026) {
          this.salesChartInstance.updateSeries([
            { name: 'Gross Habwa (Income)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 12042, 0, 0] },
            { name: 'Total Expenses (Deductions)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 11067, 0, 0] },
          ])
        } else {
          // All totally zero when it's not October 2026
          this.salesChartInstance.updateSeries([
            { name: 'Gross Habwa (Income)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
            { name: 'Total Expenses (Deductions)', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
          ])
        }
      }

      if (this.expensesChartInstance) {
        if (isOct2026) {
          this.expensesChartInstance.updateSeries([47.3, 27.1, 16.3, 9.2])
        } else {
          // Zero/empty distribution for dates with no mock logs
          this.expensesChartInstance.updateSeries([0, 0, 0, 0])
        }
      }

      this.hideSkeleton()
    }, 450)
  }
  // END: ChartsManager.setDateFilter - Chart data refreshed for date

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

      // Continuous line starting at 0 from Jan-Sep, spiking to October actuals, and going back down to 0 for Nov-Dec
      const options = {
        series: [
          {
            name: 'Gross Habwa (Income)',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 12042, 0, 0],
          },
          {
            name: 'Total Expenses (Deductions)',
            data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 11067, 0, 0],
          },
        ],
        chart: {
          height: 310,
          type: 'area', // Continuous area graph with modern gradient glow
          fontFamily: 'Poppins, Averta, sans-serif',
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: false,
              zoom: false,
              zoomin: false,
              zoomout: false,
              pan: false,
              reset: false,
            },
          },
        },
        colors: ['#2563eb', '#e11d48'],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.35,
            opacityTo: 0.02,
            stops: [0, 85, 100],
          },
        },
        dataLabels: { enabled: false },
        stroke: {
          curve: 'smooth',
          width: [3, 2.5],
          dashArray: [0, 4],
        },
        xaxis: {
          categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          labels: { style: { colors: '#64748b', fontSize: '11px', fontWeight: 500 } },
          axisBorder: { show: false },
          axisTicks: { show: false },
          crosshairs: {
            show: true,
            width: 1,
            stroke: { color: '#3b82f6', width: 1, dashArray: 3 },
          },
        },
        yaxis: {
          min: 0,
          max: 16000,
          tickAmount: 4,
          labels: {
            formatter: (val) => `₱${(val / 1000).toFixed(0)}k`,
            style: { colors: '#64748b', fontSize: '11px', fontWeight: 500 },
          },
          crosshairs: {
            show: true,
            stroke: { color: '#94a3b8', width: 1, dashArray: 3 },
          },
        },
        grid: {
          borderColor: '#e2e8f0',
          strokeDashArray: 4,
          yaxis: { lines: { show: true } },
          xaxis: { lines: { show: true } },
        },
        markers: {
          size: [4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 4, 4],
          colors: ['#2563eb', '#e11d48'],
          strokeColors: '#ffffff',
          strokeWidth: 2,
          hover: { size: 8 },
        },
        legend: {
          position: 'top',
          horizontalAlign: 'right',
          fontSize: '11px',
          fontWeight: 600,
          labels: { colors: '#475569' },
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

            return `
              <div class="bg-slate-900 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl min-w-[220px] text-xs font-poppins">
                <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
                  <span class="font-extrabold text-white text-xs font-averta tracking-wide">${month} 2026</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${netProfit >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400 border border-rose-500/40'}">
                    ${netProfit >= 0 ? '+ PROFIT' : '- LOSS'}
                  </span>
                </div>
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span class="text-slate-300 text-[11px]">Gross Habwa:</span>
                    </div>
                    <span class="font-extrabold text-white text-[11px] font-money" data-count-money="${grossVal}" data-prefix="₱" data-decimals="2" data-duration="600" data-delay="50">${formattedGross}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span class="text-slate-300 text-[11px]">Total Deductions:</span>
                    </div>
                    <span class="font-extrabold text-rose-400 text-[11px] font-money" data-count-money="${expenseVal}" data-prefix="-₱" data-decimals="2" data-duration="600" data-delay="100">${formattedExpense}</span>
                  </div>
                  <div class="pt-1.5 border-t border-slate-800 flex items-center justify-between">
                    <span class="text-slate-400 text-[10px] font-bold uppercase">Net Remaining:</span>
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

      // Total Deductions = 5,240 + 3,000 + 1,806 + 1,021 = ₱11,067
      // Percentages: Electricity 47.3%, Misc 27.1%, PLDT 16.3%, PC4 Return 9.2%
      const options = {
        series: [47.3, 27.1, 16.3, 9.2],
        labels: [
          'Electricity (47.3%)',
          'Other / Misc (27.1%)',
          'PLDT Internet (16.3%)',
          'PC-4 Return to Owner (9.2%)',
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
                    // Actual dynamic overall percentage: 100% of expense breakdown (or 91.9% of gross habwa)
                    const totalDeductions = 11067
                    const grossRevenue = 12042
                    const shareOfRevenue = ((totalDeductions / grossRevenue) * 100).toFixed(1)
                    return `${shareOfRevenue}%`
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
            const percent = series[seriesIndex]
            const color = w.globals.colors[seriesIndex]
            const amounts = [5240, 3000, 1806, 1021]
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
                  <span class="font-bold text-blue-400 font-money">${percent}%</span>
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
