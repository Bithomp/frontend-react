import Chart from 'react-apexcharts';
import axios from 'axios';
import { useState, useEffect } from 'react';

import '../assets/styles/components/priceChart.scss';

function PriceChart({ currency }) {

  const [data, setData] = useState({ data: [[]] });
  const [selection, setSelection] = useState('ytd');
  const [options, setOptions] = useState({
    xaxis: {
      type: 'datetime',
    },
  });

  useEffect(() => {
    async function fetchData() {
      const response = await axios(
        'v2/rates/history/' + currency.toLowerCase(),
      );
      setOptions({
        xaxis: {
          type: 'datetime',
        },
        yaxis: {
          labels: {
            formatter: (val) => val.toFixed(2),
          },
          title: {
            text: 'Price'
          },
          tickAmount: 5,
        },
        title: {
          text: 'XRP/' + currency.toUpperCase(),
          align: 'center'
        },
        chart: {
          type: 'area',
          zoom: {
            autoScaleYaxis: true
          },
          toolbar: {
            autoSelected: 'zoom',
            tools: {
              download: false,
              reset: false
            }
          },
          events: {
            beforeZoom: (e, { xaxis }) => {
              // dont zoom out any further
              let maindifference = response.data.data[response.data.data.length - 1][0] - response.data.data[0][0];
              let zoomdifference = xaxis.max - xaxis.min;
              if (zoomdifference > maindifference) {
                return {
                  xaxis: {
                    min: response.data.data[0][0],
                    max: response.data.data[response.data.data.length - 1][0]
                  }
                };
              }
            }
          }
        },
        tooltip: {
          x: {
            format: 'dd MMM yyyy'
          },
          y: {
            formatter: (val) => val.toFixed(2) + ' ' + currency.toUpperCase()
          }
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth',
          width: 3
        },
        //colors: ['#006B7D'],
      });
      setData(response.data);
    }
    fetchData();
  }, [currency]);

  const series = [{
    name: '',
    data: data.data,
  }];

  const updateData = timeline => {
    setSelection(timeline);

    let newOptions = { ...options };

    const now = new Date();

    let yearAgo = new Date();
    yearAgo.setFullYear(now.getFullYear() - 1);

    let monthAgo = new Date();
    monthAgo.setMonth(now.getMonth() - 1);

    let halfAnYearAgo = new Date();
    halfAnYearAgo.setMonth(now.getMonth() - 6);

    switch (timeline) {
      case 'one_month':
        newOptions.xaxis = {
          min: monthAgo.getTime(),
          max: now.getTime(),
        };
        break;
      case 'six_months':
        newOptions.xaxis = {
          min: halfAnYearAgo.getTime(),
          max: now.getTime(),
        };
        break;
      case 'one_year':
        newOptions.xaxis = {
          min: yearAgo.getTime(),
          max: now.getTime(),
        };
        break;
      case 'ytd':
        newOptions.xaxis = {
          min: new Date('1 Jan ' + now.getFullYear()).getTime(),
          max: now.getTime(),
        };
        break;
      case 'all':
        newOptions.xaxis = {
          min: undefined,
          max: undefined,
        };
        break;
      default:
        break;
    };
    setOptions(newOptions);
  }

  return <>
    <div className="chart-toolbar">
      <button onClick={() => updateData('one_month')} className={(selection === 'one_month' ? 'active' : '')}>1M</button>
      <button onClick={() => updateData('six_months')} className={(selection === 'six_months' ? 'active' : '')}>6M</button>
      <button onClick={() => updateData('one_year')} className={(selection === 'one_year' ? 'active' : '')}>1Y</button>
      <button onClick={() => updateData('ytd')} className={(selection === 'ytd' ? 'active' : '')}>YTD</button>
      <button onClick={() => updateData('all')} className={(selection === 'all' ? 'active' : '')}>ALL</button>
    </div>
    <Chart type="line" series={series} options={options} />
  </>;
}
export default PriceChart;