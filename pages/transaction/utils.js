import moment from "moment";

const formatDateTime = (date) => {
  return moment(date).utc().format("YYYY-MM-DD HH:mm:ss");
};

export { formatDateTime };
