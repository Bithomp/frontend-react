import React, { useState, useEffect } from 'react';
import { Chart } from 'primereact/chart';
import { useTheme } from './Layout/ThemeContext';

export default function LineDemo({ data, names = [] }) {
    const [chartData, setChartData] = useState({});
    const [chartOptions, setChartOptions] = useState({});
    const { theme } = useTheme();

    useEffect(() => {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
        const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

        if (!Array.isArray(data) || !data[0] || !data[1]) {
            console.error('Data must be an array with two datasets');
            return;
        }

        const timestamps = data[0].map(point => new Date(point[0]));
        
        const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
        const oneDay = 24 * 60 * 60 * 1000;
        const oneMonth = oneDay * 30;

        let dateFormatter;
        if (timeRange <= oneDay) {
            dateFormatter = date => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (timeRange <= oneMonth) {
            dateFormatter = date => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else {
            dateFormatter = date => date.toLocaleDateString([], { month: 'short', year: 'numeric' });
        }

        const chartData = {
            labels: timestamps.map(dateFormatter),
            datasets: [
                {
                    label: names[0] || 'Sales',
                    data: data[0].map(point => point[1]),
                    fill: false,
                    borderColor: '#008FFB',
                    backgroundColor: '#008FFB',
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: names[1] || 'Volumes',
                    data: data[1].map(point => point[1]),
                    fill: false,
                    borderColor: '#00E396',
                    backgroundColor: '#00E396',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        };

        const options = {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    titleColor: textColor,
                    bodyColor: textColor,
                    backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
                    borderColor: surfaceBorder,
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: textColorSecondary,
                        callback: value => value.toLocaleString()
                    },
                    grid: {
                        color: surfaceBorder
                    },
                    title: {
                        display: true,
                        text: names[0] || 'Sales',
                        color: '#008FFB'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: {
                        color: textColorSecondary,
                        callback: value => value.toLocaleString()
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    title: {
                        display: true,
                        text: names[1] || 'Volumes',
                        color: '#00E396'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        };

        setChartData(chartData);
        setChartOptions(options);
    }, [data, names, theme]);

    return (
        <div className="card">
            <Chart type="line" data={chartData} options={chartOptions} height="350px" />
        </div>
    );
}