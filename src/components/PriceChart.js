import Chart from 'react-apexcharts';

function PriceChart({ currency }) {
  const series = [
    {
      name: '',
      data: [0.757887, 0.74879098, 0.769877, 0.723345]
    }
  ];
  const options = {
    xaxis: {
      type: 'datetime',
      categories: ["2022-04-19", "2022-04-20", "2022-04-21", "2022-04-22"]
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
    }
  };
  return <Chart type="line" series={series} options={options} />;
}
export default PriceChart;