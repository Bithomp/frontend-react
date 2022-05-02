import Chart from 'react-apexcharts';
import axios from 'axios';
import { useState, useEffect } from 'react';

function PriceChart({ currency }) {

  const [data, setData] = useState({ timestamps: [], prices: [] });

  useEffect(() => {
    async function fetchData() {
      const response = await axios(
        'v2/rates/history/' + currency.toLowerCase(),
      );
      setData(response.data);
    }
    fetchData();
  }, [currency]);

  const series = [
    {
      name: '',
      data: data.prices
    }
  ];
  const options = {
    xaxis: {
      type: 'datetime',
      categories: data.timestamps
    },
    yaxis: {
      labels: {
        formatter: function (val) {
          return val.toFixed(2);
        },
      },
      title: {
        text: 'Price'
      },
    },
    title: {
      text: 'XRP/' + currency.toUpperCase() + ' price chart',
      align: 'left'
    },
    chart: {
      type: 'area',
      stacked: false,
      zoom: {
        type: 'x',
        enabled: true,
        autoScaleYaxis: true
      },
      toolbar: {
        autoSelected: 'zoom'
      }
    },
    tooltip: {
      shared: false,
      y: {
        formatter: function (val) {
          return val.toFixed(4) + ' ' + currency;
        }
      }
    },
    dataLabels: {
      enabled: false
    },
    markers: {
      size: 0,
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
  };
  return <Chart type="line" series={series} options={options} />;
}
export default PriceChart;