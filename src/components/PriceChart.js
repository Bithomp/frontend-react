import Chart from 'react-apexcharts';
import axios from 'axios';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import '../assets/styles/components/priceChart.scss';

export default function PriceChart({ currency, theme, chartPeriod, setChartPeriod }) {
  const { i18n } = useTranslation();

  const [data, setData] = useState({ data: [[]] });

  const supportedLanguages = ["en", "ru"];
  let chartLang = "en";
  if (supportedLanguages.includes(i18n.language)) {
    chartLang = i18n.language;
  }

  const [options, setOptions] = useState({
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        datetimeFormatter: {
          day: 'd MMM'
        }
      },
    },
    chart: {
      id: "currency-chart",
      defaultLocale: chartLang,
      locales: [
        {
          name: 'en',
          options: {
            shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            toolbar: {
              selectionZoom: 'Selection Zoom',
              zoomIn: 'Zoom In',
              zoomOut: 'Zoom Out',
              pan: 'Panning'
            }
          }
        },
        {
          name: 'ru',
          options: {
            shortMonths: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
            toolbar: {
              selectionZoom: 'Увеличение выбора',
              zoomIn: 'Приблизить',
              zoomOut: 'Уменьшить',
              pan: 'Панорамирование'
            }
          }
        }
      ],
      toolbar: {
        tools: {
          download: false,
          reset: false
        }
      },
    }
  });

  const detailedDayAndWeekChartAvailable = currency === 'eur' || currency === "usd";

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
      //day charts available only for eur/usd
      if (!detailedDayAndWeekChartAvailable && chartPeriod === 'one_day') {
        setChartPeriod('one_week');
        return;
      }

      const day = 86400000;
      const hour = 3600000;

      let params = '';
      if (chartPeriod === 'all') {
        params = '?date=20130804..';
      } else if (chartPeriod === 'one_day') {
        params = '?date=' + (dayAgo - hour) + '..';
      } else if (chartPeriod === 'one_week') {
        params = '?date=' + (weekAgo - day) + '..';
      } else if (chartPeriod === 'one_month') {
        params = '?date=' + (monthAgo - day) + '..';
      } else if (chartPeriod === 'six_months') {
        params = '?date=' + (halfAnYearAgo - day) + '..';
      } else if (chartPeriod === 'one_year') {
        params = '?date=' + (yearAgo - day) + '..';
      } else if (chartPeriod === 'ytd') {
        params = '?date=' + thisYearStart + '..';
      }

      const response = await axios(
        'v2/rates/history/' + currency.toLowerCase() + params,
      );

      const chartData = response.data.data;

      const textColor = theme === 'light' ? '#000000' : '#ffffff';

      const digitsAfterDot = chartData[0][1] > 100 && chartData[chartData.length - 1][1] > 100 ? 0 : chartData[0][1] > 1 && chartData[chartData.length - 1][1] > 1 ? 2 : 4;

      let newOptions = {
        xaxis: {
          type: 'datetime',
          labels: {
            datetimeUTC: false,
            datetimeFormatter: {
              day: 'd MMM'
            }
          }
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
          align: 'center'
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

      switch (chartPeriod) {
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
          if (detailedDayAndWeekChartAvailable) {
            newOptions.tooltip.x.format = 'd MMM, H:mm';
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, chartPeriod, theme, detailedDayAndWeekChartAvailable]);

  const series = [{
    name: '',
    data: data.data,
  }];

  return <>
    <div className="chart-toolbar">
      {detailedDayAndWeekChartAvailable && <button onClick={() => setChartPeriod('one_day')} className={(chartPeriod === 'one_day' ? 'active' : '')}>1D</button>}
      <button onClick={() => setChartPeriod('one_week')} className={(chartPeriod === 'one_week' ? 'active' : '')}>1W</button>
      <button onClick={() => setChartPeriod('one_month')} className={(chartPeriod === 'one_month' ? 'active' : '')}>1M</button>
      <button onClick={() => setChartPeriod('six_months')} className={(chartPeriod === 'six_months' ? 'active' : '')}>6M</button>
      <button onClick={() => setChartPeriod('one_year')} className={(chartPeriod === 'one_year' ? 'active' : '')}>1Y</button>
      <button onClick={() => setChartPeriod('ytd')} className={(chartPeriod === 'ytd' ? 'active' : '')}>YTD</button>
      <button onClick={() => setChartPeriod('all')} className={(chartPeriod === 'all' ? 'active' : '')}>ALL</button>
    </div>
    <Chart type="line" series={series} options={options} />
  </>;
};