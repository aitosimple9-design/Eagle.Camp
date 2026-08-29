// chart-config.js — expose initChart và myChart lên window
// (Dùng window.* để tương thích với app.js ES6 module)

window.myChart = null;

window.initChart = function initChart() {
    const ctx = document.getElementById('incomeChart').getContext('2d');

    // Gradient fill (Emerald glassmorphism effect)
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(52, 211, 153, 0.4)'); // emerald-400
    gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['10tr', '25tr', '45tr', '70tr', '100tr'],
            datasets: [{
                label: 'Thu nhập',
                data: [0, 0, 0, 0, 0],
                borderColor: '#34d399', // emerald-400
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#0f172a', // slate-900
                pointBorderColor: '#34d399',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            // Disable animations for absolute zero-latency updates when sliding
            animation: {
                duration: 0
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return typeof window.formatCurrencyPhone === 'function'
                                ? window.formatCurrencyPhone(context.raw) + ' ₫'
                                : context.raw + 'M';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.02)', borderDash: [4, 4] },
                    ticks: { color: 'rgba(226, 232, 240, 0.6)', callback: (val) => val + 'M' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(226, 232, 240, 0.6)' }
                }
            }
        }
    });
};
