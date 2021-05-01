const users = [
  {
    name: "admin",
    pass: "admin",
    role: "admin",
  },
];

const authRquiredApis = ["/testdata"];

const isAuthorizedUser = (user) => {
  const currentUser = users.filter((obj) => obj.name === user.name && user.pass === obj.pass)[0];
  return !!currentUser;
};
module.exports = { isAuthorizedUser, authRquiredApis };
