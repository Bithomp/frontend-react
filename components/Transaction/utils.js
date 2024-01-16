import moment from "moment";

const formatDateTime = (date) => {
  return moment(date).format("YYYY-MM-DD HH:mm:ss");
};

export { formatDateTime };
