import Chart from 'react-apexcharts';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { isMobile } from "react-device-detect";

import '../assets/styles/components/priceChart.scss';

function PriceChart({ currency, theme }) {

  const [data, setData] = useState({ data: [[]] });
  const [selection, setSelection] = useState('one_day');
  const [options, setOptions] = useState({
    xaxis: {
      type: 'datetime',
    },
    chart: {
      toolbar: {
        tools: {
          download: false,
          reset: false
        }
      },
    }
  });

  useEffect(() => {
    const date = new Date();
    const now = date.getTime();

    let yearAgo = new Date();
    yearAgo.setFullYear(date.getFullYear() - 1);
    yearAgo = yearAgo.getTime();

    let halfAnYearAgo = new Date();
    halfAnYearAgo.setMonth(date.getMonth() - 6);
    halfAnYearAgo = halfAnYearAgo.getTime();

    let monthAgo = new Date()
    monthAgo.setMonth(date.getMonth() - 1);
    monthAgo = monthAgo.getTime();

    let weekAgo = new Date()
    weekAgo.setDate(date.getDate() - 7);
    weekAgo = weekAgo.getTime();

    let dayAgo = new Date()
    dayAgo.setDate(date.getDate() - 1);
    dayAgo = dayAgo.getTime();

    const thisYearStart = new Date('1 Jan ' + date.getFullYear()).getTime();

    async function fetchData() {
      //day charts available only for eur/usd/btc
      if (currency !== 'usd' && currency !== 'eur' && selection === 'one_day') {
        setSelection('one_week');
        return;
      }

      let params = '';
      if (selection === 'all') {
        params = '?date=20130804..';
      } else if (selection === 'one_day') {
        params = '?date=' + dayAgo + '..';
      } else if (selection === 'one_week') {
        params = '?date=' + weekAgo + '..';
      } else if (selection === 'one_month') {
        params = '?date=' + monthAgo + '..';
      } else if (selection === 'six_months') {
        params = '?date=' + halfAnYearAgo + '..';
      } else if (selection === 'one_year') {
        params = '?date=' + yearAgo + '..';
      } else if (selection === 'ytd') {
        params = '?date=' + thisYearStart + '..';
      }

      const response = await axios(
        'v2/rates/history/' + currency.toLowerCase() + params,
      );

      const chartData = response.data.data;

      const textColor = theme === 'light' ? '#000000' : '#ffffff';

      const digitsAfterDot = chartData[0][1] > 10 && chartData[chartData.length - 1][1] > 10 ? 0 : chartData[0][1] > 0.5 && chartData[chartData.length - 1][1] > 0.5 ? 2 : 4;

      let newOptions = {
        xaxis: {
          type: 'datetime',
        },
        yaxis: {
          labels: {
            formatter: (val) => {
              let currencySign = '';
              const cur = currency.toLowerCase();
              const dollar = ["ars", "aud", "bsd", "bbd", "bmd", "bnd", "cad", "kyd", "clp", "cop", "xcd", "svc", "fjd", "gyd", "hkd", "lrd", "mxn", "nad", "nzd", "sgd", "sbd", "srd", "tvd", "usd"];
              const yen = ["cny", "jpy"];
              const pound = ["egp", "fkp", "gip", "ggp", "imp", "jep", "lbp", "shp", "syp", "gbp"];

              if (dollar.includes(cur)) {
                currencySign = '$';
              } else if (yen.includes(cur)) {
                currencySign = '¥';
              } else if (pound.includes(cur)) {
                currencySign = '£';
              } else if (cur === 'eur') {
                currencySign = '€';
              }

              return currencySign + val.toFixed(digitsAfterDot)
            }
          },
          tickAmount: 5,
        },
        title: {
          text: 'XRP/' + currency.toUpperCase(),
          align: 'center',
          offsetX: 20
        },
        chart: {
          type: 'area',
          animations: {
            enabled: false
          },
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
              let maindifference = chartData[chartData.length - 1][0] - chartData[0][0];
              let zoomdifference = xaxis.max - xaxis.min;
              if (zoomdifference > maindifference) {
                return {
                  xaxis: {
                    min: chartData[0][0],
                    max: chartData[chartData.length - 1][0]
                  }
                };
              }
            }
          },
          foreColor: textColor
        },
        tooltip: {
          x: {
            format: 'd MMM yyyy'
          },
          y: {
            formatter: (val) => val.toFixed(digitsAfterDot) + ' ' + currency.toUpperCase()
          },
          theme,
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth',
          width: 3
        },
        //colors: ['#006B7D'],
      };

      if (isMobile) {
        newOptions.title.offsetX = 0;
      }

      switch (selection) {
        case 'one_day':
          newOptions.xaxis = {
            min: dayAgo,
            max: now,
          };
          newOptions.tooltip.x.format = 'd MMM, H:mm';
          break;
        case 'one_week':
          newOptions.xaxis = {
            min: weekAgo,
            max: now,
          };
          newOptions.tooltip.x.format = 'd MMM, H:mm';
          break;
        case 'one_month':
          newOptions.xaxis = {
            min: monthAgo,
            max: now,
          };
          break;
        case 'six_months':
          newOptions.xaxis = {
            min: halfAnYearAgo,
            max: now,
          };
          break;
        case 'one_year':
          newOptions.xaxis = {
            min: yearAgo,
            max: now,
          };
          break;
        case 'ytd':
          newOptions.xaxis = {
            min: thisYearStart,
            max: now,
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
      setData(response.data);
    }
    fetchData();
  }, [currency, selection, theme]);

  const series = [{
    name: '',
    data: data.data,
  }];

  const showDayChart = currency === 'eur' || currency === "usd";

  return <>
    <div className="chart-toolbar">
      {showDayChart && <button onClick={() => setSelection('one_day')} className={(selection === 'one_day' ? 'active' : '')}>1D</button>}
      <button onClick={() => setSelection('one_week')} className={(selection === 'one_week' ? 'active' : '')}>1W</button>
      <button onClick={() => setSelection('one_month')} className={(selection === 'one_month' ? 'active' : '')}>1M</button>
      <button onClick={() => setSelection('six_months')} className={(selection === 'six_months' ? 'active' : '')}>6M</button>
      <button onClick={() => setSelection('one_year')} className={(selection === 'one_year' ? 'active' : '')}>1Y</button>
      <button onClick={() => setSelection('ytd')} className={(selection === 'ytd' ? 'active' : '')}>YTD</button>
      <button onClick={() => setSelection('all')} className={(selection === 'all' ? 'active' : '')}>ALL</button>
    </div>
    <Chart type="line" series={series} options={options} />
  </>;
}
export default PriceChart;